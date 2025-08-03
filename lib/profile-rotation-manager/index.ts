// Profile Rotation Manager for FreebeeZ
// Manages multiple user profiles with intelligent rotation strategies

import { BrowserProfile } from '../browser-automation';

export interface UserProfile {
  id: string;
  name: string;
  personalInfo: PersonalInfo;
  credentials: ProfileCredentials;
  browserProfile: BrowserProfile;
  preferences: ProfilePreferences;
  usage: ProfileUsage;
  riskScore: number; // 0-100, higher = more risky
  status: ProfileStatus;
  tags: string[];
  createdAt: Date;
  lastUsed: Date;
  expiresAt?: Date;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: Date;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  address: Address;
  nationality: string;
  occupation?: string;
  interests: string[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ProfileCredentials {
  primaryEmail: string;
  emailVariations: string[];
  password: string;
  passwordHint: string;
  recoveryQuestions: RecoveryQuestion[];
  backupEmails: string[];
  phoneNumbers: string[];
}

export interface RecoveryQuestion {
  question: string;
  answer: string;
}

export interface ProfilePreferences {
  timezone: string;
  language: string;
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
  security: boolean;
}

export interface ProfileUsage {
  totalSessions: number;
  successfulRegistrations: number;
  failedRegistrations: number;
  lastServiceUsed?: string;
  servicesUsed: string[];
  averageSessionDuration: number;
  totalUsageTime: number;
  suspiciousActivity: SuspiciousActivity[];
}

export interface SuspiciousActivity {
  timestamp: Date;
  activity: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  resolved: boolean;
}

export enum ProfileStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  COMPROMISED = 'compromised',
  EXPIRED = 'expired',
  QUARANTINED = 'quarantined'
}

export interface RotationStrategy {
  id: string;
  name: string;
  description: string;
  type: RotationType;
  parameters: RotationParameters;
  conditions: RotationCondition[];
  isActive: boolean;
}

export enum RotationType {
  TIME_BASED = 'time_based',           // Rotate after X time
  USAGE_BASED = 'usage_based',         // Rotate after X uses
  SERVICE_BASED = 'service_based',     // Different profile per service
  RISK_BASED = 'risk_based',           // Rotate when risk score high
  RANDOM = 'random',                   // Random rotation
  GEOGRAPHIC = 'geographic',           // Rotate based on location
  BEHAVIORAL = 'behavioral'            // Rotate based on behavior patterns
}

export interface RotationParameters {
  interval?: number;                   // For time-based (minutes)
  maxUsage?: number;                   // For usage-based
  riskThreshold?: number;              // For risk-based (0-100)
  randomProbability?: number;          // For random (0-1)
  cooldownPeriod?: number;             // Minutes before profile can be reused
  maxConcurrentProfiles?: number;      // Max profiles active at once
  profileLifetime?: number;            // Max profile age in days
}

export interface RotationCondition {
  type: 'time' | 'usage' | 'risk' | 'service' | 'location' | 'custom';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
  description: string;
}

export interface ProfilePool {
  id: string;
  name: string;
  description: string;
  profiles: string[]; // Profile IDs
  strategy: RotationStrategy;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  lastRotation: Date;
  currentProfile?: string;
}

export interface RotationEvent {
  id: string;
  timestamp: Date;
  poolId: string;
  previousProfileId?: string;
  newProfileId: string;
  reason: string;
  strategy: string;
  success: boolean;
  error?: string;
}

export class ProfileRotationManager {
  private profiles: Map<string, UserProfile> = new Map();
  private pools: Map<string, ProfilePool> = new Map();
  private strategies: Map<string, RotationStrategy> = new Map();
  private rotationHistory: RotationEvent[] = [];
  private activeRotations: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    // Time-based rotation strategy
    this.addStrategy({
      id: 'hourly_rotation',
      name: 'Hourly Rotation',
      description: 'Rotate profiles every hour',
      type: RotationType.TIME_BASED,
      parameters: {
        interval: 60, // 60 minutes
        cooldownPeriod: 30,
        maxConcurrentProfiles: 3
      },
      conditions: [],
      isActive: true
    });

