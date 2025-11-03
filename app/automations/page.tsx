import Link from \"next/link\"
import { Button } from \"@/components/ui/button\"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Cloud, Filter, Plus, Search, Settings, Zap } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { AutomationCard } from "@/components/automation-card"

export default function AutomationsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          <Link href="/automations/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Automation
            </Button>
          </Link>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search automations..." className="w-full bg-background pl-8" />
          </div>
          <Button variant="outline" size="sm" className="ml-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Active Automations</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AutomationCard
                title="VOIP to SIP Bridge"
                description="Automatically routes calls between free VOIP and SIP services"
                status="active"
                lastRun="10 minutes ago"
                services={["Free VOIP Service", "Free SIP Provider"]}
              />
              <AutomationCard
                title="Subdomain to Hosting Connector"
                description="Links new subdomains to hosting automatically"
                status="active"
                lastRun="2 hours ago"
                services={["Free Subdomain Service", "Static Hosting Platform"]}
              />
              <AutomationCard
                title="AI Model Rotation"
                description="Switches between free AI providers based on usage limits"
                status="active"
                lastRun="30 minutes ago"
                services={["Free AI Inference API", "Open Source AI Model"]}
              />
              <AutomationCard
                title="Proxy Load Balancer"
                description="Distributes requests across free proxy services"
                status="warning"
                lastRun="5 minutes ago"
                services={["Free Proxy Service A", "Free Proxy Service B"]}
              />
            </div>
            <h2 className="text-xl font-bold tracking-tight mt-8">Recommended Automations</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Database Backup Rotation
                  </CardTitle>
                  <CardDescription>Computing & Storage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Automatically rotate backups between free storage providers to maximize space.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Create
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Frankenstein Storage Manager
                  </CardTitle>
                  <CardDescription>Computing & Storage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Unified management of multiple cloud storage providers with automatic backup and space optimization.
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href="/cloud-storage">
                    <Button variant="outline" className="w-full">
                      Configure
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Credential Rotation
                  </CardTitle>
                  <CardDescription>Security</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Automatically rotate credentials for services that require periodic changes.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Create
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Service Health Monitor
                  </CardTitle>
                  <CardDescription>Monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Automatically check service health and switch to alternatives if issues are detected.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Create
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="templates" className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Automation Templates</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    VOIP Service Connector
                  </CardTitle>
                  <CardDescription>Communication</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Connect multiple free VOIP services to create a unified communication system.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Use Template
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Web Hosting Chain
                  </CardTitle>
                  <CardDescription>Web Infrastructure</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Automatically connect free subdomains, SSL certificates, and hosting services.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Use Template
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    AI Service Rotation
                  </CardTitle>
                  <CardDescription>AI & ML</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Automatically rotate between free AI inference providers to maximize usage.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Use Template
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Frankenstein Storage Template
                  </CardTitle>
                  <CardDescription>Computing & Storage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Pre-configured automation for unified cloud storage management across providers.
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href="/cloud-storage">
                    <Button variant="outline" className="w-full">
                      Use Template
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Database Backup Chain
                  </CardTitle>
                  <CardDescription>Computing & Storage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create automated backups across multiple free storage providers.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Use Template
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Proxy Rotation
                  </CardTitle>
                  <CardDescription>Networking</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Automatically rotate between free proxy services to avoid rate limits.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Use Template
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DashboardShell>
    </div>
  )
}
