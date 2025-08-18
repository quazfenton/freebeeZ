import axios from 'axios'
import { FreeService, AggregationSourceConfig } from './types'

// Minimal HTML anchor extraction (no cheerio to keep deps small)
export async function fetchWebPageLinks(source: AggregationSourceConfig): Promise<FreeService[]> {
  const res = await axios.get(source.url, { headers: { 'Accept': 'text/html' } })
  const html = typeof res.data === 'string' ? res.data : String(res.data)
  const anchorRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"'#\s]+)["'][^>]*>(.*?)<\/a>/gi
  const services: FreeService[] = []
  const seen = new Set<string>()

  let match: RegExpExecArray | null
  while ((match = anchorRegex.exec(html)) !== null) {
    const url = match[1].trim()
    const nameRaw = match[2].replace(/<[^>]*>/g, '').trim()
    const name = nameRaw || url
    if (seen.has(url)) continue
    seen.add(url)
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/^-+|-+$/g, '')
    services.push({ id, name, url, source: source.id })
  }

  return services
}

