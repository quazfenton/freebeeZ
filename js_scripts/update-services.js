#!/usr/bin/env node
// Simple script to update free services via API
// Usage: node js_scripts/update-services.js

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const GITHUB_SOURCES = [
  {
    id: 'free-for-dev',
    url: 'https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md',
    name: 'Free for Dev'
  },
  {
    id: 'public-apis',
    url: 'https://raw.githubusercontent.com/public-apis/public-apis/master/README.md',
    name: 'Public APIs'
  },
  {
    id: 'free-for-life',
    url: 'https://raw.githubusercontent.com/wdhdev/free-for-life/main/README.md',
    name: 'Free for Life'
  }
];

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'FreebeeZ-Bot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseMarkdownLinks(content, sourceId) {
  const services = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  const seen = new Set();
  
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const url = match[2].trim();
    
    if (seen.has(url)) continue;
    if (!isValidServiceUrl(url)) continue;
    seen.add(url);
    
    const id = slugify(name);
    services.push({
      id,
      name,
      url,
      source: sourceId,
      lastChecked: new Date().toISOString()
    });
  }
  
  return services;
}

function isValidServiceUrl(url) {
  const skipDomains = [
    'github.com/topics', 'github.com/search', 'wikipedia.org',
    'stackoverflow.com', 'reddit.com', 'twitter.com', 'x.com',
    'facebook.com', 'youtube.com', 'medium.com'
  ];
  
  for (const skip of skipDomains) {
    if (url.toLowerCase().includes(skip)) return false;
  }
  
  return true;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50);
}

function deduplicateServices(services) {
  const seen = new Map();
  
  for (const service of services) {
    const key = service.url.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, service);
    }
  }
  
  return Array.from(seen.values());
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         FreebeeZ Free Service Aggregator                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();

  const allServices = [];

  for (const source of GITHUB_SOURCES) {
    console.log(`📋 Fetching from ${source.name}...`);
    try {
      const content = await fetchUrl(source.url);
      const services = parseMarkdownLinks(content, source.id);
      console.log(`   Found ${services.length} services`);
      allServices.push(...services);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  const uniqueServices = deduplicateServices(allServices);
  console.log();
  console.log(`📦 Total unique services: ${uniqueServices.length}`);

  const catalogPath = path.join(__dirname, '..', 'data', 'free-services.json');
  fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
  fs.writeFileSync(catalogPath, JSON.stringify(uniqueServices, null, 2));
  
  console.log(`✅ Saved to data/free-services.json`);
  console.log();
  
  // Count by source
  const bySource = {};
  uniqueServices.forEach(s => {
    bySource[s.source] = (bySource[s.source] || 0) + 1;
  });
  
  console.log('📊 By Source:');
  for (const [source, count] of Object.entries(bySource)) {
    console.log(`   ├─ ${source}: ${count}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
