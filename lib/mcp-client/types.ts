// Types for MCP Client
export interface MCPConfig {
  endpoint: string
  apiKey?: string
  timeout?: number
}

export interface MCPRequest {
  method: string
  params: Record<string, any>
  id?: string
}

export interface MCPResponse {
  result?: any
  error?: {
    code: number
    message: string
  }
  id?: string
}

export interface FirecrawlRequest {
  url: string
  formats?: string[]
  headers?: Record<string, string>
  timeout?: number
}

export interface FirecrawlResponse {
  success: boolean
  data?: any
  error?: string
}