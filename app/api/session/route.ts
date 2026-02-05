// API Route for Session Management
import { NextRequest, NextResponse } from 'next/server'
import { SessionVault } from '@/lib/session-vault'

// Global instance to maintain state
let sessionVault: SessionVault | null = null

function getSessionVault(): SessionVault {
  if (!sessionVault) {
    sessionVault = new SessionVault({
      encryptionKey: process.env.ENCRYPTION_KEY || 'default-test-key-32-chars-long!!',
      maxSessions: 1000,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    })
  }
  return sessionVault
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const sessionId = searchParams.get('sessionId')
    const sessionVault = getSessionVault()

    switch (action) {
      case 'stats':
        const stats = await sessionVault.getStats()
        return NextResponse.json({ success: true, data: stats })

      case 'get':
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: 'sessionId is required for get action' },
            { status: 400 }
          )
        }
        
        const session = await sessionVault.getSession(sessionId)
        if (!session) {
          return NextResponse.json(
            { success: false, error: 'Session not found or expired' },
            { status: 404 }
          )
        }
        
        return NextResponse.json({ success: true, data: session })

      case 'list':
        // Return all session IDs (without sensitive data)
        const allSessions = Array.from((sessionVault as any).sessions.keys())
        return NextResponse.json({ success: true, data: allSessions })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use ?action=stats, ?action=get&sessionId=X, or ?action=list'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Session API GET error:', error)
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
    const sessionVault = getSessionVault()
    const body = await request.json()

    switch (action) {
      case 'initialize':
        await sessionVault.initialize()
        return NextResponse.json({ success: true, message: 'Session vault initialized' })

      case 'save':
        const { sessionData } = body
        if (!sessionData || !sessionData.id) {
          return NextResponse.json(
            { success: false, error: 'sessionData with id is required' },
            { status: 400 }
          )
        }

        await sessionVault.saveSession(sessionData)
        return NextResponse.json({ success: true, message: 'Session saved successfully' })

      case 'create-from-browser':
        const { sessionId, profileId, serviceId, browserContext, expiresAt } = body
        if (!sessionId || !profileId || !serviceId) {
          return NextResponse.json(
            { success: false, error: 'sessionId, profileId, and serviceId are required' },
            { status: 400 }
          )
        }

        // Note: In a real implementation, we'd need to pass actual browser context
        // For now, this is a placeholder showing the intended functionality
        // await sessionVault.createSessionFromBrowser(sessionId, profileId, serviceId, browserContext, expiresAt)
        
        // Since we can't actually access browser context from the API, we'll simulate
        // creating a session with dummy data
        const dummySessionData = {
          id: sessionId,
          profileId,
          serviceId,
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        }
        
        await sessionVault.saveSession(dummySessionData)
        return NextResponse.json({ success: true, message: 'Session created from browser simulation' })

      case 'restore-to-browser':
        const { restoreSessionId } = body
        if (!restoreSessionId) {
          return NextResponse.json(
            { success: false, error: 'sessionId is required' },
            { status: 400 }
          )
        }

        // Note: Similar to above, we can't actually restore to browser from API
        // This would be handled in the browser automation layer
        const sessionExists = await sessionVault.getSession(restoreSessionId)
        if (!sessionExists) {
          return NextResponse.json(
            { success: false, error: 'Session not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Session validated for restoration',
          session: sessionExists
        })

      case 'cleanup':
        const cleanedCount = await sessionVault.cleanupExpiredSessions()
        return NextResponse.json({ 
          success: true, 
          message: `${cleanedCount} expired sessions removed`,
          cleanedCount
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Session API POST error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const sessionVault = getSessionVault()

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const result = await sessionVault.removeSession(sessionId)
    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: 'Session removed successfully' 
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }
  } catch (error: any) {
    console.error('Session API DELETE error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}