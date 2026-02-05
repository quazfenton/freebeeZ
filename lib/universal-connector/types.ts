// Universal Service Connector Types
// Defines connection methods and interfaces for any service integration

export enum ConnectionMethodType {
  REST_API = 'rest_api',
  GRAPHQL = 'graphql',
  WEBSOCKET = 'websocket',
  GRPC = 'grpc',
  SOAP = 'soap',
  BROWSER_AUTOMATION = 'browser_automation',
  SDK = 'sdk',
  CLI = 'cli',
  OAUTH = 'oauth',
  IFRAME = 'iframe',
  MCP_SERVER = 'mcp_server',
  RSS = 'rss',
  EMAIL_PROTOCOL = 'email_protocol',
  SSH = 'ssh',
  SFTP = 'sftp',
  WEBHOOK = 'webhook',
  SCRAPING = 'scraping',
}

export interface ConnectionConfig {
  method: ConnectionMethodType
  endpoint?: string
  credentials?: ConnectionCredentials
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  rateLimits?: RateLimitConfig
  proxy?: ProxyConnectionConfig
}

export interface ConnectionCredentials {
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  username?: string
  password?: string
  clientId?: string
  clientSecret?: string
  bearerToken?: string
  cookies?: Record<string, string>
  sessionId?: string
  customHeaders?: Record<string, string>
}

export interface RateLimitConfig {
  requestsPerSecond?: number
  requestsPerMinute?: number
  requestsPerHour?: number
  requestsPerDay?: number
  burstLimit?: number
  retryAfterHeader?: boolean
}

export interface ProxyConnectionConfig {
  url: string
  type: 'http' | 'https' | 'socks4' | 'socks5'
  username?: string
  password?: string
  rotate?: boolean
  poolId?: string
}

export interface ServiceEndpoint {
  id: string
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  bodyTemplate?: Record<string, any>
  responseParser?: (response: any) => any
  rateLimitKey?: string
}

export interface ConnectorCapabilities {
  canAuthenticate: boolean
  canScrape: boolean
  canAutomate: boolean
  canUpload: boolean
  canDownload: boolean
  canStream: boolean
  canWebhook: boolean
  canOAuth: boolean
  requiresCaptcha: boolean
  requiresEmail: boolean
  requiresPhone: boolean
}

export interface ConnectionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
  headers?: Record<string, string>
  duration: number
  retryCount: number
  method: ConnectionMethodType
  cached?: boolean
}

export interface ServiceConnection {
  id: string
  serviceId: string
  method: ConnectionMethodType
  status: 'connected' | 'disconnected' | 'error' | 'rate_limited' | 'expired'
  config: ConnectionConfig
  credentials?: ConnectionCredentials
  capabilities: ConnectorCapabilities
  usage: ConnectionUsage
  healthCheck: () => Promise<boolean>
  createdAt: Date
  lastUsed?: Date
  expiresAt?: Date
}

export interface ConnectionUsage {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  rateLimitHits: number
  totalDataTransferred: number
  averageResponseTime: number
  lastRequestTime?: Date
  quotaRemaining?: number
  quotaResetTime?: Date
}

export interface ConnectionAdapter {
  type: ConnectionMethodType
  connect(config: ConnectionConfig): Promise<ServiceConnection>
  disconnect(connectionId: string): Promise<boolean>
  execute<T>(connection: ServiceConnection, action: string, params: Record<string, any>): Promise<ConnectionResult<T>>
  healthCheck(connection: ServiceConnection): Promise<boolean>
  refreshCredentials?(connection: ServiceConnection): Promise<ConnectionCredentials>
}

export interface ScrapingConfig {
  url: string
  selectors: SelectorConfig[]
  pagination?: PaginationConfig
  waitFor?: string | number
  javascript?: boolean
  screenshot?: boolean
  userAgent?: string
  cookies?: Record<string, string>
}

export interface SelectorConfig {
  name: string
  selector: string
  attribute?: string
  multiple?: boolean
  transform?: (value: string) => any
  required?: boolean
}

export interface PaginationConfig {
  type: 'next_button' | 'page_number' | 'infinite_scroll' | 'load_more' | 'api_cursor'
  selector?: string
  maxPages?: number
  delay?: number
  cursorParam?: string
}

export interface WebhookConfig {
  url: string
  method: 'POST' | 'GET' | 'PUT'
  headers?: Record<string, string>
  secret?: string
  events: string[]
  retries?: number
  timeout?: number
}

export interface OAuthConfig {
  provider: string
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  redirectUri: string
  state?: string
  pkce?: boolean
}

export interface DiscoveredService {
  id: string
  name: string
  url: string
  description?: string
  category: string
  tags: string[]
  source: string
  sourceUrl?: string
  discoveredAt: Date
  lastChecked?: Date
  connectionMethods: ConnectionMethodType[]
  hasApi: boolean
  hasFreeTeir: boolean
  freeTierLimits?: Record<string, any>
  signupUrl?: string
  apiDocsUrl?: string
  pricingUrl?: string
  registrationDifficulty: 'easy' | 'medium' | 'hard'
  requiresVerification: boolean
  features: string[]
}

export interface AggregationSource {
  id: string
  name: string
  type: 'github_markdown' | 'github_awesome' | 'web_page' | 'rss' | 'api' | 'sitemap'
  url: string
  parser: 'markdown_links' | 'html_links' | 'json' | 'xml' | 'custom'
  enabled: boolean
  priority: number
  rateLimit?: number
  lastFetched?: Date
  lastSuccess?: boolean
  errorCount: number
}
