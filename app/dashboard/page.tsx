'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SystemDashboard } from "@/components/system-dashboard"
import { 
  Activity, 
  Bot, 
  Brain,
  Cloud, 
  Database, 
  Globe, 
  Mail, 
  Monitor, 
  Plus, 
  RefreshCw, 
  Server, 
  Settings, 
  Shield, 
  Users, 
  Zap,
  Workflow,
  RotateCcw,
  Target,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle
} from "lucide-react"

interface ServiceStatus {
  id: string
  name: string
  category: string
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  lastUsed: string
  usage: {
    current: number
    limit: number
    percentage: number
  }
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  action: () => void
  disabled?: boolean
}

export default function DashboardPage() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Mock data - replace with actual API calls
    const mockServices: ServiceStatus[] = [
      {
        id: 'openai',
        name: 'OpenAI GPT-4',
        category: 'AI',
        status: 'connected',
        lastUsed: '2 hours ago',
        usage: { current: 800, limit: 1000, percentage: 80 }
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        category: 'AI',
        status: 'connected',
        lastUsed: '1 hour ago',
        usage: { current: 450, limit: 500, percentage: 90 }
      },
      {
        id: 'browserbase',
        name: 'Browserbase',
        category: 'Automation',
        status: 'connected',
        lastUsed: '30 minutes ago',
        usage: { current: 120, limit: 200, percentage: 60 }
      },
      {
        id: 'protonmail',
        name: 'ProtonMail',
        category: 'Email',
        status: 'connected',
        lastUsed: '5 hours ago',
        usage: { current: 50, limit: 500, percentage: 10 }
      },
      {
        id: 'netlify',
        name: 'Netlify',
        category: 'Hosting',
        status: 'connected',
        lastUsed: '1 day ago',
        usage: { current: 5, limit: 100, percentage: 5 }
      },
      {
        id: 'supabase',
        name: 'Supabase',
        category: 'Database',
        status: 'error',
        lastUsed: '3 days ago',
        usage: { current: 0, limit: 500, percentage: 0 }
      }
    ]

    setServices(mockServices)
    setIsLoading(false)
  }, [])

  const quickActions: QuickAction[] = [
    {
      id: 'auto-register',
      title: 'Auto-Register Services',
      description: 'Automatically register for new services using AI',
      icon: Bot,
      action: () => console.log('Auto-register services')
    },
    {
      id: 'optimize-quotas',
      title: 'Optimize AI Quotas',
      description: 'Analyze and optimize AI service usage',
      icon: Brain,
      action: () => console.log('Optimize quotas')
    },
    {
      id: 'rotate-profiles',
      title: 'Rotate Profiles',
      description: 'Switch to fresh user profiles',
      icon: RotateCcw,
      action: () => console.log('Rotate profiles')
    },
    {
      id: 'update-proxies',
      title: 'Update Proxy Pool',
      description: 'Refresh and validate proxy connections',
      icon: Globe,
      action: () => console.log('Update proxies')
    },
    {
      id: 'run-workflow',
      title: 'Run Stagehand Workflow',
      description: 'Execute automated service workflows',
      icon: Workflow,
      action: () => console.log('Run workflow')
    },
    {
      id: 'analyze-dependencies',
      title: 'Analyze Dependencies',
      description: 'Map service interdependencies',
      icon: Target,
      action: () => console.log('Analyze dependencies')
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5" />
            <span>FreebeeZ</span>
          </Link>
          <nav className="ml-auto flex gap-4 sm:gap-6">
            <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
              Dashboard
            </Link>
            <Link href="/services" className="text-sm font-medium hover:underline underline-offset-4">
              Services
            </Link>
            <Link href="/cloud-storage" className="text-sm font-medium hover:underline underline-offset-4">
              Cloud Storage
            </Link>
            <Link href="/automations" className="text-sm font-medium hover:underline underline-offset-4">
              Automations
            </Link>
            <Link href="/settings" className="text-sm font-medium hover:underline underline-offset-4">
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your free services and automation workflows
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connected Services</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {services.filter(s => s.status === 'connected').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {services.length} total services
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Services</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {services.filter(s => s.category === 'AI').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active AI integrations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Automation Tasks</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  5 running, 7 completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="system">System Health</TabsTrigger>
              <TabsTrigger value="automations">Automations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks and automation workflows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action) => {
                      const IconComponent = action.icon
                      return (
                        <Button
                          key={action.id}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start space-y-2"
                          onClick={action.action}
                          disabled={action.disabled}
                        >
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-5 w-5" />
                            <span className="font-medium">{action.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground text-left">
                            {action.description}
                          </p>
                        </Button>
                      )
                    })}
                    {/* Frankenstein Storage Quick Action */}
                    <Link href="/cloud-storage">
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Cloud className="h-5 w-5" />
                          <span className="font-medium">Frankenstein Storage</span>
                        </div>
                        <p className="text-sm text-muted-foreground text-left">
                          Manage unified cloud storage from multiple providers
                        </p>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest service interactions and automation results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">OpenAI GPT-4 API call successful</p>
                        <p className="text-xs text-muted-foreground">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Profile rotation completed</p>
                        <p className="text-xs text-muted-foreground">15 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Browserbase session started</p>
                        <p className="text-xs text-muted-foreground">1 hour ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New service registered: Netlify</p>
                        <p className="text-xs text-muted-foreground">3 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{service.name}</CardTitle>
                        {getStatusIcon(service.status)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {service.category}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(service.status)}`}>
                          {service.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usage</span>
                          <span>{service.usage.current}/{service.usage.limit}</span>
                        </div>
                        <Progress 
                          value={service.usage.percentage} 
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Last used: {service.lastUsed}
                        </p>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1">
                          Configure
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              <SystemDashboard />
            </TabsContent>

            <TabsContent value="automations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Automation Workflows</CardTitle>
                  <CardDescription>
                    Manage your automated service workflows and tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Workflow className="h-8 w-8 text-blue-500" />
                        <div>
                          <h3 className="font-medium">Daily Service Health Check</h3>
                          <p className="text-sm text-muted-foreground">
                            Monitors all connected services and reports issues
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                        <Button size="sm" variant="outline">
                          Configure
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Bot className="h-8 w-8 text-purple-500" />
                        <div>
                          <h3 className="font-medium">Auto Service Registration</h3>
                          <p className="text-sm text-muted-foreground">
                            Automatically registers for new services when quotas are low
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>
                        <Button size="sm" variant="outline">
                          Configure
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <RotateCcw className="h-8 w-8 text-orange-500" />
                        <div>
                          <h3 className="font-medium">Profile Rotation Schedule</h3>
                          <p className="text-sm text-muted-foreground">
                            Rotates user profiles every 24 hours for better anonymity
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                        <Button size="sm" variant="outline">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Workflow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}