// Proxy Rotation System for FreebeeZ
// Manages proxy pools with intelligent rotation and health monitoring

import { ProxyConfig } from '../types';

export interface ProxyNode extends ProxyConfig {
  id: string;
  name: string;
  provider: string;
  region: string;
  city?: string;
  asn?: string;
  isp?: string;
  speed: ProxySpeed;
  reliability: number; // 0-100
  anonymityLevel: AnonymityLevel;
  protocols: ProxyProtocol[];
  maxConcurrentConnections: number;
  currentConnections: number;
  status: ProxyStatus;
  healthMetrics: ProxyHealthMetrics;
  usage: ProxyUsage;
  cost: ProxyCost;
  tags: string[];
  createdAt: Date;
  lastChecked: Date;
  lastUsed: Date;
}

export enum ProxySpeed {
  SLOW = 'slow',           // > 3000ms
  MEDIUM = 'medium',       // 1000-3000ms
  FAST = 'fast',           // 500-1000ms
  VERY_FAST = 'very_fast'  // < 500ms
}

export enum AnonymityLevel {
  TRANSPARENT = 'transparent',     // Real IP visible
  ANONYMOUS = 'anonymous',         // Real IP hidden, proxy detected
  ELITE = 'elite'                  // Real IP hidden, proxy not detected
}

export enum ProxyProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS4 = 'socks4',
  SOCKS5 = 'socks5'
}

export enum ProxyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TESTING = 'testing',
  FAILED = 'failed',
  MAINTENANCE = 'maintenance',
  RATE_LIMITED = 'rate_limited',
  BLOCKED = 'blocked'
}

export interface ProxyHealthMetrics {
  uptime: number;              // Percentage
  averageResponseTime: number; // Milliseconds
  successRate: number;         // Percentage
  errorRate: number;           // Percentage
  timeoutRate: number;         // Percentage
  lastResponseTime: number;
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface ProxyUsage {
  totalSessions: number;
  totalDataTransferred: number; // Bytes
  averageSessionDuration: number; // Minutes
  peakConcurrentConnections: number;
  servicesUsed: string[];
  lastServiceUsed?: string;
  blockedServices: string[];
  suspiciousActivity: SuspiciousProxyActivity[];
}

export interface SuspiciousProxyActivity {
  timestamp: Date;
  activity: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  resolved: boolean;
}

export interface ProxyCost {
  pricePerGB?: number;
  pricePerRequest?: number;
  monthlyPrice?: number;
  currency: string;
  billingModel: 'pay_per_use' | 'monthly' | 'yearly';
}

export interface ProxyPool {
  id: string;
  name: string;
  description: string;
  proxies: string[]; // Proxy IDs
  rotationStrategy: RotationStrategy;
  healthCheckInterval: number; // Minutes
  failoverEnabled: boolean;
  loadBalancing: LoadBalancingStrategy;
  geoTargeting: GeoTargeting;
  filters: ProxyFilter[];
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  lastRotation: Date;
  currentProxy?: string;
  statistics: PoolStatistics;
}

export interface RotationStrategy {
  type: RotationStrategyType;
  parameters: RotationParameters;
  conditions: RotationCondition[];
}

export enum RotationStrategyType {
  ROUND_ROBIN = 'round_robin',
  RANDOM = 'random',
  LEAST_USED = 'least_used',
  FASTEST = 'fastest',
  GEOGRAPHIC = 'geographic',
  HEALTH_BASED = 'health_based',
  COST_OPTIMIZED = 'cost_optimized',
  STICKY_SESSION = 'sticky_session'
}

export interface RotationParameters {
  interval?: number;           // Minutes
  maxUsagePerProxy?: number;   // Requests
  healthThreshold?: number;    // 0-100
  maxFailures?: number;
  cooldownPeriod?: number;     // Minutes
  stickyDuration?: number;     // Minutes for sticky sessions
}

export interface RotationCondition {
  type: 'time' | 'usage' | 'health' | 'geography' | 'cost' | 'custom';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  description: string;
}

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED = 'weighted',
  LEAST_CONNECTIONS = 'least_connections',
  FASTEST_RESPONSE = 'fastest_response',
  GEOGRAPHIC = 'geographic'
}

export interface GeoTargeting {
  enabled: boolean;
  preferredCountries: string[];
  excludedCountries: string[];
  preferredRegions: string[];
  excludedRegions: string[];
  cityTargeting?: string[];
}

