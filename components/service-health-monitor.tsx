"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  AlertTriangle,
  Info
} from "lucide-react"

interface ServiceHealth {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  uptime: number
  responseTime: number
  lastCheck: Date
  usagePercent: number
  limitWarnings: string[]
  errors: string[]
  metrics: {
    requestsPerMinute: number
    errorRate: number
    avgResponseTime: number
  }
}

interface ServiceHealthMonitorProps {
  services: ServiceHealth[]
  onRefresh?: () => void
  onServiceClick?: (serviceId: string) => void
}

export function ServiceHealthMonitor({ 
  services, 
  onRefresh, 
  onServiceClick 
}: ServiceHealthMonitorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedService, setSelectedService] = useState<string | null>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'critical':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'default'
      case 'warning':
        return 'secondary'
      case 'critical':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const healthyServices = services.filter(s => s.status === 'healthy').length
  const warningServices = services.filter(s => s.status === 'warning').length
  const criticalServices = services.filter(s => s.status === 'critical').length
  const overallHealth = services.length > 0 ? (healthyServices / services.length) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallHealth)}%</div>
            <Progress value={overallHealth} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {healthyServices} healthy, {warningServices} warnings, {criticalServices} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Services</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{healthyServices}</div>
            <p className="text-xs text-muted-foreground">
              {services.length > 0 ? Math.round((healthyServices / services.length) * 100) : 0}% of total services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningServices}</div>
            <p className="text-xs text-muted-foreground">
              Services approaching limits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{criticalServices}</div>
            <p className="text-xs text-muted-foreground">
              Services requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Health Monitor</CardTitle>
              <CardDescription>
                Real-time monitoring of all connected services
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Detailed View</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4">
                {services.map((service) => (
                  <Card 
                    key={service.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedService === service.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedService(service.id)
                      onServiceClick?.(service.id)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(service.status)}
                          <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Last checked: {service.lastCheck.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {service.uptime.toFixed(1)}% uptime
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {service.responseTime}ms avg
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {service.usagePercent.toFixed(0)}% used
                            </div>
                            <Progress 
                              value={service.usagePercent} 
                              className="w-20 h-2"
                            />
                          </div>
                          
                          <Badge variant={getStatusBadgeVariant(service.status)}>
                            {service.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {service.limitWarnings.length > 0 && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium text-yellow-800">
                              Limit Warnings
                            </span>
                          </div>
                          <ul className="mt-1 text-xs text-yellow-700">
                            {service.limitWarnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {service.errors.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded-md">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-800">
                              Recent Errors
                            </span>
                          </div>
                          <ul className="mt-1 text-xs text-red-700">
                            {service.errors.slice(0, 3).map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                            {service.errors.length > 3 && (
                              <li>• ... and {service.errors.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="grid gap-4">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(service.status)}
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                        </div>
                        <Badge variant={getStatusBadgeVariant(service.status)}>
                          {service.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <h4 className="font-medium">Performance Metrics</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Uptime:</span>
                              <span className="font-medium">{service.uptime.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Response Time:</span>
                              <span className="font-medium">{service.responseTime}ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Requests/min:</span>
                              <span className="font-medium">{service.metrics.requestsPerMinute}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Error Rate:</span>
                              <span className="font-medium">{service.metrics.errorRate.toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Usage Information</h4>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Usage:</span>
                                <span>{service.usagePercent.toFixed(1)}%</span>
                              </div>
                              <Progress value={service.usagePercent} />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Last updated: {service.lastCheck.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium">Status Details</h4>
                          <div className="space-y-1 text-sm">
                            {service.limitWarnings.length > 0 && (
                              <div>
                                <span className="text-yellow-600 font-medium">Warnings:</span>
                                <ul className="mt-1 text-xs">
                                  {service.limitWarnings.map((warning, index) => (
                                    <li key={index} className="text-yellow-700">• {warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {service.errors.length > 0 && (
                              <div>
                                <span className="text-red-600 font-medium">Errors:</span>
                                <ul className="mt-1 text-xs">
                                  {service.errors.map((error, index) => (
                                    <li key={index} className="text-red-700">• {error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {service.limitWarnings.length === 0 && service.errors.length === 0 && (
                              <div className="flex items-center space-x-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>All systems operational</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="space-y-4">
                {/* Critical Alerts */}
                {criticalServices > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <CardTitle className="text-red-700">Critical Alerts</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {services
                          .filter(s => s.status === 'critical')
                          .map(service => (
                            <div key={service.id} className="p-3 bg-red-50 rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-red-800">{service.name}</span>
                                <Badge variant="destructive">Critical</Badge>
                              </div>
                              {service.errors.length > 0 && (
                                <ul className="mt-2 text-sm text-red-700">
                                  {service.errors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Warning Alerts */}
                {warningServices > 0 && (
                  <Card className="border-yellow-200">
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <CardTitle className="text-yellow-700">Warning Alerts</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {services
                          .filter(s => s.status === 'warning')
                          .map(service => (
                            <div key={service.id} className="p-3 bg-yellow-50 rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-yellow-800">{service.name}</span>
                                <Badge variant="secondary">Warning</Badge>
                              </div>
                              {service.limitWarnings.length > 0 && (
                                <ul className="mt-2 text-sm text-yellow-700">
                                  {service.limitWarnings.map((warning, index) => (
                                    <li key={index}>• {warning}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* No Alerts */}
                {criticalServices === 0 && warningServices === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-green-700 mb-2">
                        All Services Healthy
                      </h3>
                      <p className="text-muted-foreground">
                        No alerts or warnings at this time. All services are operating normally.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}