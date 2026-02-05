// API Route for Orchestrator Management
import { NextRequest, NextResponse } from 'next/server'
import { Orchestrator } from '@/lib/orchestrator'
import { ServiceRegistry } from '@/lib/service-registry'

// Global instance to maintain state
let orchestrator: Orchestrator | null = null

function getOrchestrator(): Orchestrator {
  if (!orchestrator) {
    orchestrator = new Orchestrator()
  }
  return orchestrator
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const orchestrator = getOrchestrator()

    switch (action) {
      case 'status':
        const status = await orchestrator.getStatus()
        return NextResponse.json({ success: true, data: status })

      case 'tasks':
        const tasks = await orchestrator.getTasks()
        return NextResponse.json({ success: true, data: tasks })

      case 'services':
        const registry = new ServiceRegistry()
        await registry.initialize()
        const services = registry.getAllServices()
        return NextResponse.json({ success: true, data: services })

      case 'health':
        const health = await orchestrator.healthCheck()
        return NextResponse.json({ success: true, data: { healthy: health } })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use ?action=status, ?action=tasks, ?action=services, or ?action=health'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Orchestrator API GET error:', error)
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
    const orchestrator = getOrchestrator()
    const body = await request.json()

    switch (action) {
      case 'initialize':
        await orchestrator.initialize()
        return NextResponse.json({ success: true, message: 'Orchestrator initialized' })

      case 'create-task':
        const { taskId, serviceId, action: taskAction, params } = body
        if (!taskId || !serviceId || !taskAction) {
          return NextResponse.json(
            { success: false, error: 'taskId, serviceId, and action are required' },
            { status: 400 }
          )
        }

        const taskResult = await orchestrator.createTask({
          id: taskId,
          serviceId,
          action: taskAction,
          params,
          priority: body.priority || 'normal',
          retries: body.retries || 3,
        })

        return NextResponse.json({ success: true, data: taskResult })

      case 'execute-task':
        const { taskId: execTaskId } = body
        if (!execTaskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          )
        }

        const executionResult = await orchestrator.executeTask(execTaskId)
        return NextResponse.json({ success: true, data: executionResult })

      case 'cancel-task':
        const { taskId: cancelTaskId } = body
        if (!cancelTaskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          )
        }

        const cancelResult = await orchestrator.cancelTask(cancelTaskId)
        return NextResponse.json({ success: true, data: cancelResult })

      case 'register-service':
        const { service } = body
        if (!service) {
          return NextResponse.json(
            { success: false, error: 'service object is required' },
            { status: 400 }
          )
        }

        const registry = new ServiceRegistry()
        await registry.initialize()
        const registrationResult = registry.registerService(service)
        return NextResponse.json({ success: true, data: registrationResult })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Orchestrator API POST error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}