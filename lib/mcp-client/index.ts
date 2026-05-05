// MCP Client - Model Context Protocol Client
import { FirecrawlClient } from './firecrawl'
import { MCPConfig, MCPRequest, MCPResponse } from './types'

export class MCPClient {
  private firecrawlClient?: FirecrawlClient

  constructor(private config: MCPConfig) {
    // Initialize specific MCP integrations
    if (config.endpoint.includes('firecrawl')) {
      this.firecrawlClient = new FirecrawlClient(
        config.apiKey || '',
        config.endpoint
      )
    }
  }

  /**
   * Send a generic MCP request
   */
  async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    // For now, route to appropriate service based on method
    switch (request.method) {
      case 'firecrawl/scrape':
        if (this.firecrawlClient && request.params.url) {
          const result = await this.firecrawlClient.scrape({
            url: request.params.url,
            formats: request.params.formats,
            headers: request.params.headers,
            timeout: request.params.timeout,
          })
          
          return {
            result: result,
            id: request.id
          }
        }
        break
        
      case 'firecrawl/crawl':
        if (this.firecrawlClient && request.params.url) {
          const result = await this.firecrawlClient.crawl(
            request.params.url,
            {
              includePaths: request.params.includePaths,
              excludePaths: request.params.excludePaths,
              maxDepth: request.params.maxDepth,
            }
          )
          
          return {
            result: result,
            id: request.id
          }
        }
        break
        
      case 'firecrawl/map':
        if (this.firecrawlClient && request.params.url) {
          const result = await this.firecrawlClient.mapSite(request.params.url)
          
          return {
            result: result,
            id: request.id
          }
        }
        break
        
      case 'firecrawl/search':
        if (this.firecrawlClient && request.params.query) {
          const result = await this.firecrawlClient.search(
            request.params.query,
            {
              limit: request.params.limit,
              includeDomains: request.params.includeDomains,
              excludeDomains: request.params.excludeDomains,
            }
          )
          
          return {
            result: result,
            id: request.id
          }
        }
        break
        
      default:
        return {
          error: {
            code: -1,
            message: `Unsupported MCP method: ${request.method}`
          },
          id: request.id
        }
    }
    
    return {
      error: {
        code: -1,
        message: 'Invalid request parameters'
      },
      id: request.id
    }
  }

  /**
   * Enhanced service discovery using MCP
   */
  async discoverServices(target: string): Promise<any[]> {
    if (this.firecrawlClient) {
      // Use Firecrawl to map the site and discover services
      const mapResult = await this.firecrawlClient.mapSite(target)
      
      if (mapResult.success && mapResult.data) {
        // Process the map result to identify potential services
        const urls = mapResult.data.urls || []
        
        // For each URL, potentially scrape to identify service types
        const services = []
        for (const url of urls.slice(0, 10)) { // Limit to first 10 for performance
          const scrapeResult = await this.firecrawlClient.scrape({ url, formats: ['markdown'] })
          
          if (scrapeResult.success && scrapeResult.data) {
            // Analyze the content to determine if it's a service/api endpoint
            const content = scrapeResult.data.markdown || ''
            
            // Simple heuristics to identify service types
            if (content.toLowerCase().includes('api') || 
                content.toLowerCase().includes('documentation') ||
                content.toLowerCase().includes('swagger') ||
                content.toLowerCase().includes('graphql')) {
              services.push({
                url,
                type: 'api_documentation',
                confidence: 0.8
              })
            } else if (content.toLowerCase().includes('login') ||
                      content.toLowerCase().includes('signin') ||
                      content.toLowerCase().includes('register') ||
                      content.toLowerCase().includes('signup')) {
              services.push({
                url,
                type: 'authentication',
                confidence: 0.9
              })
            } else {
              services.push({
                url,
                type: 'general',
                confidence: 0.5
              })
            }
          }
        }
        
        return services
      }
    }
    
    return []
  }

  /**
   * Get Firecrawl client instance
   */
  getFirecrawlClient(): FirecrawlClient | undefined {
    return this.firecrawlClient
  }

  /**
   * Health check for MCP connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.firecrawlClient) {
        // Perform a simple request to check connectivity
        const result = await this.firecrawlClient.search('health check', { limit: 1 })
        return result.success
      }
      return true // If no specific client, assume generic MCP is accessible
    } catch {
      return false
    }
  }
}