export interface ProxyFilter {
  type: 'speed' | 'anonymity' | 'protocol' | 'country' | 'provider' | 'cost' | 'reliability';
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  description: string;
}

export interface PoolStatistics {
  totalProxies: number;
  activeProxies: number;
  averageHealth: number;
  averageSpeed: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDataTransferred: number;
  averageCost: number;
  lastUpdated: Date;
}

export interface ProxyTestResult {
  proxyId: string;
  success: boolean;
  responseTime: number;
  anonymityLevel: AnonymityLevel;
  realIP: string;
  proxyIP: string;
  location: ProxyLocation;
  error?: string;
  timestamp: Date;
}

export interface ProxyLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface RotationEvent {
  id: string;
  timestamp: Date;
  poolId: string;
  previousProxyId?: string;
  newProxyId: string;
  reason: string;
  strategy: string;
  success: boolean;
  responseTime?: number;
  error?: string;
}

export class ProxyRotationSystem {
  private proxies: Map<string, ProxyNode> = new Map();
  private pools: Map<string, ProxyPool> = new Map();
  private rotationHistory: RotationEvent[] = [];
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();
  private testEndpoints: string[] = [
    'https://httpbin.org/ip',
    'https://api.ipify.org?format=json',
    'https://ipinfo.io/json'
  ];

  constructor() {
    this.initializeDefaultPools();
  }

  private initializeDefaultPools(): void {
    // Create a default pool for general use
    this.createPool({
      id: 'default',
      name: 'Default Proxy Pool',
      description: 'General purpose proxy pool with round-robin rotation',
      proxies: [],
      rotationStrategy: {
        type: RotationStrategyType.ROUND_ROBIN,
        parameters: {
          interval: 30,
          maxUsagePerProxy: 100,
          healthThreshold: 70,
          maxFailures: 3,
          cooldownPeriod: 15
        },
        conditions: []
      },
      healthCheckInterval: 5,
      failoverEnabled: true,
      loadBalancing: LoadBalancingStrategy.ROUND_ROBIN,
      geoTargeting: {
        enabled: false,
        preferredCountries: [],
        excludedCountries: [],
        preferredRegions: [],
        excludedRegions: []
      },
      filters: [],
      isActive: true,
      tags: ['default', 'general']
    });

    // Create a high-performance pool
    this.createPool({
      id: 'high_performance',
      name: 'High Performance Pool',
      description: 'Fast proxies for time-sensitive operations',
      proxies: [],
      rotationStrategy: {
        type: RotationStrategyType.FASTEST,
        parameters: {
          interval: 15,
          maxUsagePerProxy: 50,
          healthThreshold: 85,
          maxFailures: 2,
          cooldownPeriod: 10
        },
        conditions: []
      },
      healthCheckInterval: 2,
      failoverEnabled: true,
      loadBalancing: LoadBalancingStrategy.FASTEST_RESPONSE,
      geoTargeting: {
        enabled: false,
        preferredCountries: [],
        excludedCountries: [],
        preferredRegions: [],
        excludedRegions: []
      },
      filters: [
        {
          type: 'speed',
          operator: 'in',
          value: [ProxySpeed.FAST, ProxySpeed.VERY_FAST],
          description: 'Only fast proxies'
        },
        {
          type: 'reliability',
          operator: 'greater_than',
          value: 85,
          description: 'High reliability required'
        }
      ],
      isActive: true,
      tags: ['performance', 'fast']
    });
  }

