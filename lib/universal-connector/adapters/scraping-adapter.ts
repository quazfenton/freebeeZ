// Web Scraping Adapter for Universal Connector
import axios from 'axios'
import * as cheerio from 'cheerio'
import {
  ConnectionAdapter,
  ConnectionMethodType,
  ConnectionConfig,
  ConnectionCredentials,
  ServiceConnection,
  ConnectionResult,
  ConnectionUsage,
  ConnectorCapabilities,
  ScrapingConfig,
  SelectorConfig,
} from '../types'

export interface ScrapingResult {
  url: string
  data: Record<string, any>
  html?: string
  links: string[]
  images: string[]
  meta: Record<string, string>
  timestamp: Date
}

export class ScrapingAdapter implements ConnectionAdapter {
  type = ConnectionMethodType.SCRAPING
  private sessions: Map<string, { config: ConnectionConfig; usage: ConnectionUsage }> = new Map()

  async connect(config: ConnectionConfig): Promise<ServiceConnection> {
    const connectionId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.sessions.set(connectionId, {
      config,
      usage: this.createEmptyUsage(),
    })

    const connection: ServiceConnection = {
      id: connectionId,
      serviceId: config.endpoint || 'scraper',
      method: ConnectionMethodType.SCRAPING,
      status: 'connected',
      config,
      credentials: config.credentials,
      capabilities: this.getCapabilities(),
      usage: this.sessions.get(connectionId)!.usage,
      healthCheck: () => this.healthCheck({ id: connectionId } as ServiceConnection),
      createdAt: new Date(),
    }

    return connection
  }

  async disconnect(connectionId: string): Promise<boolean> {
    this.sessions.delete(connectionId)
    return true
  }

  async execute<T>(
    connection: ServiceConnection,
    action: string,
    params: Record<string, any>
  ): Promise<ConnectionResult<T>> {
    const startTime = Date.now()
    const session = this.sessions.get(connection.id)

    if (!session) {
      return {
        success: false,
        error: 'Session not found',
        duration: 0,
        retryCount: 0,
        method: this.type,
      }
    }

    try {
      session.usage.totalRequests++

      let result: ScrapingResult

      switch (action) {
        case 'scrape':
          result = await this.scrapeUrl(params as ScrapingConfig, connection.config)
          break
        case 'extractLinks':
          result = await this.extractLinks(params.url, connection.config)
          break
        case 'extractData':
          result = await this.extractWithSelectors(
            params.url,
            params.selectors as SelectorConfig[],
            connection.config
          )
          break
        case 'parseMarkdown':
          result = await this.parseMarkdownLinks(params.url, connection.config)
          break
        default:
          throw new Error(`Unknown action: ${action}`)
      }

      const duration = Date.now() - startTime
      session.usage.successfulRequests++
      session.usage.averageResponseTime =
        (session.usage.averageResponseTime * (session.usage.successfulRequests - 1) + duration) /
        session.usage.successfulRequests
      session.usage.lastRequestTime = new Date()

      return {
        success: true,
        data: result as T,
        duration,
        retryCount: 0,
        method: this.type,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      session.usage.failedRequests++

      if (error.response?.status === 429) {
        session.usage.rateLimitHits++
      }

      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        duration,
        retryCount: 0,
        method: this.type,
      }
    }
  }

  async healthCheck(connection: ServiceConnection): Promise<boolean> {
    return this.sessions.has(connection.id)
  }

  async scrapeUrl(config: ScrapingConfig, connectionConfig: ConnectionConfig): Promise<ScrapingResult> {
    const response = await this.fetchPage(config.url, connectionConfig)
    const $ = cheerio.load(response.data)

    const data: Record<string, any> = {}

    for (const selector of config.selectors) {
      const elements = $(selector.selector)

      if (selector.multiple) {
        const values: any[] = []
        elements.each((_, el) => {
          let value = selector.attribute ? $(el).attr(selector.attribute) : $(el).text().trim()
          if (value && selector.transform) {
            value = selector.transform(value)
          }
          if (value) values.push(value)
        })
        data[selector.name] = values
      } else {
        const el = elements.first()
        let value = selector.attribute ? el.attr(selector.attribute) : el.text().trim()
        if (value && selector.transform) {
          value = selector.transform(value)
        }
        data[selector.name] = value || (selector.required ? null : undefined)
      }
    }

    const links = this.extractAllLinks($, config.url)
    const images = this.extractAllImages($, config.url)
    const meta = this.extractMeta($)

    return {
      url: config.url,
      data,
      html: config.screenshot ? response.data : undefined,
      links,
      images,
      meta,
      timestamp: new Date(),
    }
  }

