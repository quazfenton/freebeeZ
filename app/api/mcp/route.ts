// API Route for MCP (Model Context Protocol) Client
import { NextRequest, NextResponse } from 'next/server'
import { MCPClient } from '@/lib/mcp-client'

// Global instance to maintain state
let mcpClient: MCPClient | null = null

function getMCPClient(): MCPClient {
  if (!mcpClient) {
    mcpClient = new MCPClient({
      endpoint: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev',
      apiKey: process.env.FIRECRAWL_API_KEY || '',
      timeout: 30000,
    })
  }
  return mcpClient
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const mcpClient = getMCPClient()

    switch (action) {
      case 'health':
        const health = await mcpClient.healthCheck()
        return NextResponse.json({ success: true, data: { healthy: health } })

      case 'providers':
        // Return available providers
        const firecrawlClient = mcpClient.getFirecrawlClient()
        return NextResponse.json({ 
          success: true, 
          data: { 
            firecrawl: !!firecrawlClient,
            providers: firecrawlClient ? ['firecrawl'] : []
          } 
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use ?action=health or ?action=providers'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('MCP API GET error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const mcpClient = getMCPClient()
    const body = await request.json()

    switch (action) {
      case 'request':
        const { method, params } = body
        if (!method) {
          return NextResponse.json(
            { success: false, error: 'method is required' },
            { status: 400 }
          )
        }

        const result = await mcpClient.sendRequest({
          method,
          params: params || {},
        })
        
        return NextResponse.json({ success: true, data: result })

      case 'discover-services':
        const { target } = body
        if (!target) {
          return NextResponse.json(
            { success: false, error: 'target is required' },
            { status: 400 }
          )
        }

        const services = await mcpClient.discoverServices(target)
        return NextResponse.json({ success: true, data: services })

      case 'firecrawl-scrape':
        const { url, formats, headers, timeout } = body
        if (!url) {
          return NextResponse.json(
            { success: false, error: 'url is required' },
            { status: 400 }
          )
        }

        const firecrawlClient = mcpClient.getFirecrawlClient()
        if (!firecrawlClient) {
          return NextResponse.json(
            { success: false, error: 'Firecrawl client not available' },
            { status: 500 }
          )
        }

        const scrapeResult = await firecrawlClient.scrape({
          url,
          formats,
          headers,
          timeout,
        })
        
        return NextResponse.json({ success: true, data: scrapeResult })

      case 'firecrawl-crawl':
        const { crawlUrl, includePaths, excludePaths, maxDepth } = body
        if (!crawlUrl) {
          return NextResponse.json(
            { success: false, error: 'url is required' },
            { status: 400 }
          )
        }

        const crawlClient = mcpClient.getFirecrawlClient()
        if (!crawlClient) {
          return NextResponse.json(
            { success: false, error: 'Firecrawl client not available' },
            { status: 500 }
          )
        }

        const crawlResult = await crawlClient.crawl(crawlUrl, {
          includePaths,
          excludePaths,
          maxDepth,
        })
        
        return NextResponse.json({ success: true, data: crawlResult })

      case 'firecrawl-map':
        const { mapUrl } = body
        if (!mapUrl) {
          return NextResponse.json(
            { success: false, error: 'url is required' },
            { status: 400 }
          )
        }

        const mapClient = mcpClient.getFirecrawlClient()
        if (!mapClient) {
          return NextResponse.json(
            { success: false, error: 'Firecrawl client not available' },
            { status: 500 }
          )
        }

        const mapResult = await mapClient.mapSite(mapUrl)
        
        return NextResponse.json({ success: true, data: mapResult })

      case 'firecrawl-search':
        const { query, limit, includeDomains, excludeDomains } = body
        if (!query) {
          return NextResponse.json(
            { success: false, error: 'query is required' },
            { status: 400 }
          )
        }

        const searchClient = mcpClient.getFirecrawlClient()
        if (!searchClient) {
          return NextResponse.json(
            { success: false, error: 'Firecrawl client not available' },
            { status: 500 }
          )
        }

        const searchResult = await searchClient.search(query, {
          limit,
          includeDomains,
          excludeDomains,
        })
        
        return NextResponse.json({ success: true, data: searchResult })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('MCP API POST error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}