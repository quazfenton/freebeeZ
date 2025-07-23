"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Check, ChevronRight, Database, Globe, MessageSquare, Zap } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"

export default function CreateAutomationPage() {
  const [step, setStep] = useState(1)
  const [automationType, setAutomationType] = useState("")

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center gap-4">
          <Link href="/automations">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Create Automation</h1>
        </div>

        <div className="flex items-center space-x-2 mb-8">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "border"}`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "border"}`}
          >
            {step > 2 ? <Check className="h-4 w-4" /> : "2"}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? "bg-primary text-primary-foreground" : "border"}`}
          >
            {step > 3 ? <Check className="h-4 w-4" /> : "3"}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 4 ? "bg-primary text-primary-foreground" : "border"}`}
          >
            {step > 4 ? <Check className="h-4 w-4" /> : "4"}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Select Automation Type</h2>
            <p className="text-muted-foreground">Choose the type of automation you want to create</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${automationType === "service-connector" ? "border-primary" : ""}`}
                onClick={() => setAutomationType("service-connector")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Service Connector
                  </CardTitle>
                  <CardDescription>Connect two or more services together</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create an automation that connects multiple services to work together, such as connecting a VOIP
                    service to a SIP provider.
                  </p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${automationType === "service-rotation" ? "border-primary" : ""}`}
                onClick={() => setAutomationType("service-rotation")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Service Rotation
                  </CardTitle>
                  <CardDescription>Rotate between similar services</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create an automation that rotates between similar services to maximize free tier usage, such as
                    switching between AI providers.
                  </p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${automationType === "limit-monitor" ? "border-primary" : ""}`}
                onClick={() => setAutomationType("limit-monitor")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Limit Monitor
                  </CardTitle>
                  <CardDescription>Monitor and manage service limits</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create an automation that monitors service usage limits and takes actions when limits are
                    approaching.
                  </p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${automationType === "credential-manager" ? "border-primary" : ""}`}
                onClick={() => setAutomationType("credential-manager")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Credential Manager
                  </CardTitle>
                  <CardDescription>Manage and rotate credentials</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create an automation that manages and rotates credentials for services that require periodic
                    changes.
                  </p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${automationType === "custom" ? "border-primary" : ""}`}
                onClick={() => setAutomationType("custom")}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Custom Automation
                  </CardTitle>
                  <CardDescription>Build a custom automation</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create a fully custom automation with your own logic and workflow.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)} disabled={!automationType}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Select Services</h2>
            <p className="text-muted-foreground">Choose the services you want to include in your automation</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Free VOIP Service
                  </CardTitle>
                  <CardDescription>Communication</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-primary">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Free SIP Provider
                  </CardTitle>
                  <CardDescription>Communication</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-primary">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Free Subdomain Service
                  </CardTitle>
                  <CardDescription>Web Infrastructure</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border">
                      <div className="h-2.5 w-2.5 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Static Hosting Platform
                  </CardTitle>
                  <CardDescription>Web Infrastructure</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border">
                      <div className="h-2.5 w-2.5 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Free Database Provider
                  </CardTitle>
                  <CardDescription>Computing & Storage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border">
                      <div className="h-2.5 w-2.5 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Free AI Inference API
                  </CardTitle>
                  <CardDescription>AI & ML</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Connected</p>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border">
                      <div className="h-2.5 w-2.5 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Configure Automation</h2>
            <p className="text-muted-foreground">Set up the details and behavior of your automation</p>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Automation Name</Label>
                  <Input id="name" placeholder="Enter a name for your automation" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger">Trigger Type</Label>
                  <Select defaultValue="schedule">
                    <SelectTrigger id="trigger">
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="limit">Limit Reached</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe what this automation does" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule (if applicable)</Label>
                <Select defaultValue="hourly">
                  <SelectTrigger id="schedule">
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Action Type</Label>
                <Select defaultValue="connect">
                  <SelectTrigger id="action">
                    <SelectValue placeholder="Select action type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connect">Connect Services</SelectItem>
                    <SelectItem value="rotate">Rotate Services</SelectItem>
                    <SelectItem value="monitor">Monitor Limits</SelectItem>
                    <SelectItem value="backup">Backup Data</SelectItem>
                    <SelectItem value="custom">Custom Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Review & Create</h2>
            <p className="text-muted-foreground">Review your automation settings before creating</p>

            <Card>
              <CardHeader>
                <CardTitle>Automation Summary</CardTitle>
                <CardDescription>VOIP to SIP Bridge</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="font-medium">Type</div>
                  <div className="text-sm text-muted-foreground">Service Connector</div>
                </div>
                <div className="grid gap-2">
                  <div className="font-medium">Services</div>
                  <div className="text-sm text-muted-foreground">Free VOIP Service, Free SIP Provider</div>
                </div>
                <div className="grid gap-2">
                  <div className="font-medium">Trigger</div>
                  <div className="text-sm text-muted-foreground">Schedule (Hourly)</div>
                </div>
                <div className="grid gap-2">
                  <div className="font-medium">Action</div>
                  <div className="text-sm text-muted-foreground">Connect Services</div>
                </div>
                <div className="grid gap-2">
                  <div className="font-medium">Description</div>
                  <div className="text-sm text-muted-foreground">
                    This automation connects the Free VOIP Service with the Free SIP Provider to create a unified
                    communication system.
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button>
                Create Automation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DashboardShell>
    </div>
  )
}
