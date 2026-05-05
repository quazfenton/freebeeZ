// OAuth 2.0 Adapter for Universal Connector
// Handles OAuth flows for services like Google, GitHub, Dropbox
import axios from 'axios'
import crypto from 'crypto'
import {
  ConnectionAdapter,
  ConnectionMethodType,
  ConnectionConfig,
  ConnectionCredentials,
  ServiceConnection,
  ConnectionResult,
  ConnectionUsage,
  ConnectorCapabilities,
} from '../types'

export interface OAuthProviderConfig {
  id: string
  name: string
  authorizationUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes: string[]
  usePKCE?: boolean
  redirectUri?: string
}

export interface OAuthToken {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresIn?: number
  expiresAt?: Date
  scope?: string
}

export interface OAuthState {
  state: string
  codeVerifier?: string
  provider: string
  redirectUri: string
  createdAt: Date
}

const KNOWN_PROVIDERS: Record<string, Partial<OAuthProviderConfig>> = {
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['openid', 'email', 'profile'],
    usePKCE: true,
  },
  github: {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['user', 'repo'],
    usePKCE: false,
  },
  dropbox: {
    authorizationUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropbox.com/oauth2/token',
    scopes: ['files.metadata.read', 'files.content.read', 'files.content.write'],
    usePKCE: true,
  },
  discord: {
    authorizationUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scopes: ['identify', 'email'],
    usePKCE: false,
  },
  microsoft: {
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['openid', 'email', 'profile', 'offline_access'],
    usePKCE: true,
  },
  notion: {
    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
    usePKCE: false,
  },
  slack: {
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['users:read', 'channels:read'],
    usePKCE: false,
  },
}

