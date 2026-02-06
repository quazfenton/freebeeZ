// Account Manager for FreebeeZ
// Manages multi-account pools per service with automatic rotation and rate limit tracking

import { LocalCredentialManager, CredentialManager } from '../credential-manager'
import { ServiceCredentials } from '../service-integrations'
import { ProfileRotationManager, UserProfile, ProfileStatus } from '../profile-rotation-manager'
import { globalEventEmitter, EventType } from '../realtime'

export interface ServiceAccount {
  id: string
  serviceId: string
  email: string
  username?: string
  credentials: ServiceCredentials
  profile: UserProfile
  status: AccountStatus
  usage: AccountUsage
  rateLimits: AccountRateLimits
  metadata: AccountMetadata
  createdAt: Date
  lastUsed?: Date
  expiresAt?: Date
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RATE_LIMITED = 'rate_limited',
  BANNED = 'banned',
  EXPIRED = 'expired',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended',
}

export interface AccountUsage {
  totalRequests: number
  dailyRequests: number
  monthlyRequests: number
  successfulRequests: number
  failedRequests: number
  lastResetDaily: Date
  lastResetMonthly: Date
}

export interface AccountRateLimits {
  requestsPerMinute?: number
  requestsPerHour?: number
  requestsPerDay?: number
  requestsPerMonth?: number
  currentMinute: number
  currentHour: number
  currentDay: number
  currentMonth: number
  lastMinuteReset: Date
  lastHourReset: Date
}

export interface AccountMetadata {
  registeredVia: 'manual' | 'automated' | 'oauth' | 'api'
  registrationDate: Date
  verificationMethod?: 'email' | 'phone' | 'captcha' | 'none'
  notes?: string
  tags: string[]
}

export interface AccountPool {
  id: string
  serviceId: string
  serviceName: string
  accounts: string[] // Account IDs
  rotationStrategy: RotationStrategy
  currentAccountIndex: number
  isActive: boolean
  createdAt: Date
  lastRotation?: Date
}

export enum RotationStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_USED = 'least_used',
  RANDOM = 'random',
  STICKY = 'sticky',
  RATE_LIMIT_AWARE = 'rate_limit_aware',
}

export class AccountManager {
  private credentialManager: CredentialManager
  private profileManager: ProfileRotationManager
  private accounts: Map<string, ServiceAccount> = new Map()
  private pools: Map<string, AccountPool> = new Map()
  private serviceToPool: Map<string, string> = new Map() // serviceId -> poolId

  constructor(credentialManager?: CredentialManager, profileManager?: ProfileRotationManager) {
    this.credentialManager = credentialManager || new LocalCredentialManager()
    this.profileManager = profileManager || new ProfileRotationManager()
    this.startCleanupInterval()
  }

