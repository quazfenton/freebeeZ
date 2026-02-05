// Enhanced Free Service Aggregator
import fs from 'fs'
import path from 'path'
import { FreeService, AggregationSourceConfig, AggregationResult, FreeServiceCategory } from './types'
import { fetchGitHubMarkdownList } from './sources/githubList'
import { fetchWebPageLinks } from './sources/webPage'
import { fetchRss } from './sources/rss'
import { fetchAndParseAwesomeList, fetchAndParseHtml } from './sources/cheerioParser'
import { ALL_SOURCES, getPrioritySources } from './catalog-sources'

export * from './types'
export { ALL_SOURCES, getPrioritySources, getSourceById, getSourcesByType } from './catalog-sources'

export interface AggregationStats {
  totalSources: number
  successfulSources: number
  failedSources: number
  totalServices: number
  newServices: number
  updatedServices: number
  byCategory: Record<string, number>
  bySource: Record<string, number>
  duration: number
  timestamp: Date
}

export class FreeServiceAggregator {
  private catalogPath: string
  private generatedTemplatesPath: string
  private lastAggregation?: AggregationStats

  constructor(
    catalogPath = path.join(process.cwd(), 'data', 'free-services.json'),
    generatedTemplatesPath = path.join(process.cwd(), 'data', 'generated-templates.json')
  ) {
    this.catalogPath = catalogPath
    this.generatedTemplatesPath = generatedTemplatesPath
  }

  async loadCatalog(): Promise<FreeService[]> {
    try {
      const buf = await fs.promises.readFile(this.catalogPath, 'utf8')
      return JSON.parse(buf) as FreeService[]
    } catch {
      return []
    }
  }

