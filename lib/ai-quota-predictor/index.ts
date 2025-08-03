// AI Quota Prediction Service for FreebeeZ
// Predicts and manages API quotas across different AI services

export interface AIServiceQuota {
  serviceId: string;
  serviceName: string;
  quotaType: 'requests' | 'tokens' | 'credits' | 'compute_time';
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  resetPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly';
  resetTime: Date;
  costPerUnit?: number;
  currency?: string;
  lastUpdated: Date;
}

export interface QuotaPrediction {
  serviceId: string;
  predictedUsage: number;
  timeframe: 'hour' | 'day' | 'week' | 'month';
  confidence: number; // 0-1
  factors: PredictionFactor[];
  recommendations: string[];
  estimatedCost?: number;
  quotaExhaustionTime?: Date;
}

export interface PredictionFactor {
  name: string;
  impact: number; // -1 to 1
  description: string;
}

export interface UsagePattern {
  serviceId: string;
  timestamp: Date;
  usage: number;
  operation: string;
  success: boolean;
  responseTime: number;
  cost?: number;
}

export interface AIServiceConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  quotaEndpoint?: string;
  quotaHeaders?: Record<string, string>;
  quotaParser?: (response: any) => AIServiceQuota;
  costCalculator?: (usage: number, operation: string) => number;
  rateLimits: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    tokensPerMinute?: number;
    tokensPerHour?: number;
    tokensPerDay?: number;
  };
}

