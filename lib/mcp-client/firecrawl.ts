// Firecrawl Integration for MCP Client
import axios from 'axios'
import { FirecrawlRequest, FirecrawlResponse } from './types'

export class FirecrawlClient {
  constructor(private apiKey: string, private baseUrl: string = 'https://api.firecrawl.dev') {}

  async scrape(request: FirecrawlRequest): Promise<FirecrawlResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v0/scrape`,
        {
          url: request.url,
          formats: request.formats || ['markdown'],
          headers: request.headers,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: request.timeout || 30000,
        }
      )

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  async crawl(url: string, options?: { includePaths?: string[], excludePaths?: string[], maxDepth?: number }): Promise<FirecrawlResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v0/crawl`,
        {
          url,
          ...options,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 300000, // 5 minutes for crawling
        }
      )

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  async mapSite(url: string): Promise<FirecrawlResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v0/map`,
        { url },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        }
      )

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }

  async search(query: string, options?: { limit?: number, includeDomains?: string[], excludeDomains?: string[] }): Promise<FirecrawlResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v0/search`,
        {
          query,
          ...options,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        }
      )

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      }
    }
  }
}