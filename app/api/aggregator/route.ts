// API Route for Service Aggregation
import { NextRequest, NextResponse } from 'next/server'
import { FreeServiceAggregator, getPrioritySources, ALL_SOURCES, getSourceById } from '@/lib/free-service-aggregator'

const aggregator = new FreeServiceAggregator()

export async function GET(request: NextRequest) {
  try {
    const stats = await aggregator.getServiceStats()

    return NextResponse.json({
      success: true,
      data: {
        stats,
        availableSources: ALL_SOURCES.map((s) => ({
          id: s.id,
          type: s.type,
          notes: s.notes,
        })),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priority = false, sources: sourceIds } = body

    let sources = ALL_SOURCES

    if (sourceIds && Array.isArray(sourceIds)) {
      sources = sourceIds
        .map((id: string) => getSourceById(id))
        .filter((s): s is NonNullable<typeof s> => !!s)

      if (sources.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid sources found' },
          { status: 400 }
        )
      }
    } else if (priority) {
      sources = getPrioritySources(5)
    }

    const stats = await aggregator.aggregateFromAllSources(sources)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