  addProxy(proxy: Omit<ProxyNode, 'id' | 'createdAt' | 'lastChecked' | 'lastUsed'>): ProxyNode {
    const fullProxy: ProxyNode = {
      ...proxy,
      id: `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      lastChecked: new Date(0),
      lastUsed: new Date(0)
    };

    this.proxies.set(fullProxy.id, fullProxy);
    return fullProxy;
  }

  removeProxy(proxyId: string): boolean {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return false;

    // Remove from all pools
    this.pools.forEach(pool => {
      pool.proxies = pool.proxies.filter(id => id !== proxyId);
      if (pool.currentProxy === proxyId) {
        pool.currentProxy = undefined;
      }
    });

    return this.proxies.delete(proxyId);
  }

  getProxy(proxyId: string): ProxyNode | undefined {
    return this.proxies.get(proxyId);
  }

  getAllProxies(): ProxyNode[] {
    return Array.from(this.proxies.values());
  }

  getActiveProxies(): ProxyNode[] {
    return Array.from(this.proxies.values())
      .filter(proxy => proxy.status === ProxyStatus.ACTIVE);
  }

  createPool(pool: Omit<ProxyPool, 'createdAt' | 'lastRotation' | 'statistics'>): ProxyPool {
    const fullPool: ProxyPool = {
      ...pool,
      createdAt: new Date(),
      lastRotation: new Date(0),
      statistics: {
        totalProxies: pool.proxies.length,
        activeProxies: 0,
        averageHealth: 0,
        averageSpeed: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDataTransferred: 0,
        averageCost: 0,
        lastUpdated: new Date()
      }
    };

    this.pools.set(pool.id, fullPool);
    
    if (pool.isActive) {
      this.startPoolHealthChecks(pool.id);
      this.startPoolRotation(pool.id);
    }

    return fullPool;
  }

  removePool(poolId: string): boolean {
    this.stopPoolHealthChecks(poolId);
    this.stopPoolRotation(poolId);
    return this.pools.delete(poolId);
  }

  getPool(poolId: string): ProxyPool | undefined {
    return this.pools.get(poolId);
  }

  getAllPools(): ProxyPool[] {
    return Array.from(this.pools.values());
  }

  addProxyToPool(poolId: string, proxyId: string): boolean {
    const pool = this.pools.get(poolId);
    const proxy = this.proxies.get(proxyId);

    if (!pool || !proxy) return false;

    if (!pool.proxies.includes(proxyId)) {
      pool.proxies.push(proxyId);
      this.updatePoolStatistics(poolId);
    }

    return true;
  }

  removeProxyFromPool(poolId: string, proxyId: string): boolean {
    const pool = this.pools.get(poolId);
    if (!pool) return false;

    pool.proxies = pool.proxies.filter(id => id !== proxyId);
    
    if (pool.currentProxy === proxyId) {
      pool.currentProxy = undefined;
    }

    this.updatePoolStatistics(poolId);
    return true;
  }

  async rotateProxy(poolId: string, reason?: string): Promise<ProxyNode | null> {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.isActive) return null;

    const availableProxies = this.getAvailableProxies(pool);
    if (availableProxies.length === 0) return null;

    const newProxy = this.selectNextProxy(pool, availableProxies);
    if (!newProxy) return null;

    const previousProxyId = pool.currentProxy;
    pool.currentProxy = newProxy.id;
    pool.lastRotation = new Date();

    // Test the new proxy
    const testResult = await this.testProxy(newProxy.id);
    
    const rotationEvent: RotationEvent = {
      id: `rotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      poolId,
      previousProxyId,
      newProxyId: newProxy.id,
      reason: reason || `Automatic rotation (${pool.rotationStrategy.type})`,
      strategy: pool.rotationStrategy.type,
      success: testResult.success,
      responseTime: testResult.responseTime,
      error: testResult.error
    };

    this.rotationHistory.push(rotationEvent);

    // Update proxy usage
    newProxy.lastUsed = new Date();
    newProxy.currentConnections++;
    newProxy.usage.totalSessions++;

    // Update pool statistics
    this.updatePoolStatistics(poolId);

    return testResult.success ? newProxy : null;
  }

  private getAvailableProxies(pool: ProxyPool): ProxyNode[] {
    const now = new Date();
    const cooldownMs = (pool.rotationStrategy.parameters.cooldownPeriod || 15) * 60 * 1000;

    return pool.proxies
      .map(id => this.proxies.get(id))
      .filter((proxy): proxy is ProxyNode => {
        if (!proxy) return false;
        if (proxy.status !== ProxyStatus.ACTIVE) return false;
        
        // Check cooldown period
        const timeSinceLastUse = now.getTime() - proxy.lastUsed.getTime();
        if (timeSinceLastUse < cooldownMs) return false;

        // Check max concurrent connections
        if (proxy.currentConnections >= proxy.maxConcurrentConnections) return false;

        // Apply pool filters
        if (!this.passesFilters(proxy, pool.filters)) return false;

        // Check health threshold
        const healthThreshold = pool.rotationStrategy.parameters.healthThreshold || 50;
        if (proxy.healthMetrics.successRate < healthThreshold) return false;

        return true;
      });
  }

