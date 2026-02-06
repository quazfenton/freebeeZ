#!/usr/bin/env node
// populate-services.ts
// Script to populate free-services.json with initial data from various sources

import fs from 'fs/promises';
import path from 'path';
import { FreeServiceAggregator } from '../lib/free-service-aggregator';

async function populateServices() {
  console.log('▶️  Starting service population...');
  
  const aggregator = new FreeServiceAggregator();
  try {
    const stats = await aggregator.aggregateFromAllSources();
    const catalog = await aggregator.loadCatalog();
    const outputPath = path.join(process.cwd(), 'data', 'free-services.json');

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2), 'utf8');

    console.log(`✔️  Aggregated ${catalog.length} services (${stats.newServices} new, ${stats.updatedServices} updated) from ${stats.successfulSources} sources.`);
    console.log(`Saved catalog to ${outputPath}`);
    console.log(`Sources processed: ${Object.keys(stats.bySource).length} (${Object.keys(stats.bySource).join(', ')})`);
  } catch (error) {
    console.error('❌ Error populating services:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateServices();
}

export { populateServices };