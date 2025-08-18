import axios from 'axios'
import { FreeService, AggregationSourceConfig } from './types'

// Simple parser for GitHub markdown lists: finds lines with [name](url)
export async function fetchGitHubMarkdownList(source: AggregationSourceConfig): Promise<FreeService[]> {
  const res = await axios.get(source.url, { headers: { 'Accept': 'text/plain' } })
  const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
  const lines = text.split(/\r?\n/)
  const services: FreeService[] = []

  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/

  for (const raw of lines) {
    const line = raw.trim()
    const match = line.match(linkRegex)
    if (!match) continue
    const name = match[1].trim()
    const url = match[2].trim()
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/^-+|-+$/g, '')
    services.push({ id, name, url, source: source.id })
  }

  return services
}

