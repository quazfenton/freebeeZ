"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Square,
  RefreshCw,
  Zap,
  Database,
  Globe,
  MessageSquare,
  Eye,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface TaskResult {
  serviceId: string
  serviceName: string
  success: boolean
  error?: string
  credentials?: {
    username: string
    password: string
    email: string
  }
  timestamp: Date
  duration: number
}

interface OrchestrationTask {
  id: string
  name: string
  type: 'auto_registration' | 'bulk_registration' | 'credential_rotation' | 'health_check'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  progress: number
  services: string[]
  results: TaskResult[]
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration?: number
  config: {
    maxConcurrent?: number
    retryAttempts?: number
    delayBetweenTasks?: number
  }
}

interface OrchestrationTaskManagerProps {
  tasks: OrchestrationTask[]
  onTaskAction?: (taskId: string, action: 'start' | 'pause' | 'resume' | 'cancel' | 'delete') => void
  onCreateTask?: (type: string, config: any) => void
  onRefresh?: () => void
}

export function OrchestrationTaskManager({
  tasks,
  onTaskAction,
  onCreateTask,
  onRefresh
}: OrchestrationTaskManagerProps) {
  const [selectedTask, setSelectedTask] = useState<OrchestrationTask | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusColor = (status: OrchestrationTask['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500'
      case 'running':
        return 'text-blue-500'
      case 'paused':
        return 'text-yellow-500'
      case 'failed':
        return 'text-red-500'
      case 'cancelled':
        return 'text-gray-500'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: OrchestrationTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadgeVariant = (status: OrchestrationTask['status']) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'running':
        return 'default'
      case 'paused':
        return 'secondary'
      case 'failed':
        return 'destructive'
      case 'cancelled':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getTypeIcon = (type: OrchestrationTask['type']) => {
    switch (type) {
      case 'auto_registration':
        return <Zap className="h-4 w-4" />
      case 'bulk_registration':
        return <Database className="h-4 w-4" />
      case 'credential_rotation':
        return <RefreshCw className="h-4 w-4" />
      case 'health_check':
        return <Activity className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getSuccessRate = (task: OrchestrationTask) => {
    if (task.results.length === 0) return 0
    const successful = task.results.filter(r => r.success).length
    return (successful / task.results.length) * 100
  }

  const runningTasks = tasks.filter(t => t.status === 'running').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const failedTasks = tasks.filter(t => t.status === 'failed').length
  const totalTasks = tasks.length

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{runningTasks}</div>
            <p className="text-xs text-muted-foreground">Currently processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Task completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{failedTasks}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orchestration Tasks</CardTitle>
              <CardDescription>
                Manage and monitor automated service registration tasks
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="sm" 
                onClick={() => onCreateTask?.('auto_registration', {})}
              >
                <Zap className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active Tasks</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <div className="space-y-4">
                {tasks
                  .filter(task => ['pending', 'running', 'paused'].includes(task.status))
                  .map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onAction={onTaskAction}
                      onViewDetails={setSelectedTask}
                    />
                  ))}
                {tasks.filter(task => ['pending', 'running', 'paused'].includes(task.status)).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active tasks</p>
                    <p className="text-sm">Create a new task to get started</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <div className="space-y-4">
                {tasks
                  .filter(task => ['completed', 'failed', 'cancelled'].includes(task.status))
                  .map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onAction={onTaskAction}
                      onViewDetails={setSelectedTask}
                    />
                  ))}
                {tasks.filter(task => ['completed', 'failed', 'cancelled'].includes(task.status)).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No completed tasks</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onAction={onTaskAction}
                    onViewDetails={setSelectedTask}
                  />
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks yet</p>
                    <p className="text-sm">Create your first orchestration task</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      {selectedTask && (
        <TaskDetailsDialog 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}

function TaskCard({ 
  task, 
  onAction, 
  onViewDetails 
}: { 
  task: OrchestrationTask
  onAction?: (taskId: string, action: string) => void
  onViewDetails?: (task: OrchestrationTask) => void
}) {
  const getTypeIcon = (type: OrchestrationTask['type']) => {
    switch (type) {
      case 'auto_registration':
        return <Zap className="h-4 w-4" />
      case 'bulk_registration':
        return <Database className="h-4 w-4" />
      case 'credential_rotation':
        return <RefreshCw className="h-4 w-4" />
      case 'health_check':
        return <Activity className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: OrchestrationTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadgeVariant = (status: OrchestrationTask['status']) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'running':
        return 'default'
      case 'paused':
        return 'secondary'
      case 'failed':
        return 'destructive'
      case 'cancelled':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getSuccessRate = (task: OrchestrationTask) => {
    if (task.results.length === 0) return 0
    const successful = task.results.filter(r => r.success).length
    return (successful / task.results.length) * 100
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getTypeIcon(task.type)}
            <div>
              <h3 className="font-medium">{task.name}</h3>
              <p className="text-sm text-muted-foreground">
                {task.type.replace('_', ' ').toUpperCase()} • {task.services.length} services
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium">
                Progress: {task.progress}%
              </div>
              <Progress value={task.progress} className="w-24 h-2" />
            </div>
            
            <div className="text-right">
              <div className="text-sm font-medium">
                Success: {getSuccessRate(task).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {task.results.filter(r => r.success).length}/{task.results.length} completed
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusIcon(task.status)}
              <Badge variant={getStatusBadgeVariant(task.status)}>
                {task.status}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(task)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {task.status === 'running' && (
                  <DropdownMenuItem onClick={() => onAction?.(task.id, 'pause')}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </DropdownMenuItem>
                )}
                {task.status === 'paused' && (
                  <DropdownMenuItem onClick={() => onAction?.(task.id, 'resume')}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </DropdownMenuItem>
                )}
                {['pending', 'running', 'paused'].includes(task.status) && (
                  <DropdownMenuItem onClick={() => onAction?.(task.id, 'cancel')}>
                    <Square className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                )}
                {['completed', 'failed', 'cancelled'].includes(task.status) && (
                  <DropdownMenuItem 
                    onClick={() => onAction?.(task.id, 'delete')}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {task.status === 'running' && task.estimatedDuration && (
          <div className="mt-3 text-xs text-muted-foreground">
            Estimated completion: {new Date(Date.now() + task.estimatedDuration).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TaskDetailsDialog({ 
  task, 
  onClose 
}: { 
  task: OrchestrationTask
  onClose: () => void
}) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{task.name}</DialogTitle>
          <DialogDescription>
            Task details and execution results
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Task Overview */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Task Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium">{task.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                      {task.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Services:</span>
                    <span className="font-medium">{task.services.length}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Timing</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium">{task.createdAt.toLocaleString()}</span>
                  </div>
                  {task.startedAt && (
                    <div className="flex justify-between">
                      <span>Started:</span>
                      <span className="font-medium">{task.startedAt.toLocaleString()}</span>
                    </div>
                  )}
                  {task.completedAt && (
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium">{task.completedAt.toLocaleString()}</span>
                    </div>
                  )}
                  {task.startedAt && task.completedAt && (
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">
                        {formatDuration(task.completedAt.getTime() - task.startedAt.getTime())}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Configuration */}
            <div>
              <h4 className="font-medium mb-2">Configuration</h4>
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div className="flex justify-between">
                  <span>Max Concurrent:</span>
                  <span className="font-medium">{task.config.maxConcurrent || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Retry Attempts:</span>
                  <span className="font-medium">{task.config.retryAttempts || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delay Between Tasks:</span>
                  <span className="font-medium">
                    {task.config.delayBetweenTasks ? `${task.config.delayBetweenTasks}ms` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Results */}
            <div>
              <h4 className="font-medium mb-2">Execution Results</h4>
              <div className="space-y-2">
                {task.results.map((result, index) => (
                  <Card key={index} className={`p-3 ${result.success ? 'border-green-200' : 'border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">{result.serviceName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(result.duration)}
                      </div>
                    </div>
                    
                    {result.success && result.credentials && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                        <div className="font-medium text-green-800 mb-1">Credentials Created:</div>
                        <div className="space-y-1 text-green-700">
                          <div>Email: {result.credentials.email}</div>
                          <div>Username: {result.credentials.username}</div>
                          <div>Password: {result.credentials.password}</div>
                        </div>
                      </div>
                    )}
                    
                    {!result.success && result.error && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                        <div className="font-medium text-red-800 mb-1">Error:</div>
                        <div className="text-red-700">{result.error}</div>
                      </div>
                    )}
                  </Card>
                ))}
                
                {task.results.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No results yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}