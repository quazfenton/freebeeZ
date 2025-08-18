#!/usr/bin/env ts-node
/*
  Script: update-free-services.ts
  Purpose: Aggregate free services from configured sources into data/free-services.json
  Safe: Non-destructive; merges and de-duplicates by name+host key
*/

import path from 'path'
import { FreeServiceAggregator } from '../lib/free-service-aggregator'
import type { AggregationSourceConfig } from '../lib/free-service-aggregator/types'

// Seed sources: you can add/remove here. Prefer raw URLs for GitHub markdown.
const sources: AggregationSourceConfig[] = [
  {
    id: 'awesome-free-services-github',
    type: 'github_markdown',
    url: 'https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md',
    notes: 'Large curated list of free offerings for developers'
  },
  // Example of a simple web page with links (replace with actual aggregator pages)
  // { id: 'some-aggregator', type: 'web_page', url: 'https://example.com/free-tools' },
  // Example RSS feed (replace with a real one listing free APIs/services)
  // { id: 'free-apis-feed', type: 'rss', url: 'https://example.com/feed.xml' },
]

async function main() {
  const aggregator = new FreeServiceAggregator(path.join(process.cwd(), 'data', 'free-services.json'))
  let catalog = await aggregator.loadCatalog()

  console.log(`Loaded catalog with ${catalog.length} entries`)
  for (const src of sources) {
    console.log(`Fetching from source: ${src.id} (${src.type})`)
    try {
      const incoming = await aggregator.fetchFromSource(src)
      const { merged, result } = aggregator.merge(catalog, incoming, src.id)
      catalog = merged
      console.log(`Source ${src.id}: added=${result.added} updated=${result.updated} totalSeen=${result.total}`)
    } catch (err) {
      console.error(`Source ${src.id} failed:`, (err as Error).message)
    }
  }

  await aggregator.saveCatalog(catalog)
  console.log(`Saved catalog with ${catalog.length} entries to data/free-services.json`)
}

main().catch(err => {
  console.error('Aggregation failed:', err)
  process.exit(1)
})

