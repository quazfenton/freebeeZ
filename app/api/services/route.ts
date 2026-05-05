// API Route for Service Management
import { NextRequest, NextResponse } from 'next/server'
import { FreeServiceAggregator } from '@/lib/free-service-aggregator'

const aggregator = new FreeServiceAggregator()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (query) {
      const services = await aggregator.searchServices(query, {
        category: category as any,
        limit,
      })
      return NextResponse.json({ success: true, data: services, count: services.length })
    }

    if (category) {
      const services = await aggregator.getServicesByCategory(category as any)
      return NextResponse.json({ success: true, data: services.slice(0, limit), count: services.length })
    }

    const catalog = await aggregator.loadCatalog()
    return NextResponse.json({
      success: true,
      data: catalog.slice(0, limit),
      count: catalog.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
