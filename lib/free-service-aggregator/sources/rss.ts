import axios from 'axios'
import { FreeService, AggregationSourceConfig } from './types'

// Naive RSS/Atom extraction using regex for links and titles
export async function fetchRss(source: AggregationSourceConfig): Promise<FreeService[]> {
  const res = await axios.get(source.url, { headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' } })
  const xml = typeof res.data === 'string' ? res.data : String(res.data)

  const itemRegex = /<(item|entry)[^>]*>([\s\S]*?)<\/(item|entry)>/gi
  const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i
  const linkRegex = /<link[^>]*>([\s\S]*?)<\/link>|<link[^>]*href=["'](.*?)["'][^>]*\/>/i

  const services: FreeService[] = []
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[2]
    const titleM = block.match(titleRegex)
    const linkM = block.match(linkRegex)
    const title = titleM ? titleM[1].trim() : 'Untitled'
    const url = (linkM ? (linkM[1] || linkM[2]) : '').trim()
    if (!url || !/^https?:\/\//i.test(url)) continue
    const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/^-+|-+$/g, '')
    services.push({ id, name: title, url, source: source.id })
  }

  return services
}