    // Usage-based rotation strategy
    this.addStrategy({
      id: 'usage_rotation',
      name: 'Usage-Based Rotation',
      description: 'Rotate after 5 service registrations',
      type: RotationType.USAGE_BASED,
      parameters: {
        maxUsage: 5,
        cooldownPeriod: 60,
        maxConcurrentProfiles: 5
      },
      conditions: [],
      isActive: true
    });

    // Risk-based rotation strategy
    this.addStrategy({
      id: 'risk_rotation',
      name: 'Risk-Based Rotation',
      description: 'Rotate when risk score exceeds 70',
      type: RotationType.RISK_BASED,
      parameters: {
        riskThreshold: 70,
        cooldownPeriod: 120,
        maxConcurrentProfiles: 2
      },
      conditions: [],
      isActive: true
    });

    // Service-based rotation strategy
    this.addStrategy({
      id: 'service_rotation',
      name: 'Service-Based Rotation',
      description: 'Use different profile for each service category',
      type: RotationType.SERVICE_BASED,
      parameters: {
        cooldownPeriod: 15,
        maxConcurrentProfiles: 10
      },
      conditions: [],
      isActive: true
    });

    // Random rotation strategy
    this.addStrategy({
      id: 'random_rotation',
      name: 'Random Rotation',
      description: 'Random profile rotation with 20% probability',
      type: RotationType.RANDOM,
      parameters: {
        randomProbability: 0.2,
        cooldownPeriod: 45,
        maxConcurrentProfiles: 4
      },
      conditions: [],
      isActive: false
    });
  }

  addProfile(profile: UserProfile): void {
    this.profiles.set(profile.id, profile);
  }

  removeProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    // Remove from all pools
    this.pools.forEach(pool => {
      pool.profiles = pool.profiles.filter(id => id !== profileId);
    });

