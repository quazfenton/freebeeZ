#!/usr/bin/env node
// run-aggregation.ts
// Script to manually trigger service aggregation

import {
  FreeServiceAggregator,
  ALL_SOURCES,
  getPrioritySources,
  getSourceById,
} from '../lib/free-service-aggregator';

interface AggregationOptions {
  priority: boolean
  sources?: string[]
}

const DEFAULT_LIMIT = 5

function parseArgs(): AggregationOptions {
  const args = process.argv.slice(2)
  const options: AggregationOptions = { priority: false }

  for (const arg of args) {
    if (arg === '--priority' || arg === '-p') {
      options.priority = true
    } else if (arg.startsWith('--sources=')) {
      options.sources = arg.replace('--sources=', '').split(',').map((v) => v.trim()).filter(Boolean)
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return options
}

function printHelp() {
  console.log(`
run-aggregation.ts

Usage:
  node scripts/run-aggregation.ts [options]

Options:
  --priority, -p       Only process priority sources (top ${DEFAULT_LIMIT})
  --sources=id1,id2    Aggregate only from the specified source IDs
  --help, -h           Show this help

Available Sources:
${ALL_SOURCES.map((s) => `  - ${s.id}: ${s.notes || s.url}`).join('\n')}
`)
}

async function runAggregation(): Promise<void> {
  console.log('▶️  Running manual service aggregation...')
  const options = parseArgs()

  const aggregator = new FreeServiceAggregator()
  let sources = ALL_SOURCES

  if (options.sources && options.sources.length > 0) {
    sources = options.sources
      .map((id) => getSourceById(id))
      .filter((source): source is NonNullable<typeof source> => !!source)

    if (sources.length === 0) {
      console.error('❌ No valid sources provided for aggregation.')
      process.exit(1)
    }
  } else if (options.priority) {
    sources = getPrioritySources(DEFAULT_LIMIT)
  }

  console.log('Sources being processed:')
  sources.forEach((source, index) => {
    console.log(`  ${index + 1}. ${source.id} (${source.type})`)
  })

  const stats = await aggregator.aggregateFromAllSources(sources)
  const catalog = await aggregator.loadCatalog()

  console.log('\n--- Aggregation Results ---')
  console.log(`Sources processed: ${stats.successfulSources}/${stats.totalSources}`)
  console.log(`Services found: ${stats.totalServices}`)
  console.log(`New services: ${stats.newServices}`)
  console.log(`Updated services: ${stats.updatedServices}`)
  console.log(`Duration: ${(stats.duration / 1000).toFixed(2)}s`)
  console.log(`Catalog size: ${catalog.length}`)

  console.log('\n📦 Sample services:')
  catalog.slice(0, 5).forEach((service) => {
    console.log(`- ${service.name} (${service.id}) • ${service.url} • ${service.source}`)
  })
  console.log('\n✅ Aggregation finished successfully')
}

if (require.main === module) {
  runAggregation().catch((error) => {
    console.error('\n❌ Aggregation failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
}

export { runAggregation };