  async extractLinks(url: string, connectionConfig: ConnectionConfig): Promise<ScrapingResult> {
    const response = await this.fetchPage(url, connectionConfig)
    const $ = cheerio.load(response.data)

    const links = this.extractAllLinks($, url)
    const meta = this.extractMeta($)

    return {
      url,
      data: { linkCount: links.length },
      links,
      images: [],
      meta,
      timestamp: new Date(),
    }
  }

  async extractWithSelectors(
    url: string,
    selectors: SelectorConfig[],
    connectionConfig: ConnectionConfig
  ): Promise<ScrapingResult> {
    return this.scrapeUrl({ url, selectors }, connectionConfig)
  }

  async parseMarkdownLinks(url: string, connectionConfig: ConnectionConfig): Promise<ScrapingResult> {
    const response = await this.fetchPage(url, connectionConfig)
    const content = response.data as string

    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
    const links: string[] = []
    const data: Record<string, string> = {}

    let match
    while ((match = linkPattern.exec(content)) !== null) {
      const name = match[1].trim()
      const href = match[2].trim()

      if (this.isValidUrl(href)) {
        links.push(href)
        const key = this.slugify(name)
        data[key] = href
      }
    }

    return {
      url,
      data,
      links,
      images: [],
      meta: { type: 'markdown' },
      timestamp: new Date(),
    }
  }

  async parseGitHubReadme(repoUrl: string, connectionConfig: ConnectionConfig): Promise<ScrapingResult> {
    const rawUrl = this.convertToRawGitHubUrl(repoUrl)
    return this.parseMarkdownLinks(rawUrl, connectionConfig)
  }

  private async fetchPage(url: string, config: ConnectionConfig): Promise<any> {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...config.headers,
    }

    const axiosConfig: any = {
      url,
      method: 'GET',
      headers,
      timeout: config.timeout || 30000,
      maxRedirects: 5,
    }

    if (config.proxy) {
      axiosConfig.proxy = {
        host: new URL(config.proxy.url).hostname,
        port: parseInt(new URL(config.proxy.url).port) || 80,
        auth: config.proxy.username
          ? { username: config.proxy.username, password: config.proxy.password || '' }
          : undefined,
      }
    }

    return axios(axiosConfig)
  }

  private extractAllLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = []
    const seen = new Set<string>()

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return

      const absoluteUrl = this.resolveUrl(href, baseUrl)
      if (absoluteUrl && !seen.has(absoluteUrl) && this.isValidUrl(absoluteUrl)) {
        seen.add(absoluteUrl)
        links.push(absoluteUrl)
      }
    })

    return links
  }

  private extractAllImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = []
    const seen = new Set<string>()

    $('img[src]').each((_, el) => {
      const src = $(el).attr('src')
      if (!src) return

      const absoluteUrl = this.resolveUrl(src, baseUrl)
      if (absoluteUrl && !seen.has(absoluteUrl)) {
        seen.add(absoluteUrl)
        images.push(absoluteUrl)
      }
    })

    return images
  }

  private extractMeta($: cheerio.CheerioAPI): Record<string, string> {
    const meta: Record<string, string> = {}

    meta.title = $('title').text().trim()
    meta.description = $('meta[name="description"]').attr('content') || ''
    meta.keywords = $('meta[name="keywords"]').attr('content') || ''
    meta.ogTitle = $('meta[property="og:title"]').attr('content') || ''
    meta.ogDescription = $('meta[property="og:description"]').attr('content') || ''
    meta.ogImage = $('meta[property="og:image"]').attr('content') || ''

    return meta
  }

  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href
      }
      if (href.startsWith('//')) {
        return `https:${href}`
      }
      if (href.startsWith('/')) {
        const base = new URL(baseUrl)
        return `${base.protocol}//${base.host}${href}`
      }
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        return null
      }
      return new URL(href, baseUrl).href
    } catch {
      return null
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  private convertToRawGitHubUrl(url: string): string {
    if (url.includes('raw.githubusercontent.com')) {
      return url
    }

    const githubPattern = /github\.com\/([^/]+)\/([^/]+)(?:\/blob)?(?:\/([^/]+))?(?:\/(.*))?/
    const match = url.match(githubPattern)

    if (match) {
      const [, owner, repo, branch = 'main', path = 'README.md'] = match
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    }

    return url
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private getCapabilities(): ConnectorCapabilities {
    return {
      canAuthenticate: false,
      canScrape: true,
      canAutomate: false,
      canUpload: false,
      canDownload: true,
      canStream: false,
      canWebhook: false,
      canOAuth: false,
      requiresCaptcha: false,
      requiresEmail: false,
      requiresPhone: false,
    }
  }

  private createEmptyUsage(): ConnectionUsage {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      totalDataTransferred: 0,
      averageResponseTime: 0,
    }
  }
}