export class OAuthAdapter implements ConnectionAdapter {
  type = ConnectionMethodType.OAUTH
  private tokens: Map<string, OAuthToken> = new Map()
  private states: Map<string, OAuthState> = new Map()
  private providers: Map<string, OAuthProviderConfig> = new Map()
  private usage: Map<string, ConnectionUsage> = new Map()
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.startStateCleanup()
  }

  registerProvider(config: OAuthProviderConfig): void {
    const knownConfig = KNOWN_PROVIDERS[config.id] || {}
    this.providers.set(config.id, { ...knownConfig, ...config })
  }

  getAuthorizationUrl(
    providerId: string,
    redirectUri: string,
    additionalScopes?: string[]
  ): { url: string; state: string } {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Unknown OAuth provider: ${providerId}`)
    }

    const state = this.generateState()
    const oauthState: OAuthState = {
      state,
      provider: providerId,
      redirectUri,
      createdAt: new Date(),
    }

    let codeChallenge: string | undefined
    let codeChallengeMethod: string | undefined

    if (provider.usePKCE) {
      const { verifier, challenge } = this.generatePKCE()
      oauthState.codeVerifier = verifier
      codeChallenge = challenge
      codeChallengeMethod = 'S256'
    }

    this.states.set(state, oauthState)

    const scopes = [...(provider.scopes || []), ...(additionalScopes || [])]
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
    })

    if (codeChallenge && codeChallengeMethod) {
      params.append('code_challenge', codeChallenge)
      params.append('code_challenge_method', codeChallengeMethod)
    }

    return {
      url: `${provider.authorizationUrl}?${params.toString()}`,
      state,
    }
  }

  async handleCallback(
    code: string,
    state: string
  ): Promise<{ providerId: string; token: OAuthToken }> {
    const oauthState = this.states.get(state)
    if (!oauthState) {
      throw new Error('Invalid or expired OAuth state')
    }

    this.states.delete(state)

    const provider = this.providers.get(oauthState.provider)
    if (!provider) {
      throw new Error(`Unknown OAuth provider: ${oauthState.provider}`)
    }

    const tokenParams: Record<string, string> = {
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: oauthState.redirectUri,
      grant_type: 'authorization_code',
    }

    if (oauthState.codeVerifier) {
      tokenParams.code_verifier = oauthState.codeVerifier
    }

    const response = await axios.post(provider.tokenUrl, new URLSearchParams(tokenParams), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    })

    const token = this.parseTokenResponse(response.data)
    this.tokens.set(`${oauthState.provider}:${state}`, token)

    if (token.refreshToken && token.expiresIn) {
      this.scheduleTokenRefresh(oauthState.provider, state, token.expiresIn)
    }

    return { providerId: oauthState.provider, token }
  }

  async connect(config: ConnectionConfig): Promise<ServiceConnection> {
    const connectionId = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.usage.set(connectionId, this.createEmptyUsage())

    if (!config.credentials?.oauthToken) {
      throw new Error('OAuth connection requires an access token')
    }

    const token: OAuthToken = {
      accessToken: config.credentials.oauthToken.accessToken,
      refreshToken: config.credentials.oauthToken.refreshToken,
      tokenType: config.credentials.oauthToken.tokenType || 'Bearer',
      expiresAt: config.credentials.oauthToken.expiresAt,
    }

    this.tokens.set(connectionId, token)

    return {
      id: connectionId,
      serviceId: config.endpoint || 'unknown',
      method: ConnectionMethodType.OAUTH,
      status: 'connected',
      config,
      credentials: config.credentials,
      capabilities: this.getCapabilities(),
      usage: this.usage.get(connectionId)!,
      healthCheck: () => this.healthCheck({ id: connectionId } as ServiceConnection),
      createdAt: new Date(),
    }
  }

  async disconnect(connectionId: string): Promise<boolean> {
    this.tokens.delete(connectionId)
    this.usage.delete(connectionId)

    const timer = this.refreshTimers.get(connectionId)
    if (timer) {
      clearTimeout(timer)
      this.refreshTimers.delete(connectionId)
    }

    return true
  }

  async execute<T>(
    connection: ServiceConnection,
    action: string,
    params: Record<string, any>
  ): Promise<ConnectionResult<T>> {
    const startTime = Date.now()
    const token = this.tokens.get(connection.id)
    const usage = this.usage.get(connection.id)!

    if (!token) {
      return {
        success: false,
        error: 'No token available',
        duration: 0,
        retryCount: 0,
        method: this.type,
      }
    }

    if (token.expiresAt && new Date() >= token.expiresAt) {
      const refreshed = await this.refreshAccessToken(connection.id)
      if (!refreshed) {
        return {
          success: false,
          error: 'Token expired and refresh failed',
          duration: Date.now() - startTime,
          retryCount: 0,
          method: this.type,
        }
      }
    }

    const { method = 'GET', url, data, headers: customHeaders } = params

    try {
      usage.totalRequests++

      const currentToken = this.tokens.get(connection.id)!
      const response = await axios.request<T>({
        method,
        url,
        data,
        headers: {
          Authorization: `${currentToken.tokenType} ${currentToken.accessToken}`,
          ...customHeaders,
        },
      })

      const duration = Date.now() - startTime
      usage.successfulRequests++
      usage.averageResponseTime =
        (usage.averageResponseTime * (usage.successfulRequests - 1) + duration) /
        usage.successfulRequests
      usage.lastRequestTime = new Date()

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        duration,
        retryCount: 0,
        method: this.type,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      usage.failedRequests++

      if (error.response?.status === 401 && token.refreshToken) {
        const refreshed = await this.refreshAccessToken(connection.id)
        if (refreshed) {
          return this.execute<T>(connection, action, params)
        }
      }

      if (error.response?.status === 429) {
        usage.rateLimitHits++
      }

      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        duration,
        retryCount: 0,
        method: this.type,
      }
    }
  }

  async healthCheck(connection: ServiceConnection): Promise<boolean> {
    const token = this.tokens.get(connection.id)
    if (!token) return false
    if (token.expiresAt && new Date() >= token.expiresAt) {
      return await this.refreshAccessToken(connection.id)
    }
    return true
  }

  async refreshCredentials(connection: ServiceConnection): Promise<ConnectionCredentials> {
    await this.refreshAccessToken(connection.id)
    const token = this.tokens.get(connection.id)
    return {
      oauthToken: token,
    }
  }

  private async refreshAccessToken(connectionId: string): Promise<boolean> {
    const token = this.tokens.get(connectionId)
    if (!token?.refreshToken) return false

    const parts = connectionId.split(':')
    if (parts.length < 2) return false

    const providerId = parts[0].replace('oauth_', '')
    const provider = this.providers.get(providerId)
    if (!provider) return false

    try {
      const response = await axios.post(
        provider.tokenUrl,
        new URLSearchParams({
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          refresh_token: token.refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      )

      const newToken = this.parseTokenResponse(response.data)
      newToken.refreshToken = newToken.refreshToken || token.refreshToken
      this.tokens.set(connectionId, newToken)

      if (newToken.expiresIn) {
        this.scheduleTokenRefresh(providerId, connectionId, newToken.expiresIn)
      }

      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  private parseTokenResponse(data: any): OAuthToken {
    const token: OAuthToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
    }

    if (data.expires_in) {
      token.expiresIn = data.expires_in
      token.expiresAt = new Date(Date.now() + data.expires_in * 1000)
    }

    return token
  }

  private scheduleTokenRefresh(
    providerId: string,
    connectionId: string,
    expiresIn: number
  ): void {
    const timer = this.refreshTimers.get(connectionId)
    if (timer) {
      clearTimeout(timer)
    }

    const refreshTime = (expiresIn - 300) * 1000
    if (refreshTime > 0) {
      const newTimer = setTimeout(() => {
        this.refreshAccessToken(connectionId)
      }, refreshTime)
      this.refreshTimers.set(connectionId, newTimer)
    }
  }

  private generateState(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  private generatePKCE(): { verifier: string; challenge: string } {
    const verifier = crypto.randomBytes(32).toString('base64url')
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
    return { verifier, challenge }
  }

  private startStateCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      const maxAge = 10 * 60 * 1000 // 10 minutes
      for (const [state, data] of this.states) {
        if (now - data.createdAt.getTime() > maxAge) {
          this.states.delete(state)
        }
      }
    }, 60 * 1000)
  }

  private getCapabilities(): ConnectorCapabilities {
    return {
      canAuthenticate: true,
      canScrape: false,
      canAutomate: false,
      canUpload: true,
      canDownload: true,
      canStream: false,
      canWebhook: true,
      canOAuth: true,
      requiresCaptcha: false,
      requiresEmail: false,
      requiresPhone: false,
    }
  }

  private createEmptyUsage(): ConnectionUsage {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      totalDataTransferred: 0,
      averageResponseTime: 0,
    }
  }

  getToken(connectionId: string): OAuthToken | undefined {
    return this.tokens.get(connectionId)
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}