  async createAccount(
    serviceId: string,
    email: string,
    credentials: ServiceCredentials,
    profile: UserProfile,
    metadata?: Partial<AccountMetadata>
  ): Promise<ServiceAccount> {
    const accountId = `account_${serviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const account: ServiceAccount = {
      id: accountId,
      serviceId,
      email,
      username: credentials.username,
      credentials,
      profile,
      status: AccountStatus.ACTIVE,
      usage: this.createEmptyUsage(),
      rateLimits: this.createEmptyRateLimits(),
      metadata: {
        registeredVia: metadata?.registeredVia || 'automated',
        registrationDate: new Date(),
        verificationMethod: metadata?.verificationMethod,
        notes: metadata?.notes,
        tags: metadata?.tags || [],
      },
      createdAt: new Date(),
    }

    await this.credentialManager.storeCredentials(accountId, credentials)
    this.accounts.set(accountId, account)

    const pool = this.getOrCreatePool(serviceId)
    pool.accounts.push(accountId)

    return account
  }

  async getAccount(accountId: string): Promise<ServiceAccount | null> {
    const account = this.accounts.get(accountId)
    if (!account) return null

    const credentials = await this.credentialManager.getCredentials(accountId)
    if (credentials) {
      account.credentials = credentials
    }

    return account
  }

  async getNextAccount(serviceId: string): Promise<ServiceAccount | null> {
    const pool = this.pools.get(this.serviceToPool.get(serviceId) || '')
    if (!pool || pool.accounts.length === 0) return null

    const account = await this.selectAccount(pool)
    if (account) {
      account.lastUsed = new Date()
      pool.lastRotation = new Date()
    }

    return account
  }

  private async selectAccount(pool: AccountPool): Promise<ServiceAccount | null> {
    const activeAccounts = pool.accounts
      .map((id) => this.accounts.get(id))
      .filter((a): a is ServiceAccount => !!a && a.status === AccountStatus.ACTIVE && !this.isRateLimited(a))

    if (activeAccounts.length === 0) {
      globalEventEmitter.emit(EventType.SERVICE_QUOTA_EXCEEDED, {
        serviceId: pool.serviceId,
        serviceName: pool.serviceName,
        status: 'no_available_accounts',
      })
      return null
    }

    switch (pool.rotationStrategy) {
      case RotationStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(pool, activeAccounts)

      case RotationStrategy.LEAST_USED:
        return this.selectLeastUsed(activeAccounts)

      case RotationStrategy.RANDOM:
        return this.selectRandom(activeAccounts)

      case RotationStrategy.RATE_LIMIT_AWARE:
        return this.selectRateLimitAware(activeAccounts)

      case RotationStrategy.STICKY:
      default:
        return this.selectSticky(pool, activeAccounts)
    }
  }

private selectRoundRobin(pool: AccountPool, accounts: ServiceAccount[]): ServiceAccount {
    const activeIds = new Set(accounts.map(a => a.id))
    for (let i = 0; i < pool.accounts.length; i++) {
      pool.roundRobinIndex = ((pool.roundRobinIndex ?? -1) + 1) % pool.accounts.length
      const id = pool.accounts[pool.roundRobinIndex]
      if (activeIds.has(id)) return this.accounts.get(id)!
    }
    return accounts[0]
  }

  private selectLeastUsed(accounts: ServiceAccount[]): ServiceAccount {
    return accounts.sort((a, b) => a.usage.totalRequests - b.usage.totalRequests)[0]
  }

  private selectRandom(accounts: ServiceAccount[]): ServiceAccount {
    return accounts[Math.floor(Math.random() * accounts.length)]
  }

  private selectRateLimitAware(accounts: ServiceAccount[]): ServiceAccount {
    return accounts.sort((a, b) => {
      const aRemaining = this.getRemainingQuota(a)
      const bRemaining = this.getRemainingQuota(b)
      return bRemaining - aRemaining
    })[0]
  }

  private selectSticky(pool: AccountPool, accounts: ServiceAccount[]): ServiceAccount {
    const currentId = pool.accounts[pool.currentAccountIndex]
    const current = accounts.find((a) => a.id === currentId)
    if (current && !this.isRateLimited(current)) {
      return current
    }
    return this.selectLeastUsed(accounts)
  }

  private isRateLimited(account: ServiceAccount): boolean {
    this.resetRateLimitsIfNeeded(account)

    const limits = account.rateLimits

    if (limits.requestsPerMinute && limits.currentMinute >= limits.requestsPerMinute) {
      return true
    }
    if (limits.requestsPerHour && limits.currentHour >= limits.requestsPerHour) {
      return true
    }
    if (limits.requestsPerDay && limits.currentDay >= limits.requestsPerDay) {
      return true
    }
    if (limits.requestsPerMonth && limits.currentMonth >= limits.requestsPerMonth) {
      return true
    }

    return false
  }

  private getRemainingQuota(account: ServiceAccount): number {
    const limits = account.rateLimits
    const dailyLimit = limits.requestsPerDay || Infinity
    const remaining = dailyLimit - limits.currentDay
    return Math.max(0, remaining)
  }

  private resetRateLimitsIfNeeded(account: ServiceAccount): void {
    const now = new Date()
    const limits = account.rateLimits

    if (now.getTime() - limits.lastMinuteReset.getTime() >= 60 * 1000) {
      limits.currentMinute = 0
      limits.lastMinuteReset = now
    }

    if (now.getTime() - limits.lastHourReset.getTime() >= 60 * 60 * 1000) {
      limits.currentHour = 0
      limits.lastHourReset = now
    }

    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (account.usage.lastResetDaily < dayStart) {
      limits.currentDay = 0
      account.usage.dailyRequests = 0
      account.usage.lastResetDaily = dayStart
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    if (account.usage.lastResetMonthly < monthStart) {
      limits.currentMonth = 0
      account.usage.monthlyRequests = 0
      account.usage.lastResetMonthly = monthStart
    }
  }

  recordRequest(accountId: string, success: boolean): void {
    const account = this.accounts.get(accountId)
    if (!account) return

    account.usage.totalRequests++
    account.usage.dailyRequests++
    account.usage.monthlyRequests++

    if (success) {
      account.usage.successfulRequests++
    } else {
      account.usage.failedRequests++
    }

    account.rateLimits.currentMinute++
    account.rateLimits.currentHour++
    account.rateLimits.currentDay++
    account.rateLimits.currentMonth++

    account.lastUsed = new Date()

    if (this.isRateLimited(account)) {
      account.status = AccountStatus.RATE_LIMITED

      globalEventEmitter.emit(EventType.SERVICE_QUOTA_WARNING, {
        serviceId: account.serviceId,
        accountId: account.id,
        status: 'rate_limited',
      })
    }
  }

  async rotateAccount(serviceId: string, reason: string = 'manual'): Promise<ServiceAccount | null> {
    const pool = this.pools.get(this.serviceToPool.get(serviceId) || '')
    if (!pool) return null

    const previousAccountId = pool.accounts[pool.currentAccountIndex]
    const newAccount = await this.getNextAccount(serviceId)

    if (newAccount && previousAccountId !== newAccount.id) {
      globalEventEmitter.emit(EventType.PROFILE_ROTATED, {
        poolId: pool.id,
        previousAccountId,
        newAccountId: newAccount.id,
        reason,
      })
    }

    return newAccount
  }

  async suspendAccount(accountId: string, reason: string): Promise<boolean> {
    const account = this.accounts.get(accountId)
    if (!account) return false

    account.status = AccountStatus.SUSPENDED
    account.metadata.notes = `${account.metadata.notes || ''}\nSuspended: ${reason}`

    return true
  }

  async reactivateAccount(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId)
    if (!account) return false

    account.status = AccountStatus.ACTIVE
    return true
  }

  async deleteAccount(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId)
    if (!account) return false

    await this.credentialManager.deleteCredentials(accountId)
    this.accounts.delete(accountId)

    const pool = this.pools.get(this.serviceToPool.get(account.serviceId) || '')
    if (pool) {
      pool.accounts = pool.accounts.filter((id) => id !== accountId)
    }

    return true
  }

  getServiceAccounts(serviceId: string): ServiceAccount[] {
    const pool = this.pools.get(this.serviceToPool.get(serviceId) || '')
    if (!pool) return []

    return pool.accounts.map((id) => this.accounts.get(id)).filter((a): a is ServiceAccount => !!a)
  }

  getAccountStats(serviceId?: string): {
    total: number
    active: number
    rateLimited: number
    suspended: number
    byService: Record<string, number>
  } {
    let accounts = Array.from(this.accounts.values())
    if (serviceId) {
      accounts = accounts.filter((a) => a.serviceId === serviceId)
    }

    const byService: Record<string, number> = {}
    accounts.forEach((a) => {
      byService[a.serviceId] = (byService[a.serviceId] || 0) + 1
    })

    return {
      total: accounts.length,
      active: accounts.filter((a) => a.status === AccountStatus.ACTIVE).length,
      rateLimited: accounts.filter((a) => a.status === AccountStatus.RATE_LIMITED).length,
      suspended: accounts.filter((a) => a.status === AccountStatus.SUSPENDED).length,
      byService,
    }
  }

  setRateLimits(
    accountId: string,
    limits: Partial<Pick<AccountRateLimits, 'requestsPerMinute' | 'requestsPerHour' | 'requestsPerDay' | 'requestsPerMonth'>>
  ): boolean {
    const account = this.accounts.get(accountId)
    if (!account) return false

    Object.assign(account.rateLimits, limits)
    return true
  }

  setPoolRotationStrategy(serviceId: string, strategy: RotationStrategy): boolean {
    const pool = this.pools.get(this.serviceToPool.get(serviceId) || '')
    if (!pool) return false

    pool.rotationStrategy = strategy
    return true
  }

  private getOrCreatePool(serviceId: string): AccountPool {
    let poolId = this.serviceToPool.get(serviceId)

    if (poolId && this.pools.has(poolId)) {
      return this.pools.get(poolId)!
    }

    poolId = `pool_${serviceId}_${Date.now()}`
    const pool: AccountPool = {
      id: poolId,
      serviceId,
      serviceName: serviceId,
      accounts: [],
      rotationStrategy: RotationStrategy.RATE_LIMIT_AWARE,
      currentAccountIndex: 0,
      isActive: true,
      createdAt: new Date(),
    }

    this.pools.set(poolId, pool)
    this.serviceToPool.set(serviceId, poolId)

    return pool
  }

  private createEmptyUsage(): AccountUsage {
    const now = new Date()
    return {
      totalRequests: 0,
      dailyRequests: 0,
      monthlyRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastResetDaily: now,
      lastResetMonthly: now,
    }
  }

  private createEmptyRateLimits(): AccountRateLimits {
    const now = new Date()
    return {
      currentMinute: 0,
      currentHour: 0,
      currentDay: 0,
      currentMonth: 0,
      lastMinuteReset: now,
      lastHourReset: now,
    }
  }

private startCleanupInterval(): void {
    this.cleanupIntervalId = setInterval(() => {
      const now = new Date()
      for (const account of this.accounts.values()) {
        this.resetRateLimitsIfNeeded(account)

        if (account.status === AccountStatus.RATE_LIMITED && !this.isRateLimited(account)) {
          account.status = AccountStatus.ACTIVE
        }

        if (account.expiresAt && account.expiresAt < now) {
          account.status = AccountStatus.EXPIRED
        }
      }
    }, 60_000)
  }

  cleanup(): void {
    this.accounts.clear()
    this.pools.clear()
    this.serviceToPool.clear()
  }
}
