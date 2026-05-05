#!/usr/bin/env node
// run-aggregation.ts
// Script to manually trigger service aggregation

import { FreeServiceAggregator } from '../lib/free-service-aggregator';

async function runAggregation() {
  console.log('Running manual service aggregation...');
  
  try {
    // Initialize the aggregator
    const aggregator = new FreeServiceAggregator();
    
    // Run the aggregation process
    const services = await aggregator.aggregateAll();
    
    console.log(`Aggregation complete. Found ${services.length} services`);
    
    // Print first few services as sample
    console.log('\nSample services:');
    services.slice(0, 5).forEach(service => {
      console.log(`- ${service.name} (${service.id}) from ${service.source}`);
    });
    
    return services;
    
  } catch (error) {
    console.error('Error during aggregation:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runAggregation()
    .then(() => console.log('Aggregation finished successfully'))
    .catch(error => {
      console.error('Aggregation failed:', error);
      process.exit(1);
    });
}

export { runAggregation };