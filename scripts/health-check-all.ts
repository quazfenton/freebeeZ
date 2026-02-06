#!/usr/bin/env node
// health-check-all.ts
// Script to run comprehensive system health checks

import { FreeServiceAggregator } from '../lib/free-service-aggregator';
import { Orchestrator } from '../lib/orchestrator';
import { ServiceRegistry } from '../lib/service-registry';
import { AccountManager } from '../lib/account-manager';
import { ProxyRotationSystem } from '../lib/proxy-rotation-system';
import { CaptchaManager } from '../lib/captcha-solver';
import { SessionVault } from '../lib/session-vault';
import { QueueService } from '../lib/queue';

async function runHealthChecks() {
  console.log('Starting comprehensive system health checks...\n');
  
  const results: { [key: string]: { status: string; message: string } } = {};
  
  try {
    console.log('Checking Free Service Aggregator...');
    try {
      const aggregator = new FreeServiceAggregator();
      const catalog = await aggregator.loadCatalog();
      if (!catalog.length) {
        throw new Error('Catalog is empty; run scripts/update-free-services.ts first.');
      }

      results.aggregator = {
        status: 'OK',
        message: `Loaded ${catalog.length} aggregated services`
      };
      console.log('✅ Free Service Aggregator: OK');
    } catch (error) {
      results.aggregator = {
        status: 'ERROR',
        message: (error as Error).message
      };
      console.log('❌ Free Service Catalog: FAILED');
    }
    
    console.log('Checking Service Registry...');
    try {
      const registry = new ServiceRegistry();
      await registry.initialize();
      const registeredServices = registry.getAllServices();
      results.registry = {
        status: 'OK',
        message: `Registered ${registeredServices.length} services`
      };
      console.log('✅ Service Registry: OK');
    } catch (error) {
      results.registry = {
        status: 'ERROR',
        message: (error as Error).message
      };
      console.log('❌ Service Registry: FAILED');
    }
    
    console.log('Checking Account Manager...');
    try {
      const accountManager = new AccountManager();
      await accountManager.initialize();
      const pools = accountManager.getAccountPools();
      results.accountManager = {
        status: 'OK',
        message: `Managing ${Object.keys(pools).length} account pools`
      };
      console.log('✅ Account Manager: OK');
    } catch (error) {
      results.accountManager = {
        status: 'ERROR',
        message: (error as Error).message
      };
      console.log('❌ Account Manager: FAILED');
    }
    
    console.log('Checking Proxy Rotation System...');
    try {
      const proxySystem = new ProxyRotationSystem();
      await proxySystem.initialize();
      const activeProxies = proxySystem.getActiveProxies();
      results.proxySystem = {
        status: 'OK',
        message: `Managing ${activeProxies.length} proxies`
      };
      console.log('✅ Proxy Rotation System: OK');
    } catch (error) {
      results.proxySystem = {
        status: 'ERROR',
        message: (error as Error).message
      };
      console.log('❌ Proxy Rotation System: FAILED');
    }
    
    console.log('Checking CAPTCHA Manager...');
    try {
      const captchaManager = new CaptchaManager();
      await captchaManager.initialize();
      const solvers = captchaManager.getAvailableSolvers();
      results.captchaManager = {
        status: 'OK',
        message: `Available solvers: ${solvers.join(', ')}`
      };
      console.log('✅ CAPTCHA Manager: OK');
    } catch (error) {
      results.captchaManager = {
        status: 'ERROR',
        message: (error as Error).message
      };
      console.log('❌ CAPTCHA Manager: FAILED');
    }
    
    console.log('Checking Session Vault...');
    try {
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable is required for session encryption');
      }
      
      const sessionVault = new SessionVault({
        encryptionKey,
        maxSessions: 100,
        sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
      });
      await sessionVault.initialize();
      const stats = await sessionVault.getStats();
      results.sessionVault = {
        status: 'OK',
        message: `Sessions: ${stats.totalSessions}, Active: ${stats.activeSessions}`
      };
      console.log('✅ Session Vault: OK');
    } catch (error) {
      results.sessionVault = {
        status: 'ERROR',
        message: (error as Error).message
      };
      console.log('❌ Session Vault: FAILED');
    }
    
    console.log('Checking Orchestrator...');
    try {
      const registry = new ServiceRegistry();
      await registry.initialize();
      const queueService = new QueueService(process.env.REDIS_URL || 'redis://localhost:6379');
      const orchestrator = new Orchestrator(registry, queueService);
      await orchestrator.initialize();
      results.orchestrator = {
        status: 'OK',
        message: 'Orchestrator initialized successfully'
      };
      console.log('✅ Orchestrator: OK');
    } catch (error) {
      results.orchestrator = {
        status: 'ERROR',
        message: (error as Error).message
      };
      console.log('❌ Orchestrator: FAILED');
    }
    
    console.log('\n--- HEALTH CHECK SUMMARY ---');
    let overallStatus = 'HEALTHY';
    
    for (const [component, result] of Object.entries(results)) {
      const statusSymbol = result.status === 'OK' ? '✅' : '❌';
      console.log(`${statusSymbol} ${component}: ${result.status} - ${result.message}`);
      
      if (result.status !== 'OK') {
        overallStatus = 'UNHEALTHY';
      }
    }
    
    console.log(`\nOverall Status: ${overallStatus}`);
    
    if (overallStatus === 'UNHEALTHY') {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Critical error during health checks:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runHealthChecks();
}

export { runHealthChecks };