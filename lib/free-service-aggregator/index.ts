import fs from 'fs'
import path from 'path'
import { FreeService, AggregationSourceConfig, AggregationResult } from './types'
import { fetchGitHubMarkdownList } from './sources/githubList'
import { fetchWebPageLinks } from './sources/webPage'
import { fetchRss } from './sources/rss'

export class FreeServiceAggregator {
  private catalogPath: string

  constructor(catalogPath = path.join(process.cwd(), 'data', 'free-services.json')) {
    this.catalogPath = catalogPath
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
    if (source.type === 'github_markdown') return fetchGitHubMarkdownList(source)
    if (source.type === 'web_page') return fetchWebPageLinks(source)
    if (source.type === 'rss') return fetchRss(source)
    return []
  }

  merge(catalog: FreeService[], incoming: FreeService[], sourceId: string): { merged: FreeService[], result: AggregationResult } {
    const byKey = new Map<string, FreeService>()
    for (const item of catalog) {
      byKey.set(this.key(item), item)
    }

    let added = 0, updated = 0, skipped = 0

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

  private key(s: FreeService): string {
    return `${this.slug(s.name)}__${new URL(s.url).hostname}`
  }

  private slug(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }

  private slugFromUrl(u: string): string {
    try { return this.slug(new URL(u).hostname) } catch { return '' }
  }

  private mergeTags(a?: string[], b?: string[]): string[] | undefined {
    if (!a && !b) return undefined
    const set = new Set<string>([...(a || []), ...(b || [])])
    return Array.from(set)
  }
}

