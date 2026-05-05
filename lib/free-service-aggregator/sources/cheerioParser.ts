// Enhanced HTML Parser using Cheerio
import axios from 'axios'
import * as cheerio from 'cheerio'
import { FreeService, AggregationSourceConfig } from '../types'

export interface ParsedLink {
  name: string
  url: string
  description?: string
  category?: string
}

export async function fetchAndParseHtml(source: AggregationSourceConfig): Promise<FreeService[]> {
  try {
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 30000,
    })

    const $ = cheerio.load(response.data)
    const services: FreeService[] = []
    const seen = new Set<string>()

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      const text = $(el).text().trim()

      if (!href || !text) return
      if (!isValidServiceUrl(href)) return
      if (seen.has(href)) return
      seen.add(href)

      const description = extractDescription($, el)
      const category = extractCategory($, el)

      services.push({
        id: slugify(text),
        name: text,
        url: normalizeUrl(href),
        description,
        category,
        source: source.id,
        lastChecked: new Date().toISOString(),
      })
    })

    return services
  } catch (error) {
    console.error(`Failed to parse HTML from ${source.url}:`, error)
    return []
  }
}

export async function fetchAndParseAwesomeList(source: AggregationSourceConfig): Promise<FreeService[]> {
  try {
    const rawUrl = convertToRawGitHubUrl(source.url)
    const response = await axios.get(rawUrl, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'FreebeeZ-Bot/1.0',
      },
      timeout: 30000,
    })

    const content = typeof response.data === 'string' ? response.data : String(response.data)
    return parseMarkdownContent(content, source.id)
  } catch (error) {
    console.error(`Failed to parse Awesome list from ${source.url}:`, error)
    return []
  }
}

export function parseMarkdownContent(content: string, sourceId: string): FreeService[] {
  const services: FreeService[] = []
  const lines = content.split(/\r?\n/)
  let currentCategory = 'general'
  const seen = new Set<string>()

  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  const headerRegex = /^#{1,4}\s+(.+)$/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const headerMatch = trimmed.match(headerRegex)
    if (headerMatch) {
      currentCategory = categorizeHeader(headerMatch[1])
      continue
    }

    let match
    while ((match = linkRegex.exec(trimmed)) !== null) {
      const name = match[1].trim()
      const url = match[2].trim()

      if (!isValidServiceUrl(url)) continue
      if (seen.has(url)) continue
      seen.add(url)

      const descriptionMatch = trimmed.match(new RegExp(`\\]\\(${escapeRegex(url)}\\)\\s*[-–—:]?\\s*(.+)$`))
      const description = descriptionMatch ? descriptionMatch[1].trim() : undefined

      services.push({
        id: slugify(name),
        name,
        url: normalizeUrl(url),
        description,
        category: mapCategory(currentCategory),
        tags: extractTags(name, description),
        source: sourceId,
        lastChecked: new Date().toISOString(),
      })
    }
  }

  return services
}

function convertToRawGitHubUrl(url: string): string {
  if (url.includes('raw.githubusercontent.com')) return url

  const patterns = [
    /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/,
    /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      const [, owner, repo, branch = 'main', path = 'README.md'] = match
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    }
  }

  return url
}

function isValidServiceUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    const skipDomains = [
      'github.com/topics',
      'github.com/search',
      'wikipedia.org',
      'stackoverflow.com',
      'reddit.com',
      'twitter.com',
      'x.com',
      'facebook.com',
      'youtube.com',
      'medium.com',
      'dev.to/t/',
      'blog.',
      'docs.',
      'news.',
    ]

    const urlLower = url.toLowerCase()
    for (const skip of skipDomains) {
      if (urlLower.includes(skip)) return false
    }

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    let normalized = parsed.toString()
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  } catch {
    return url
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

function extractDescription($: cheerio.CheerioAPI, el: cheerio.Element): string | undefined {
  const parent = $(el).parent()
  const siblings = parent.contents().filter((_, node) => node !== el)

  let text = ''
  siblings.each((_, node) => {
    if (node.type === 'text') {
      text += $(node).text()
    }
  })

  const cleaned = text.replace(/^[\s\-–—:]+/, '').trim()
  return cleaned || undefined
}

function extractCategory($: cheerio.CheerioAPI, el: cheerio.Element): string | undefined {
  const headings = $(el).prevAll('h1, h2, h3, h4').first()
  if (headings.length) {
    return categorizeHeader(headings.text())
  }

  const list = $(el).closest('li')
  if (list.length) {
    const listParent = list.parent()
    const prevHeading = listParent.prevAll('h1, h2, h3, h4').first()
    if (prevHeading.length) {
      return categorizeHeader(prevHeading.text())
    }
  }

  return undefined
}

function categorizeHeader(header: string): string {
  const lower = header.toLowerCase()

  const categories: Record<string, string[]> = {
    communication: ['email', 'mail', 'messaging', 'chat', 'sms', 'notification'],
    web_infrastructure: ['hosting', 'cdn', 'dns', 'domain', 'server', 'deploy', 'paas'],
    computing_storage: ['storage', 'database', 'computing', 'cloud', 'backup', 'file'],
    ai_ml: ['ai', 'ml', 'machine learning', 'nlp', 'vision', 'gpt', 'llm'],
    developer_tools: ['developer', 'dev', 'tools', 'ci', 'cd', 'testing', 'ide', 'git'],
    security: ['security', 'auth', 'ssl', 'vpn', 'encryption', 'identity'],
    utilities: ['utils', 'utilities', 'misc', 'other', 'general'],
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category
    }
  }

  return 'other'
}

function mapCategory(category: string): string {
  const mapping: Record<string, string> = {
    email: 'communication',
    mail: 'communication',
    hosting: 'web_infrastructure',
    storage: 'computing_storage',
    database: 'computing_storage',
    ai: 'ai_ml',
    ml: 'ai_ml',
    developer: 'developer_tools',
    security: 'security',
    auth: 'security',
  }

  return mapping[category.toLowerCase()] || category
}

function extractTags(name: string, description?: string): string[] {
  const text = `${name} ${description || ''}`.toLowerCase()
  const tags: string[] = []

  const tagPatterns: Record<string, string[]> = {
    free_tier: ['free', 'gratis', 'no cost'],
    api: ['api', 'rest', 'graphql'],
    open_source: ['open source', 'opensource', 'foss'],
    self_hosted: ['self-hosted', 'self hosted'],
    unlimited: ['unlimited', 'no limit'],
    temporary: ['temporary', 'temp', 'disposable'],
    secure: ['secure', 'encrypted', 'privacy'],
    real_time: ['real-time', 'realtime', 'live'],
  }

  for (const [tag, patterns] of Object.entries(tagPatterns)) {
    if (patterns.some((p) => text.includes(p))) {
      tags.push(tag)
    }
  }

  return tags
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