  async saveCatalog(items: FreeService[]): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.catalogPath), { recursive: true })
    const sorted = items.sort((a, b) => a.name.localeCompare(b.name))
    await fs.promises.writeFile(this.catalogPath, JSON.stringify(sorted, null, 2), 'utf8')
  }

  async fetchFromSource(source: AggregationSourceConfig): Promise<FreeService[]> {
    try {
      switch (source.type) {
        case 'github_markdown':
          return await fetchAndParseAwesomeList(source)
        case 'web_page':
          return await fetchAndParseHtml(source)
        case 'rss':
          return await fetchRss(source)
        default:
          console.warn(`Unknown source type: ${source.type}`)
          return []
      }
    } catch (error) {
      console.error(`Failed to fetch from source ${source.id}:`, error)
      return []
    }
  }

  async aggregateFromAllSources(
    sources: AggregationSourceConfig[] = ALL_SOURCES,
    options: { maxConcurrent?: number; timeout?: number } = {}
  ): Promise<AggregationStats> {
    const startTime = Date.now()
    const { maxConcurrent = 3 } = options

    const catalog = await this.loadCatalog()
    let allServices: FreeService[] = [...catalog]
    const results: AggregationResult[] = []

    const chunks = this.chunkArray(sources, maxConcurrent)

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (source) => {
        try {
          const services = await this.fetchFromSource(source)
          const { merged, result } = this.merge(allServices, services, source.id)
          allServices = merged
          return result
        } catch (error) {
          return {
            sourceId: source.id,
            added: 0,
            updated: 0,
            skipped: 0,
            total: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })

      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults)
    }

    await this.saveCatalog(allServices)

    const stats: AggregationStats = {
      totalSources: sources.length,
      successfulSources: results.filter((r) => !r.error).length,
      failedSources: results.filter((r) => r.error).length,
      totalServices: allServices.length,
      newServices: results.reduce((sum, r) => sum + r.added, 0),
      updatedServices: results.reduce((sum, r) => sum + r.updated, 0),
      byCategory: this.countByCategory(allServices),
      bySource: this.countBySource(allServices),
      duration: Date.now() - startTime,
      timestamp: new Date(),
    }

    this.lastAggregation = stats
    return stats
  }

  async aggregateFromPrioritySources(count: number = 5): Promise<AggregationStats> {
    const sources = getPrioritySources(count)
    return this.aggregateFromAllSources(sources)
  }

  merge(
    catalog: FreeService[],
    incoming: FreeService[],
    sourceId: string
  ): { merged: FreeService[]; result: AggregationResult } {
    const byKey = new Map<string, FreeService>()
    for (const item of catalog) {
      byKey.set(this.key(item), item)
    }

    let added = 0,
      updated = 0,
      skipped = 0

    for (const s of incoming) {
      const now = new Date().toISOString()
      const normalized: FreeService = {
        ...s,
        id: s.id || this.slugFromUrl(s.url) || this.slug(s.name),
        name: s.name?.trim() || s.url,
        url: s.url.trim(),
        source: sourceId,
        lastChecked: now,
      }

      const k = this.key(normalized)
      if (!byKey.has(k)) {
        byKey.set(k, normalized)
        added++
      } else {
        const prev = byKey.get(k)!
        const next = { ...prev, ...normalized, tags: this.mergeTags(prev.tags, normalized.tags) }
        byKey.set(k, next)
        updated++
      }
    }

    const merged = Array.from(byKey.values())
    const result: AggregationResult = { sourceId, added, updated, skipped, total: incoming.length }
    return { merged, result }
  }

  async searchServices(query: string, options: {
    category?: FreeServiceCategory
    tags?: string[]
    limit?: number
  } = {}): Promise<FreeService[]> {
    const catalog = await this.loadCatalog()
    const { category, tags, limit = 50 } = options
    const queryLower = query.toLowerCase()

    let filtered = catalog.filter((service) => {
      const nameMatch = service.name.toLowerCase().includes(queryLower)
      const descMatch = service.description?.toLowerCase().includes(queryLower)
      const urlMatch = service.url.toLowerCase().includes(queryLower)
      return nameMatch || descMatch || urlMatch
    })

    if (category) {
      filtered = filtered.filter((s) => s.category === category)
    }

    if (tags && tags.length > 0) {
      filtered = filtered.filter((s) =>
        tags.some((tag) => s.tags?.includes(tag))
      )
    }

    return filtered.slice(0, limit)
  }

  async getServicesByCategory(category: FreeServiceCategory): Promise<FreeService[]> {
    const catalog = await this.loadCatalog()
    return catalog.filter((s) => s.category === category)
  }

  async getServiceStats(): Promise<{
    total: number
    byCategory: Record<string, number>
    bySource: Record<string, number>
    lastUpdated?: Date
  }> {
    const catalog = await this.loadCatalog()
    return {
      total: catalog.length,
      byCategory: this.countByCategory(catalog),
      bySource: this.countBySource(catalog),
      lastUpdated: this.lastAggregation?.timestamp,
    }
  }

  async generateServiceTemplates(services?: FreeService[]): Promise<any[]> {
    const catalog = services || await this.loadCatalog()
    const templates = catalog.map((service) => this.convertToTemplate(service))

    await fs.promises.mkdir(path.dirname(this.generatedTemplatesPath), { recursive: true })
    await fs.promises.writeFile(
      this.generatedTemplatesPath,
      JSON.stringify(templates, null, 2),
      'utf8'
    )

    return templates
  }

  private convertToTemplate(service: FreeService): any {
    const categoryMap: Record<string, string> = {
      communication: 'COMMUNICATION',
      web_infrastructure: 'WEB_INFRASTRUCTURE',
      computing_storage: 'COMPUTING_STORAGE',
      ai_ml: 'AI_ML',
      developer_tools: 'DEVELOPER_TOOLS',
      security: 'SECURITY',
      utilities: 'UTILITIES',
      other: 'UTILITIES',
    }

    return {
      id: service.id,
      name: service.name,
      category: categoryMap[service.category || 'other'] || 'UTILITIES',
      baseUrl: service.url,
      signupUrl: this.guessSignupUrl(service.url),
      loginUrl: this.guessLoginUrl(service.url),
      description: service.description,
      registrationSteps: [
        { type: 'navigate' },
        { type: 'fillForm', selector: 'input[type="email"], input[name*="email"]', value: '{{email}}' },
        { type: 'fillForm', selector: 'input[type="password"], input[name*="password"]', value: '{{password}}' },
        { type: 'solveCaptcha' },
        { type: 'click', selector: 'button[type="submit"], .signup-btn, .register-btn' },
      ],
      limits: {},
      features: service.tags || [],
      requiresEmailVerification: true,
      requiresPhoneVerification: false,
      source: service.source,
      autoGenerated: true,
      generatedAt: new Date().toISOString(),
    }
  }

  private guessSignupUrl(baseUrl: string): string {
    const common = ['/signup', '/register', '/join', '/create-account', '/sign-up']
    return `${baseUrl}${common[0]}`
  }

  private guessLoginUrl(baseUrl: string): string {
    return `${baseUrl}/login`
  }

  private key(s: FreeService): string {
    return `${this.slug(s.name)}__${new URL(s.url).hostname}`
  }

  private slug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private slugFromUrl(u: string): string {
    try {
      return this.slug(new URL(u).hostname)
    } catch {
      return ''
    }
  }

  private mergeTags(a?: string[], b?: string[]): string[] | undefined {
    if (!a && !b) return undefined
    const set = new Set<string>([...(a || []), ...(b || [])])
    return Array.from(set)
  }

  private countByCategory(services: FreeService[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const service of services) {
      const category = service.category || 'other'
      counts[category] = (counts[category] || 0) + 1
    }
    return counts
  }

  private countBySource(services: FreeService[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const service of services) {
      counts[service.source] = (counts[service.source] || 0) + 1
    }
    return counts
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}