export class AIQuotaPredictor {
  private quotas: Map<string, AIServiceQuota> = new Map();
  private usageHistory: Map<string, UsagePattern[]> = new Map();
  private serviceConfigs: Map<string, AIServiceConfig> = new Map();
  private predictionCache: Map<string, QuotaPrediction> = new Map();
  private cacheExpiry: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultServices();
  }

  private initializeDefaultServices(): void {
    // OpenAI
    this.addServiceConfig({
      id: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || '',
      quotaEndpoint: '/usage',
      rateLimits: {
        requestsPerMinute: 3500,
        tokensPerMinute: 90000,
        requestsPerDay: 10000
      },
      costCalculator: (usage, operation) => {
        const costs: Record<string, number> = {
          'gpt-4': 0.03,
          'gpt-3.5-turbo': 0.002,
          'text-embedding-ada-002': 0.0001
        };
        return (usage / 1000) * (costs[operation] || 0.002);
      }
    });

    // Anthropic Claude
    this.addServiceConfig({
      id: 'anthropic',
      name: 'Anthropic Claude',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 40000,
        requestsPerDay: 5000
      },
      costCalculator: (usage, operation) => {
        return (usage / 1000) * 0.008; // Approximate cost per 1K tokens
      }
    });

    // Google Gemini
    this.addServiceConfig({
      id: 'google-gemini',
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1',
      apiKey: process.env.GOOGLE_API_KEY || '',
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerDay: 1500
      },
      costCalculator: (usage, operation) => {
        return (usage / 1000) * 0.001; // Free tier, minimal cost
      }
    });

    // Hugging Face
    this.addServiceConfig({
      id: 'huggingface',
      name: 'Hugging Face',
      baseUrl: 'https://api-inference.huggingface.co',
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      rateLimits: {
        requestsPerMinute: 30,
        requestsPerHour: 1000
      },
      costCalculator: (usage, operation) => {
        return usage * 0.0001; // Very low cost for inference API
      }
    });

    // Cohere
    this.addServiceConfig({
      id: 'cohere',
      name: 'Cohere',
      baseUrl: 'https://api.cohere.ai/v1',
      apiKey: process.env.COHERE_API_KEY || '',
      rateLimits: {
        requestsPerMinute: 100,
        requestsPerDay: 5000
      },
      costCalculator: (usage, operation) => {
        return (usage / 1000) * 0.002;
      }
    });
  }

  addServiceConfig(config: AIServiceConfig): void {
    this.serviceConfigs.set(config.id, config);
  }

  async updateQuota(serviceId: string): Promise<AIServiceQuota | null> {
    const config = this.serviceConfigs.get(serviceId);
    if (!config) {
      throw new Error(`Service configuration not found for ${serviceId}`);
    }

    try {
      let quota: AIServiceQuota;

      if (config.quotaEndpoint && config.apiKey) {
        // Fetch quota from API
        const response = await fetch(`${config.baseUrl}${config.quotaEndpoint}`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            ...config.quotaHeaders
          }
        });

        if (response.ok) {
          const data = await response.json();
          quota = config.quotaParser ? config.quotaParser(data) : this.parseGenericQuota(serviceId, data);
        } else {
          // Fallback to estimated quota based on rate limits
          quota = this.estimateQuotaFromRateLimits(serviceId, config);
        }
      } else {
        // Use rate limits as quota estimation
        quota = this.estimateQuotaFromRateLimits(serviceId, config);
      }

      this.quotas.set(serviceId, quota);
      return quota;

    } catch (error) {
      console.error(`Failed to update quota for ${serviceId}:`, error);
      return null;
    }
  }

  private parseGenericQuota(serviceId: string, data: any): AIServiceQuota {
    const config = this.serviceConfigs.get(serviceId)!;
    
    return {
      serviceId,
      serviceName: config.name,
      quotaType: 'requests',
      totalQuota: data.total_quota || data.limit || 10000,
      usedQuota: data.used_quota || data.usage || 0,
      remainingQuota: (data.total_quota || 10000) - (data.used_quota || 0),
      resetPeriod: 'daily',
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastUpdated: new Date()
    };
  }

  private estimateQuotaFromRateLimits(serviceId: string, config: AIServiceConfig): AIServiceQuota {
    const dailyLimit = config.rateLimits.requestsPerDay || 
                      (config.rateLimits.requestsPerHour || 100) * 24 ||
                      (config.rateLimits.requestsPerMinute || 10) * 24 * 60;

    const usage = this.getRecentUsage(serviceId, 'day');

    return {
      serviceId,
      serviceName: config.name,
      quotaType: 'requests',
      totalQuota: dailyLimit,
      usedQuota: usage,
      remainingQuota: dailyLimit - usage,
      resetPeriod: 'daily',
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastUpdated: new Date()
    };
  }

  recordUsage(serviceId: string, usage: number, operation: string, success: boolean, responseTime: number): void {
    const pattern: UsagePattern = {
      serviceId,
      timestamp: new Date(),
      usage,
      operation,
      success,
      responseTime,
      cost: this.calculateCost(serviceId, usage, operation)
    };

    if (!this.usageHistory.has(serviceId)) {
      this.usageHistory.set(serviceId, []);
    }

    const history = this.usageHistory.get(serviceId)!;
    history.push(pattern);

    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.usageHistory.set(
      serviceId,
      history.filter(p => p.timestamp > thirtyDaysAgo)
    );

    // Update quota
    const quota = this.quotas.get(serviceId);
    if (quota) {
      quota.usedQuota += usage;
      quota.remainingQuota = Math.max(0, quota.totalQuota - quota.usedQuota);
      quota.lastUpdated = new Date();
    }

    // Invalidate prediction cache
    this.predictionCache.delete(serviceId);
    this.cacheExpiry.delete(serviceId);
  }

  private calculateCost(serviceId: string, usage: number, operation: string): number {
    const config = this.serviceConfigs.get(serviceId);
    if (config?.costCalculator) {
      return config.costCalculator(usage, operation);
    }
    return 0;
  }

  private getRecentUsage(serviceId: string, period: 'hour' | 'day' | 'week' | 'month'): number {
    const history = this.usageHistory.get(serviceId) || [];
    const now = new Date();
    let cutoff: Date;

    switch (period) {
      case 'hour':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return history
      .filter(p => p.timestamp > cutoff)
      .reduce((sum, p) => sum + p.usage, 0);
  }

  async predictUsage(serviceId: string, timeframe: 'hour' | 'day' | 'week' | 'month'): Promise<QuotaPrediction> {
    const cacheKey = `${serviceId}_${timeframe}`;
    const cached = this.predictionCache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey);

    if (cached && expiry && expiry > new Date()) {
      return cached;
    }

    const history = this.usageHistory.get(serviceId) || [];
    if (history.length < 10) {
      // Not enough data for prediction
      return {
        serviceId,
        predictedUsage: 0,
        timeframe,
        confidence: 0.1,
        factors: [{ name: 'Insufficient Data', impact: -0.9, description: 'Not enough historical data for accurate prediction' }],
        recommendations: ['Collect more usage data before making predictions']
      };
    }

    const prediction = this.calculatePrediction(serviceId, timeframe, history);
    
    // Cache for 1 hour
    this.predictionCache.set(cacheKey, prediction);
    this.cacheExpiry.set(cacheKey, new Date(Date.now() + 60 * 60 * 1000));

    return prediction;
  }

  private calculatePrediction(serviceId: string, timeframe: string, history: UsagePattern[]): QuotaPrediction {
    const now = new Date();
    const factors: PredictionFactor[] = [];
    let confidence = 0.5;

    // Calculate base usage trend
    const recentUsage = this.getRecentUsage(serviceId, timeframe as any);
    const previousPeriodUsage = this.getPreviousPeriodUsage(serviceId, timeframe, history);
    
    const trend = previousPeriodUsage > 0 ? (recentUsage - previousPeriodUsage) / previousPeriodUsage : 0;
    
    factors.push({
      name: 'Usage Trend',
      impact: Math.min(Math.max(trend, -1), 1),
      description: `Usage ${trend > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(trend * 100).toFixed(1)}%`
    });

    // Time-based patterns
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    
    const hourlyPattern = this.analyzeHourlyPattern(history, hourOfDay);
    factors.push({
      name: 'Time of Day',
      impact: hourlyPattern.impact,
      description: hourlyPattern.description
    });

    const weeklyPattern = this.analyzeWeeklyPattern(history, dayOfWeek);
    factors.push({
      name: 'Day of Week',
      impact: weeklyPattern.impact,
      description: weeklyPattern.description
    });

    // Success rate impact
    const successRate = this.calculateSuccessRate(history);
    if (successRate < 0.9) {
      factors.push({
        name: 'Error Rate',
        impact: (successRate - 0.9) * 2, // Negative impact for low success rate
        description: `${((1 - successRate) * 100).toFixed(1)}% error rate may increase retry usage`
      });
    }

    // Calculate predicted usage
    let predictedUsage = recentUsage;
    
    // Apply factors
    factors.forEach(factor => {
      predictedUsage *= (1 + factor.impact * 0.1); // Each factor can adjust by up to 10%
    });

    // Adjust confidence based on data quality
    confidence = Math.min(0.95, 0.3 + (history.length / 1000) * 0.5);

    // Generate recommendations
    const recommendations = this.generateRecommendations(serviceId, predictedUsage, factors);

    // Calculate quota exhaustion time
    const quota = this.quotas.get(serviceId);
    let quotaExhaustionTime: Date | undefined;
    if (quota && predictedUsage > 0) {
      const hoursToExhaustion = quota.remainingQuota / (predictedUsage / this.getTimeframeHours(timeframe));
      quotaExhaustionTime = new Date(now.getTime() + hoursToExhaustion * 60 * 60 * 1000);
    }

    // Calculate estimated cost
    const config = this.serviceConfigs.get(serviceId);
    const estimatedCost = config?.costCalculator ? config.costCalculator(predictedUsage, 'average') : undefined;

    return {
      serviceId,
      predictedUsage: Math.round(predictedUsage),
      timeframe: timeframe as any,
      confidence,
      factors,
      recommendations,
      estimatedCost,
      quotaExhaustionTime
    };
  }

  private getPreviousPeriodUsage(serviceId: string, timeframe: string, history: UsagePattern[]): number {
    const now = new Date();
    let startTime: Date, endTime: Date;

    const hours = this.getTimeframeHours(timeframe);
    endTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    return history
      .filter(p => p.timestamp >= startTime && p.timestamp < endTime)
      .reduce((sum, p) => sum + p.usage, 0);
  }

  private getTimeframeHours(timeframe: string): number {
    switch (timeframe) {
      case 'hour': return 1;
      case 'day': return 24;
      case 'week': return 24 * 7;
      case 'month': return 24 * 30;
      default: return 24;
    }
  }

  private analyzeHourlyPattern(history: UsagePattern[], currentHour: number): { impact: number; description: string } {
    const hourlyUsage = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    history.forEach(p => {
      const hour = p.timestamp.getHours();
      hourlyUsage[hour] += p.usage;
      hourlyCounts[hour]++;
    });

    const averageUsage = hourlyUsage.reduce((sum, usage, i) => 
      sum + (hourlyCounts[i] > 0 ? usage / hourlyCounts[i] : 0), 0) / 24;
    
    const currentHourAverage = hourlyCounts[currentHour] > 0 ? 
      hourlyUsage[currentHour] / hourlyCounts[currentHour] : averageUsage;

    const impact = averageUsage > 0 ? (currentHourAverage - averageUsage) / averageUsage : 0;

    return {
      impact: Math.min(Math.max(impact, -0.5), 0.5),
      description: `Hour ${currentHour} typically has ${impact > 0 ? 'higher' : 'lower'} usage`
    };
  }

  private analyzeWeeklyPattern(history: UsagePattern[], currentDay: number): { impact: number; description: string } {
    const dailyUsage = new Array(7).fill(0);
    const dailyCounts = new Array(7).fill(0);

    history.forEach(p => {
      const day = p.timestamp.getDay();
      dailyUsage[day] += p.usage;
      dailyCounts[day]++;
    });

    const averageUsage = dailyUsage.reduce((sum, usage, i) => 
      sum + (dailyCounts[i] > 0 ? usage / dailyCounts[i] : 0), 0) / 7;
    
    const currentDayAverage = dailyCounts[currentDay] > 0 ? 
      dailyUsage[currentDay] / dailyCounts[currentDay] : averageUsage;

    const impact = averageUsage > 0 ? (currentDayAverage - averageUsage) / averageUsage : 0;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      impact: Math.min(Math.max(impact, -0.3), 0.3),
      description: `${dayNames[currentDay]} typically has ${impact > 0 ? 'higher' : 'lower'} usage`
    };
  }

  private calculateSuccessRate(history: UsagePattern[]): number {
    if (history.length === 0) return 1;
    
    const successful = history.filter(p => p.success).length;
    return successful / history.length;
  }

  private generateRecommendations(serviceId: string, predictedUsage: number, factors: PredictionFactor[]): string[] {
    const recommendations: string[] = [];
    const quota = this.quotas.get(serviceId);

    if (quota && predictedUsage > quota.remainingQuota * 0.8) {
      recommendations.push('Consider upgrading quota or optimizing usage - approaching limit');
    }

    const errorFactor = factors.find(f => f.name === 'Error Rate');
    if (errorFactor && errorFactor.impact < -0.1) {
      recommendations.push('High error rate detected - investigate API issues or implement better error handling');
    }

    const trendFactor = factors.find(f => f.name === 'Usage Trend');
    if (trendFactor && trendFactor.impact > 0.2) {
      recommendations.push('Usage increasing rapidly - monitor closely and consider scaling');
    }

    if (recommendations.length === 0) {
      recommendations.push('Usage patterns look normal - continue monitoring');
    }

    return recommendations;
  }

  async getAllQuotas(): Promise<AIServiceQuota[]> {
    const quotas: AIServiceQuota[] = [];
    
    for (const serviceId of this.serviceConfigs.keys()) {
      const quota = await this.updateQuota(serviceId);
      if (quota) {
        quotas.push(quota);
      }
    }

    return quotas;
  }

  async getAllPredictions(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<QuotaPrediction[]> {
    const predictions: QuotaPrediction[] = [];
    
    for (const serviceId of this.serviceConfigs.keys()) {
      const prediction = await this.predictUsage(serviceId, timeframe);
      predictions.push(prediction);
    }

    return predictions;
  }

  getUsageHistory(serviceId: string, days: number = 7): UsagePattern[] {
    const history = this.usageHistory.get(serviceId) || [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return history.filter(p => p.timestamp > cutoff);
  }

  async optimizeUsage(serviceId: string): Promise<string[]> {
    const suggestions: string[] = [];
    const history = this.usageHistory.get(serviceId) || [];
    const quota = this.quotas.get(serviceId);

    if (history.length === 0) {
      return ['No usage data available for optimization'];
    }

    // Analyze response times
    const avgResponseTime = history.reduce((sum, p) => sum + p.responseTime, 0) / history.length;
    if (avgResponseTime > 5000) {
      suggestions.push('Consider caching responses or using faster endpoints - high response times detected');
    }

    // Analyze error patterns
    const errorRate = 1 - this.calculateSuccessRate(history);
    if (errorRate > 0.1) {
      suggestions.push('Implement exponential backoff and better error handling - high error rate detected');
    }

    // Analyze usage patterns
    const peakHours = this.findPeakUsageHours(history);
    if (peakHours.length > 0) {
      suggestions.push(`Consider load balancing - peak usage detected at hours: ${peakHours.join(', ')}`);
    }

    // Quota utilization
    if (quota && quota.usedQuota / quota.totalQuota > 0.9) {
      suggestions.push('Quota utilization high - consider request batching or alternative services');
    }

    return suggestions.length > 0 ? suggestions : ['Usage patterns appear optimal'];
  }

  private findPeakUsageHours(history: UsagePattern[]): number[] {
    const hourlyUsage = new Array(24).fill(0);
    
    history.forEach(p => {
      hourlyUsage[p.timestamp.getHours()] += p.usage;
    });

    const avgUsage = hourlyUsage.reduce((sum, usage) => sum + usage, 0) / 24;
    const peakThreshold = avgUsage * 1.5;

    return hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .filter(({ usage }) => usage > peakThreshold)
      .map(({ hour }) => hour);
  }
}