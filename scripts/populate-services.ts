#!/usr/bin/env node
// populate-services.ts
// Script to populate free-services.json with initial data from various sources

import fs from 'fs/promises';
import path from 'path';
import { FreeServiceAggregator } from '../lib/free-service-aggregator';

async function populateServices() {
  console.log('Starting service population...');
  
  try {
    // Initialize the aggregator
    const aggregator = new FreeServiceAggregator();
    
    // Run the aggregation process
    const services = await aggregator.aggregateAll();
    
    console.log(`Found ${services.length} services`);
    
    // Write to data/free-services.json
    const outputPath = path.join(process.cwd(), 'data', 'free-services.json');
    await fs.writeFile(outputPath, JSON.stringify(services, null, 2));
    
    console.log(`Services successfully written to ${outputPath}`);
    console.log(`Total services: ${services.length}`);
    
    // Print some statistics
    const sources = [...new Set(services.map(s => s.source))];
    console.log(`Sources: ${sources.join(', ')}`);
    
  } catch (error) {
    console.error('Error populating services:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateServices();
}

export { populateServices };