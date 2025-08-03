'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Activity, 
  Brain, 
  Cloud, 
  Database, 
  Globe, 
  Monitor, 
  RefreshCw, 
  Server, 
  Shield, 
  Users, 
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SystemHealth {
  aiServices: {
    quotas: any[]
    totalServices: number
    healthyServices: number
  }
  proxySystem: {
    pools: number
    totalProxies: number
    activeProxies: number
    averageHealth: number
  }
  profileSystem: {
    pools: number
    totalProfiles: number
    activeProfiles: number
  }
  orchestration: {
    activeTasks: number
    queuedTasks: number
    completedTasks: number
    failedTasks: number
  }
  pythonBridge: {
    queueLength: number
    activeProcesses: number
  }
}

interface ServiceMetrics {
  timestamp: string
  activeServices: number
  successRate: number
  responseTime: number
  errorRate: number
}

interface QuotaUsage {
  service: string
  used: number
  limit: number
  percentage: number
  resetDate: string
}

export function SystemDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [metrics, setMetrics] = useState<ServiceMetrics[]>([])
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchSystemHealth()
    fetchMetrics()
    fetchQuotaUsage()

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemHealth()
        fetchMetrics()
        fetchQuotaUsage()
      }, 30000) // Update every 30 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchSystemHealth = async () => {
    try {
      // Mock data - replace with actual API call
      const mockHealth: SystemHealth = {
        aiServices: {
          quotas: [
            { serviceId: 'openai', remainingQuota: 800, totalQuota: 1000 },
            { serviceId: 'anthropic', remainingQuota: 450, totalQuota: 500 },
            { serviceId: 'huggingface', remainingQuota: 2000, totalQuota: 2000 }
          ],
          totalServices: 3,
          healthyServices: 2
        },
        proxySystem: {
          pools: 3,
          totalProxies: 25,
          activeProxies: 18,
          averageHealth: 87.5
        },
        profileSystem: {
          pools: 2,
          totalProfiles: 50,
          activeProfiles: 12
        },
        orchestration: {
          activeTasks: 5,
          queuedTasks: 8,
          completedTasks: 142,
          failedTasks: 7
        },
        pythonBridge: {
          queueLength: 3,
          activeProcesses: 2
        }
      }

      setSystemHealth(mockHealth)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      // Mock metrics data
      const mockMetrics: ServiceMetrics[] = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
        activeServices: Math.floor(Math.random() * 20) + 10,
        successRate: Math.random() * 20 + 80,
        responseTime: Math.random() * 1000 + 200,
        errorRate: Math.random() * 5
      }))

      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  }

  const fetchQuotaUsage = async () => {
    try {
      // Mock quota data
      const mockQuotas: QuotaUsage[] = [
        { service: 'OpenAI GPT-4', used: 800, limit: 1000, percentage: 80, resetDate: '2024-02-01' },
        { service: 'Anthropic Claude', used: 450, limit: 500, percentage: 90, resetDate: '2024-02-01' },
        { service: '2captcha', used: 150, limit: 1000, percentage: 15, resetDate: '2024-02-01' },
        { service: 'Browserbase', used: 120, limit: 200, percentage: 60, resetDate: '2024-02-01' }
      ]

      setQuotaUsage(mockQuotas)
    } catch (error) {
      console.error('Failed to fetch quota usage:', error)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    fetchSystemHealth()
    fetchMetrics()
    fetchQuotaUsage()
  }

  const getHealthStatus = (percentage: number) => {
    if (percentage >= 80) return { status: 'healthy', color: 'text-green-600', icon: CheckCircle }
    if (percentage >= 60) return { status: 'warning', color: 'text-yellow-600', icon: AlertTriangle }
    return { status: 'critical', color: 'text-red-600', icon: XCircle }
  }

  const getQuotaStatus = (percentage: number) => {
    if (percentage >= 90) return 'critical'
    if (percentage >= 75) return 'warning'
    return 'healthy'
  }

  if (isLoading && !systemHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading system dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Services</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.aiServices.healthyServices}/{systemHealth?.aiServices.totalServices}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((systemHealth?.aiServices.healthyServices || 0) / (systemHealth?.aiServices.totalServices || 1) * 100)}% healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proxy System</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.proxySystem.activeProxies}/{systemHealth?.proxySystem.totalProxies}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemHealth?.proxySystem.averageHealth.toFixed(1)}% avg health
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.orchestration.activeTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemHealth?.orchestration.queuedTasks} queued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Pools</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.profileSystem.activeProfiles}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemHealth?.profileSystem.totalProfiles} total profiles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Health Chart */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Success rate and response time over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: number, name: string) => [
                        name === 'successRate' ? `${value.toFixed(1)}%` : 
                        name === 'responseTime' ? `${value.toFixed(0)}ms` : value,
                        name === 'successRate' ? 'Success Rate' :
                        name === 'responseTime' ? 'Response Time' : name
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="responseTime" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
                <CardDescription>Current orchestration task status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: systemHealth?.orchestration.completedTasks || 0, color: '#10b981' },
                        { name: 'Active', value: systemHealth?.orchestration.activeTasks || 0, color: '#3b82f6' },
                        { name: 'Queued', value: systemHealth?.orchestration.queuedTasks || 0, color: '#f59e0b' },
                        { name: 'Failed', value: systemHealth?.orchestration.failedTasks || 0, color: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { name: 'Completed', value: systemHealth?.orchestration.completedTasks || 0, color: '#10b981' },
                        { name: 'Active', value: systemHealth?.orchestration.activeTasks || 0, color: '#3b82f6' },
                        { name: 'Queued', value: systemHealth?.orchestration.queuedTasks || 0, color: '#f59e0b' },
                        { name: 'Failed', value: systemHealth?.orchestration.failedTasks || 0, color: '#ef4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* System Alerts */}
          <div className="space-y-2">
            {quotaUsage.filter(q => q.percentage >= 90).map((quota) => (
              <Alert key={quota.service} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Critical Quota Usage</AlertTitle>
                <AlertDescription>
                  {quota.service} is at {quota.percentage}% capacity ({quota.used}/{quota.limit})
                </AlertDescription>
              </Alert>
            ))}
            
            {quotaUsage.filter(q => q.percentage >= 75 && q.percentage < 90).map((quota) => (
              <Alert key={quota.service}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>High Quota Usage</AlertTitle>
                <AlertDescription>
                  {quota.service} is at {quota.percentage}% capacity ({quota.used}/{quota.limit})
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Performance Metrics</CardTitle>
                <CardDescription>Comprehensive system performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="activeServices" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="successRate" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="errorRate" stackId="3" stroke="#ffc658" fill="#ffc658" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quotaUsage.map((quota) => {
              const status = getQuotaStatus(quota.percentage)
              return (
                <Card key={quota.service}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {quota.service}
                      <Badge variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'secondary' : 'default'}>
                        {quota.percentage}%
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {quota.used.toLocaleString()} / {quota.limit.toLocaleString()} used
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress 
                      value={quota.percentage} 
                      className={`w-full ${
                        status === 'critical' ? 'bg-red-100' : 
                        status === 'warning' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Resets on {new Date(quota.resetDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* AI Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  AI Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemHealth?.aiServices.quotas.map((quota, index) => {
                    const health = getHealthStatus((quota.remainingQuota / quota.totalQuota) * 100)
                    const HealthIcon = health.icon
                    return (
                      <div key={quota.serviceId} className="flex items-center justify-between">
                        <span className="text-sm">{quota.serviceId}</span>
                        <div className="flex items-center">
                          <HealthIcon className={`h-4 w-4 ${health.color}`} />
                          <span className="text-xs ml-1">
                            {quota.remainingQuota}/{quota.totalQuota}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Proxy System */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Proxy System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Pools</span>
                    <span className="text-sm font-medium">{systemHealth?.proxySystem.pools}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Proxies</span>
                    <span className="text-sm font-medium">
                      {systemHealth?.proxySystem.activeProxies}/{systemHealth?.proxySystem.totalProxies}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Health</span>
                    <span className="text-sm font-medium">{systemHealth?.proxySystem.averageHealth.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Python Bridge */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Python Bridge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Queue Length</span>
                    <span className="text-sm font-medium">{systemHealth?.pythonBridge.queueLength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Processes</span>
                    <span className="text-sm font-medium">{systemHealth?.pythonBridge.activeProcesses}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}