    return this.profiles.delete(profileId);
  }

  getProfile(profileId: string): UserProfile | undefined {
    return this.profiles.get(profileId);
  }

  getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  getActiveProfiles(): UserProfile[] {
    return Array.from(this.profiles.values())
      .filter(profile => profile.status === ProfileStatus.ACTIVE);
  }

  addStrategy(strategy: RotationStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  removeStrategy(strategyId: string): boolean {
    return this.strategies.delete(strategyId);
  }

  getStrategy(strategyId: string): RotationStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  createPool(pool: Omit<ProfilePool, 'createdAt' | 'lastRotation'>): ProfilePool {
    const fullPool: ProfilePool = {
      ...pool,
      createdAt: new Date(),
      lastRotation: new Date(0)
    };

    this.pools.set(pool.id, fullPool);
    
    if (pool.isActive) {
      this.startPoolRotation(pool.id);
    }

    return fullPool;
  }

  removePool(poolId: string): boolean {
    this.stopPoolRotation(poolId);
    return this.pools.delete(poolId);
  }

  getPool(poolId: string): ProfilePool | undefined {
    return this.pools.get(poolId);
  }

  getAllPools(): ProfilePool[] {
    return Array.from(this.pools.values());
  }

  addProfileToPool(poolId: string, profileId: string): boolean {
    const pool = this.pools.get(poolId);
    const profile = this.profiles.get(profileId);

    if (!pool || !profile) return false;

    if (!pool.profiles.includes(profileId)) {
      pool.profiles.push(profileId);
    }

    return true;
  }

  removeProfileFromPool(poolId: string, profileId: string): boolean {
    const pool = this.pools.get(poolId);
    if (!pool) return false;

    pool.profiles = pool.profiles.filter(id => id !== profileId);
    
    if (pool.currentProfile === profileId) {
      pool.currentProfile = undefined;
    }

    return true;
  }

  async rotateProfile(poolId: string, reason?: string): Promise<UserProfile | null> {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.isActive) return null;

    const strategy = this.strategies.get(pool.strategy.id);
    if (!strategy || !strategy.isActive) return null;

    const availableProfiles = this.getAvailableProfiles(pool);
    if (availableProfiles.length === 0) return null;

    const newProfile = this.selectNextProfile(pool, availableProfiles, strategy);
    if (!newProfile) return null;

    const previousProfileId = pool.currentProfile;
    pool.currentProfile = newProfile.id;
    pool.lastRotation = new Date();

    // Record rotation event
    const rotationEvent: RotationEvent = {
      id: `rotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      poolId,
      previousProfileId,
      newProfileId: newProfile.id,
      reason: reason || `Automatic rotation (${strategy.name})`,
      strategy: strategy.id,
      success: true
    };

    this.rotationHistory.push(rotationEvent);

    // Update profile usage
    newProfile.lastUsed = new Date();
    newProfile.usage.totalSessions++;

    // Update risk scores
    this.updateRiskScores(poolId, newProfile.id);

    return newProfile;
  }

  private getAvailableProfiles(pool: ProfilePool): UserProfile[] {
    const now = new Date();
    const cooldownMs = (pool.strategy.parameters.cooldownPeriod || 30) * 60 * 1000;

    return pool.profiles
      .map(id => this.profiles.get(id))
      .filter((profile): profile is UserProfile => {
        if (!profile) return false;
        if (profile.status !== ProfileStatus.ACTIVE) return false;
        if (profile.expiresAt && profile.expiresAt < now) return false;
        
        // Check cooldown period
        const timeSinceLastUse = now.getTime() - profile.lastUsed.getTime();
        if (timeSinceLastUse < cooldownMs) return false;

        return true;
      });
  }

  private selectNextProfile(pool: ProfilePool, availableProfiles: UserProfile[], strategy: RotationStrategy): UserProfile | null {
    if (availableProfiles.length === 0) return null;

    switch (strategy.type) {
      case RotationType.TIME_BASED:
      case RotationType.USAGE_BASED:
        return this.selectLeastUsedProfile(availableProfiles);

      case RotationType.RISK_BASED:
        return this.selectLowestRiskProfile(availableProfiles);

      case RotationType.RANDOM:
        return this.selectRandomProfile(availableProfiles);

      case RotationType.SERVICE_BASED:
        return this.selectServiceSpecificProfile(availableProfiles, pool);

      case RotationType.GEOGRAPHIC:
        return this.selectGeographicProfile(availableProfiles);

      case RotationType.BEHAVIORAL:
        return this.selectBehavioralProfile(availableProfiles);

      default:
        return availableProfiles[0];
    }
  }

  private selectLeastUsedProfile(profiles: UserProfile[]): UserProfile {
    return profiles.reduce((least, current) => 
      current.usage.totalSessions < least.usage.totalSessions ? current : least
    );
  }

  private selectLowestRiskProfile(profiles: UserProfile[]): UserProfile {
    return profiles.reduce((lowest, current) => 
      current.riskScore < lowest.riskScore ? current : lowest
    );
  }

  private selectRandomProfile(profiles: UserProfile[]): UserProfile {
    const randomIndex = Math.floor(Math.random() * profiles.length);
    return profiles[randomIndex];
  }

  private selectServiceSpecificProfile(profiles: UserProfile[], pool: ProfilePool): UserProfile {
    // This would be enhanced with service-specific logic
    // For now, select based on least usage for the service category
    return this.selectLeastUsedProfile(profiles);
  }

  private selectGeographicProfile(profiles: UserProfile[]): UserProfile {
    // Select profile based on geographic diversity
    // For now, select randomly
    return this.selectRandomProfile(profiles);
  }

  private selectBehavioralProfile(profiles: UserProfile[]): UserProfile {
    // Select profile based on behavioral patterns
    // For now, select least used
    return this.selectLeastUsedProfile(profiles);
  }

  private updateRiskScores(poolId: string, newProfileId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    // Increase risk score for frequently used profiles
    pool.profiles.forEach(profileId => {
      const profile = this.profiles.get(profileId);
      if (!profile) return;

      if (profileId === newProfileId) {
        // Slight increase for current profile
        profile.riskScore = Math.min(100, profile.riskScore + 1);
      } else {
        // Slight decrease for unused profiles
        profile.riskScore = Math.max(0, profile.riskScore - 0.5);
      }
    });
  }

  startPoolRotation(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.isActive) return;

    const strategy = this.strategies.get(pool.strategy.id);
    if (!strategy || !strategy.isActive) return;

    // Clear existing rotation
    this.stopPoolRotation(poolId);

    if (strategy.type === RotationType.TIME_BASED && strategy.parameters.interval) {
      const intervalMs = strategy.parameters.interval * 60 * 1000;
      
      const rotationTimer = setInterval(async () => {
        await this.rotateProfile(poolId, 'Scheduled rotation');
      }, intervalMs);

      this.activeRotations.set(poolId, rotationTimer);
    }
  }

  stopPoolRotation(poolId: string): void {
    const timer = this.activeRotations.get(poolId);
    if (timer) {
      clearInterval(timer);
      this.activeRotations.delete(poolId);
    }
  }

  async shouldRotate(poolId: string, context?: any): Promise<boolean> {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.isActive) return false;

    const strategy = this.strategies.get(pool.strategy.id);
    if (!strategy || !strategy.isActive) return false;

    const currentProfile = pool.currentProfile ? this.profiles.get(pool.currentProfile) : null;
    if (!currentProfile) return true; // No current profile, should rotate

    switch (strategy.type) {
      case RotationType.USAGE_BASED:
        return this.shouldRotateByUsage(currentProfile, strategy);

      case RotationType.RISK_BASED:
        return this.shouldRotateByRisk(currentProfile, strategy);

      case RotationType.RANDOM:
        return this.shouldRotateRandomly(strategy);

      case RotationType.SERVICE_BASED:
        return this.shouldRotateByService(currentProfile, context);

      case RotationType.TIME_BASED:
        return this.shouldRotateByTime(pool, strategy);

      default:
        return false;
    }
  }

  private shouldRotateByUsage(profile: UserProfile, strategy: RotationStrategy): boolean {
    const maxUsage = strategy.parameters.maxUsage || 10;
    return profile.usage.totalSessions >= maxUsage;
  }

  private shouldRotateByRisk(profile: UserProfile, strategy: RotationStrategy): boolean {
    const riskThreshold = strategy.parameters.riskThreshold || 70;
    return profile.riskScore >= riskThreshold;
  }

  private shouldRotateRandomly(strategy: RotationStrategy): boolean {
    const probability = strategy.parameters.randomProbability || 0.1;
    return Math.random() < probability;
  }

  private shouldRotateByService(profile: UserProfile, context: any): boolean {
    if (!context?.serviceCategory) return false;
    
    // Check if profile has been used for this service category recently
    const recentServices = profile.usage.servicesUsed.slice(-5);
    return recentServices.includes(context.serviceCategory);
  }

  private shouldRotateByTime(pool: ProfilePool, strategy: RotationStrategy): boolean {
    const intervalMs = (strategy.parameters.interval || 60) * 60 * 1000;
    const timeSinceLastRotation = Date.now() - pool.lastRotation.getTime();
    return timeSinceLastRotation >= intervalMs;
  }

  getCurrentProfile(poolId: string): UserProfile | null {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.currentProfile) return null;

    return this.profiles.get(pool.currentProfile) || null;
  }

  recordProfileUsage(profileId: string, serviceId: string, success: boolean, duration: number): void {
    const profile = this.profiles.get(profileId);
    if (!profile) return;

    profile.usage.lastServiceUsed = serviceId;
    
    if (!profile.usage.servicesUsed.includes(serviceId)) {
      profile.usage.servicesUsed.push(serviceId);
    }

    if (success) {
      profile.usage.successfulRegistrations++;
    } else {
      profile.usage.failedRegistrations++;
      // Increase risk score for failures
      profile.riskScore = Math.min(100, profile.riskScore + 5);
    }

    profile.usage.totalUsageTime += duration;
    profile.usage.averageSessionDuration = profile.usage.totalUsageTime / profile.usage.totalSessions;
    profile.lastUsed = new Date();
  }

  flagSuspiciousActivity(profileId: string, activity: string, severity: 'low' | 'medium' | 'high', description: string): void {
    const profile = this.profiles.get(profileId);
    if (!profile) return;

    const suspiciousActivity: SuspiciousActivity = {
      timestamp: new Date(),
      activity,
      severity,
      description,
      resolved: false
    };

    profile.usage.suspiciousActivity.push(suspiciousActivity);

    // Increase risk score based on severity
    const riskIncrease = { low: 5, medium: 15, high: 30 }[severity];
    profile.riskScore = Math.min(100, profile.riskScore + riskIncrease);

    // Suspend profile if risk is too high
    if (profile.riskScore >= 90) {
      profile.status = ProfileStatus.SUSPENDED;
    }
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

  getProfileStatistics(profileId: string): any {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;

    const rotationEvents = this.rotationHistory.filter(event => event.newProfileId === profileId);
    
    return {
      profile: {
        id: profile.id,
        name: profile.name,
        status: profile.status,
        riskScore: profile.riskScore,
        createdAt: profile.createdAt,
        lastUsed: profile.lastUsed
      },
      usage: profile.usage,
      rotations: {
        total: rotationEvents.length,
        successful: rotationEvents.filter(e => e.success).length,
        failed: rotationEvents.filter(e => !e.success).length,
        lastRotation: rotationEvents[0]?.timestamp
      },
      health: {
        successRate: profile.usage.totalSessions > 0 ? 
          profile.usage.successfulRegistrations / profile.usage.totalSessions : 0,
        averageSessionDuration: profile.usage.averageSessionDuration,
        suspiciousActivities: profile.usage.suspiciousActivity.length,
        unresolvedIssues: profile.usage.suspiciousActivity.filter(a => !a.resolved).length
      }
    };
  }

  optimizeRotationStrategies(): void {
    // Analyze rotation history and adjust strategies for better performance
    const recentEvents = this.rotationHistory.slice(-1000);
    
    this.strategies.forEach(strategy => {
      const strategyEvents = recentEvents.filter(e => e.strategy === strategy.id);
      const successRate = strategyEvents.length > 0 ? 
        strategyEvents.filter(e => e.success).length / strategyEvents.length : 0;

      // Adjust parameters based on success rate
      if (successRate < 0.8 && strategy.parameters.cooldownPeriod) {
        strategy.parameters.cooldownPeriod = Math.min(180, strategy.parameters.cooldownPeriod * 1.2);
      } else if (successRate > 0.95 && strategy.parameters.cooldownPeriod) {
        strategy.parameters.cooldownPeriod = Math.max(15, strategy.parameters.cooldownPeriod * 0.9);
      }
    });
  }

  cleanup(): void {
    // Stop all active rotations
    this.activeRotations.forEach((timer, poolId) => {
      clearInterval(timer);
    });
    this.activeRotations.clear();

    // Clean up expired profiles
    const now = new Date();
    this.profiles.forEach((profile, id) => {
      if (profile.expiresAt && profile.expiresAt < now) {
        profile.status = ProfileStatus.EXPIRED;
      }
    });

    // Clean up old rotation history (keep last 10000 events)
    if (this.rotationHistory.length > 10000) {
      this.rotationHistory = this.rotationHistory
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10000);
    }
  }
}