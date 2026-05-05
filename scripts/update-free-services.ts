#!/usr/bin/env node
// Script to update free services catalog from all sources
// Usage: node scripts/update-free-services.ts [--priority] [--sources=id1,id2]

// Using require for CommonJS compatibility
const { FreeServiceAggregator, ALL_SOURCES, getPrioritySources, getSourceById } = require('../lib/free-service-aggregator/index')

interface UpdateOptions {
  priority: boolean
  sources?: string[]
  generateTemplates: boolean
}

function parseArgs(): UpdateOptions {
  const args = process.argv.slice(2)
  const options: UpdateOptions = {
    priority: false,
    generateTemplates: true,
  }

  for (const arg of args) {
    if (arg === '--priority' || arg === '-p') {
      options.priority = true
    } else if (arg.startsWith('--sources=')) {
      options.sources = arg.replace('--sources=', '').split(',').map((s) => s.trim())
    } else if (arg === '--no-templates') {
      options.generateTemplates = false
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
FreebeeZ Service Aggregator Update Script

Usage:
  npx ts-node scripts/update-free-services.ts [options]

Options:
  --priority, -p       Only fetch from priority sources (top 5)
  --sources=id1,id2    Fetch from specific sources by ID
  --no-templates       Skip generating service templates
  --help, -h           Show this help

Available Sources:
${ALL_SOURCES.map((s) => `  - ${s.id}: ${s.notes || s.url}`).join('\n')}

Examples:
  # Update from all sources
  npx ts-node scripts/update-free-services.ts

  # Update from priority sources only
  npx ts-node scripts/update-free-services.ts --priority

  # Update from specific sources
  npx ts-node scripts/update-free-services.ts --sources=free-for-dev,public-apis
`)
}

async function main(): Promise<void> {
  const options = parseArgs()
  const aggregator = new FreeServiceAggregator()

  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║         FreebeeZ Free Service Aggregator                 ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log()

  let sources = ALL_SOURCES

  if (options.sources) {
    sources = options.sources
      .map((id) => getSourceById(id))
      .filter((s): s is NonNullable<typeof s> => !!s)

    if (sources.length === 0) {
      console.error('❌ No valid sources found with the provided IDs')
      process.exit(1)
    }
    console.log(`📋 Using ${sources.length} specified sources`)
  } else if (options.priority) {
    sources = getPrioritySources(5)
    console.log(`📋 Using ${sources.length} priority sources`)
  } else {
    console.log(`📋 Using all ${sources.length} available sources`)
  }

  console.log()
  console.log('Sources to process:')
  sources.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.id} (${s.type})`)
  })
  console.log()

  console.log('🔄 Starting aggregation...')
  console.log()

  const startTime = Date.now()
  const stats = await aggregator.aggregateFromAllSources(sources)

  console.log()
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║                    Aggregation Results                   ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log()
  console.log(`✅ Successful sources: ${stats.successfulSources}/${stats.totalSources}`)
  console.log(`❌ Failed sources: ${stats.failedSources}`)
  console.log()
  console.log(`📦 Total services: ${stats.totalServices}`)
  console.log(`   ├─ New: ${stats.newServices}`)
  console.log(`   └─ Updated: ${stats.updatedServices}`)
  console.log()
  console.log('📊 By Category:')
  Object.entries(stats.byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`   ├─ ${cat}: ${count}`)
    })
  console.log()
  console.log('📁 By Source:')
  Object.entries(stats.bySource)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([source, count]) => {
      console.log(`   ├─ ${source}: ${count}`)
    })
  console.log()
  console.log(`⏱️  Duration: ${(stats.duration / 1000).toFixed(2)}s`)
  console.log()

  if (options.generateTemplates) {
    console.log('🔧 Generating service templates...')
    const templates = await aggregator.generateServiceTemplates()
    console.log(`   Generated ${templates.length} templates`)
    console.log()
  }

  console.log('✨ Done!')
  console.log()
  console.log('Files updated:')
  console.log('   ├─ data/free-services.json')
  if (options.generateTemplates) {
    console.log('   └─ data/generated-templates.json')
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