  private passesFilters(proxy: ProxyNode, filters: ProxyFilter[]): boolean {
    return filters.every(filter => {
      switch (filter.type) {
        case 'speed':
          return this.checkFilterCondition(proxy.speed, filter.operator, filter.value);
        case 'anonymity':
          return this.checkFilterCondition(proxy.anonymityLevel, filter.operator, filter.value);
        case 'protocol':
          return this.checkFilterCondition(proxy.protocols, filter.operator, filter.value);
        case 'country':
          return this.checkFilterCondition(proxy.country, filter.operator, filter.value);
        case 'provider':
          return this.checkFilterCondition(proxy.provider, filter.operator, filter.value);
        case 'reliability':
          return this.checkFilterCondition(proxy.reliability, filter.operator, filter.value);
        case 'cost':
          return this.checkFilterCondition(proxy.cost.monthlyPrice || 0, filter.operator, filter.value);
        default:
          return true;
      }
    });
  }

  private checkFilterCondition(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === filterValue;
      case 'greater_than':
        return value > filterValue;
      case 'less_than':
        return value < filterValue;
      case 'in':
        return Array.isArray(filterValue) ? filterValue.includes(value) : false;
      case 'not_in':
        return Array.isArray(filterValue) ? !filterValue.includes(value) : true;
      default:
        return true;
    }
  }

  private selectNextProxy(pool: ProxyPool, availableProxies: ProxyNode[]): ProxyNode | null {
    if (availableProxies.length === 0) return null;

    switch (pool.rotationStrategy.type) {
      case RotationStrategyType.ROUND_ROBIN:
        return this.selectRoundRobin(pool, availableProxies);

      case RotationStrategyType.RANDOM:
        return this.selectRandom(availableProxies);

      case RotationStrategyType.LEAST_USED:
        return this.selectLeastUsed(availableProxies);

      case RotationStrategyType.FASTEST:
        return this.selectFastest(availableProxies);

      case RotationStrategyType.HEALTH_BASED:
        return this.selectHealthiest(availableProxies);

      case RotationStrategyType.COST_OPTIMIZED:
        return this.selectCostOptimized(availableProxies);

      case RotationStrategyType.GEOGRAPHIC:
        return this.selectGeographic(pool, availableProxies);

      default:
        return availableProxies[0];
    }
  }

  private selectRoundRobin(pool: ProxyPool, proxies: ProxyNode[]): ProxyNode {
    const currentIndex = pool.currentProxy ? 
      proxies.findIndex(p => p.id === pool.currentProxy) : -1;
    
    const nextIndex = (currentIndex + 1) % proxies.length;
    return proxies[nextIndex];
  }

  private selectRandom(proxies: ProxyNode[]): ProxyNode {
    const randomIndex = Math.floor(Math.random() * proxies.length);
    return proxies[randomIndex];
  }

  private selectLeastUsed(proxies: ProxyNode[]): ProxyNode {
    return proxies.reduce((least, current) => 
      current.usage.totalSessions < least.usage.totalSessions ? current : least
    );
  }

  private selectFastest(proxies: ProxyNode[]): ProxyNode {
    return proxies.reduce((fastest, current) => 
      current.healthMetrics.averageResponseTime < fastest.healthMetrics.averageResponseTime ? 
      current : fastest
    );
  }

  private selectHealthiest(proxies: ProxyNode[]): ProxyNode {
    return proxies.reduce((healthiest, current) => 
      current.healthMetrics.successRate > healthiest.healthMetrics.successRate ? 
      current : healthiest
    );
  }

  private selectCostOptimized(proxies: ProxyNode[]): ProxyNode {
    return proxies.reduce((cheapest, current) => {
      const currentCost = current.cost.monthlyPrice || current.cost.pricePerGB || 0;
      const cheapestCost = cheapest.cost.monthlyPrice || cheapest.cost.pricePerGB || 0;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  private selectGeographic(pool: ProxyPool, proxies: ProxyNode[]): ProxyNode {
    const geoTargeting = pool.geoTargeting;
    
    if (!geoTargeting.enabled) {
      return this.selectRandom(proxies);
    }

    // Filter by preferred countries
    let filtered = proxies;
    if (geoTargeting.preferredCountries.length > 0) {
      filtered = filtered.filter(p => geoTargeting.preferredCountries.includes(p.country));
    }

    // Exclude countries
    if (geoTargeting.excludedCountries.length > 0) {
      filtered = filtered.filter(p => !geoTargeting.excludedCountries.includes(p.country));
    }

    return filtered.length > 0 ? this.selectRandom(filtered) : this.selectRandom(proxies);
  }

  async testProxy(proxyId: string): Promise<ProxyTestResult> {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) {
      return {
        proxyId,
        success: false,
        responseTime: 0,
        anonymityLevel: AnonymityLevel.TRANSPARENT,
        realIP: '',
        proxyIP: '',
        location: {
          country: '',
          region: '',
          city: '',
          latitude: 0,
          longitude: 0,
          timezone: ''
        },
        error: 'Proxy not found',
        timestamp: new Date()
      };
    }

    const startTime = Date.now();
    
    try {
      proxy.status = ProxyStatus.TESTING;
      
      // Test with a random endpoint
      const testEndpoint = this.testEndpoints[Math.floor(Math.random() * this.testEndpoints.length)];
      
      const response = await fetch(testEndpoint, {
        method: 'GET',
        // Note: In a real implementation, you would configure the proxy here
        // This is a simplified version
        signal: AbortSignal.timeout(10000)
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        
        // Update proxy health metrics
        proxy.healthMetrics.lastResponseTime = responseTime;
        proxy.healthMetrics.totalRequests++;
        proxy.healthMetrics.successfulRequests++;
        proxy.healthMetrics.successRate = 
          (proxy.healthMetrics.successfulRequests / proxy.healthMetrics.totalRequests) * 100;
        proxy.healthMetrics.consecutiveFailures = 0;
        
        // Update speed classification
        proxy.speed = this.classifySpeed(responseTime);
        proxy.status = ProxyStatus.ACTIVE;
        proxy.lastChecked = new Date();

        return {
          proxyId,
          success: true,
          responseTime,
          anonymityLevel: proxy.anonymityLevel,
          realIP: data.origin || data.ip || '',
          proxyIP: proxy.url,
          location: {
            country: proxy.country,
            region: proxy.region,
            city: proxy.city || '',
            latitude: 0,
            longitude: 0,
            timezone: ''
          },
          timestamp: new Date()
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update proxy health metrics for failure
      proxy.healthMetrics.totalRequests++;
      proxy.healthMetrics.failedRequests++;
      proxy.healthMetrics.consecutiveFailures++;
      proxy.healthMetrics.successRate = 
        (proxy.healthMetrics.successfulRequests / proxy.healthMetrics.totalRequests) * 100;
      
      // Mark proxy as failed if too many consecutive failures
      if (proxy.healthMetrics.consecutiveFailures >= 3) {
        proxy.status = ProxyStatus.FAILED;
      } else {
        proxy.status = ProxyStatus.INACTIVE;
      }
      
      proxy.lastChecked = new Date();

      return {
        proxyId,
        success: false,
        responseTime,
        anonymityLevel: AnonymityLevel.TRANSPARENT,
        realIP: '',
        proxyIP: proxy.url,
        location: {
          country: proxy.country,
          region: proxy.region,
          city: proxy.city || '',
          latitude: 0,
          longitude: 0,
          timezone: ''
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private classifySpeed(responseTime: number): ProxySpeed {
    if (responseTime < 500) return ProxySpeed.VERY_FAST;
    if (responseTime < 1000) return ProxySpeed.FAST;
    if (responseTime < 3000) return ProxySpeed.MEDIUM;
    return ProxySpeed.SLOW;
  }

  private startPoolHealthChecks(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    const intervalMs = pool.healthCheckInterval * 60 * 1000;
    
    const healthCheckTimer = setInterval(async () => {
      await this.performPoolHealthCheck(poolId);
    }, intervalMs);

    this.healthCheckIntervals.set(poolId, healthCheckTimer);
  }

  private stopPoolHealthChecks(poolId: string): void {
    const timer = this.healthCheckIntervals.get(poolId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckIntervals.delete(poolId);
    }
  }

  private startPoolRotation(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    const interval = pool.rotationStrategy.parameters.interval;
    if (!interval) return;

    const intervalMs = interval * 60 * 1000;
    
    const rotationTimer = setInterval(async () => {
      await this.rotateProxy(poolId, 'Scheduled rotation');
    }, intervalMs);

    this.rotationTimers.set(poolId, rotationTimer);
  }

  private stopPoolRotation(poolId: string): void {
    const timer = this.rotationTimers.get(poolId);
    if (timer) {
      clearInterval(timer);
      this.rotationTimers.delete(poolId);
    }
  }

  private async performPoolHealthCheck(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    const testPromises = pool.proxies.map(proxyId => this.testProxy(proxyId));
    await Promise.all(testPromises);
    
    this.updatePoolStatistics(poolId);
  }

  private updatePoolStatistics(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    const proxies = pool.proxies
      .map(id => this.proxies.get(id))
      .filter((proxy): proxy is ProxyNode => proxy !== undefined);

    const activeProxies = proxies.filter(p => p.status === ProxyStatus.ACTIVE);
    
    pool.statistics = {
      totalProxies: proxies.length,
      activeProxies: activeProxies.length,
      averageHealth: proxies.length > 0 ? 
        proxies.reduce((sum, p) => sum + p.healthMetrics.successRate, 0) / proxies.length : 0,
      averageSpeed: proxies.length > 0 ? 
        proxies.reduce((sum, p) => sum + p.healthMetrics.averageResponseTime, 0) / proxies.length : 0,
      totalRequests: proxies.reduce((sum, p) => sum + p.healthMetrics.totalRequests, 0),
      successfulRequests: proxies.reduce((sum, p) => sum + p.healthMetrics.successfulRequests, 0),
      failedRequests: proxies.reduce((sum, p) => sum + p.healthMetrics.failedRequests, 0),
      totalDataTransferred: proxies.reduce((sum, p) => sum + p.usage.totalDataTransferred, 0),
      averageCost: proxies.length > 0 ? 
        proxies.reduce((sum, p) => sum + (p.cost.monthlyPrice || 0), 0) / proxies.length : 0,
      lastUpdated: new Date()
    };
  }

  getCurrentProxy(poolId: string): ProxyNode | null {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.currentProxy) return null;

    return this.proxies.get(pool.currentProxy) || null;
  }

  getProxyByCountry(country: string): ProxyNode[] {
    return Array.from(this.proxies.values())
      .filter(proxy => proxy.country.toLowerCase() === country.toLowerCase());
  }

  getProxyByProvider(provider: string): ProxyNode[] {
    return Array.from(this.proxies.values())
      .filter(proxy => proxy.provider.toLowerCase() === provider.toLowerCase());
  }

  getRotationHistory(poolId?: string, limit: number = 100): RotationEvent[] {
    let history = this.rotationHistory;
    
    if (poolId) {
      history = history.filter(event => event.poolId === poolId);
    }

    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async optimizeProxyPools(): Promise<void> {
    // Analyze performance and adjust pool configurations
    for (const [poolId, pool] of this.pools) {
      const recentEvents = this.rotationHistory
        .filter(e => e.poolId === poolId)
        .slice(-100);

      if (recentEvents.length === 0) continue;

      const successRate = recentEvents.filter(e => e.success).length / recentEvents.length;
      const averageResponseTime = recentEvents
        .filter(e => e.responseTime)
        .reduce((sum, e) => sum + (e.responseTime || 0), 0) / recentEvents.length;

      // Adjust health check interval based on success rate
      if (successRate < 0.8) {
        pool.healthCheckInterval = Math.max(1, pool.healthCheckInterval - 1);
      } else if (successRate > 0.95) {
        pool.healthCheckInterval = Math.min(30, pool.healthCheckInterval + 1);
      }

      // Adjust rotation interval based on performance
      if (averageResponseTime > 2000 && pool.rotationStrategy.parameters.interval) {
        pool.rotationStrategy.parameters.interval = Math.max(5, 
          pool.rotationStrategy.parameters.interval - 5);
      }
    }
  }

  cleanup(): void {
    // Stop all timers
    this.healthCheckIntervals.forEach((timer, poolId) => {
      clearInterval(timer);
    });
    this.healthCheckIntervals.clear();

    this.rotationTimers.forEach((timer, poolId) => {
      clearInterval(timer);
    });
    this.rotationTimers.clear();

    // Clean up old rotation history
    if (this.rotationHistory.length > 10000) {
      this.rotationHistory = this.rotationHistory
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10000);
    }

    // Reset proxy connection counts
    this.proxies.forEach(proxy => {
      proxy.currentConnections = 0;
    });
  }
}