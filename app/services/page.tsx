import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowRight,
  Cloud,
  Database,
  Filter,
  Globe,
  MessageSquare,
  Plus,
  Search,
  Server,
  Shield,
  Zap,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ServiceCard } from "@/components/service-card"

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <Link href="/services/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </Link>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search services..." className="w-full bg-background pl-8" />
          </div>
          <Button variant="outline" size="sm" className="ml-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="connected">Connected</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Your Connected Services</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ServiceCard
                title="Free VOIP Service"
                category="Communication"
                icon={<MessageSquare className="h-5 w-5" />}
                status="active"
                usagePercent={45}
                lastUsed="2 hours ago"
              />
              <ServiceCard
                title="Free SIP Provider"
                category="Communication"
                icon={<MessageSquare className="h-5 w-5" />}
                status="active"
                usagePercent={22}
                lastUsed="1 day ago"
              />
              <ServiceCard
                title="Free Subdomain Service"
                category="Web Infrastructure"
                icon={<Globe className="h-5 w-5" />}
                status="active"
                usagePercent={10}
                lastUsed="5 days ago"
              />
              <ServiceCard
                title="Static Hosting Platform"
                category="Web Infrastructure"
                icon={<Globe className="h-5 w-5" />}
                status="warning"
                usagePercent={90}
                lastUsed="12 hours ago"
              />
              <ServiceCard
                title="Free Database Provider"
                category="Computing & Storage"
                icon={<Database className="h-5 w-5" />}
                status="active"
                usagePercent={67}
                lastUsed="3 hours ago"
              />
              <ServiceCard
                title="Free AI Inference API"
                category="AI & ML"
                icon={<Zap className="h-5 w-5" />}
                status="warning"
                usagePercent={95}
                lastUsed="1 hour ago"
              />
            </div>
            <h2 className="text-xl font-bold tracking-tight mt-8">Recommended Services</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Free Serverless Functions
                  </CardTitle>
                  <CardDescription>Computing & Storage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Run code without provisioning servers. 128MB RAM, 10 second execution time.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Connect
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Free SSL Certificate Provider
                  </CardTitle>
                  <CardDescription>Web Infrastructure</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Secure your websites with free SSL certificates. Auto-renewal available.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Connect
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Free CDN Service
                  </CardTitle>
                  <CardDescription>Web Infrastructure</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Speed up your website with a free CDN. 50GB bandwidth per month.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Connect
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="categories" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/services/category/communication" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Communication
                    </CardTitle>
                    <CardDescription>VOIP, SIP, and messaging services</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect free communication services including VOIP, SIP providers, and messaging platforms.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="w-full">
                      View Category
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
              <Link href="/services/category/web" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Web Infrastructure
                    </CardTitle>
                    <CardDescription>Domains, hosting, and deployment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect free web infrastructure services including subdomains, hosting, and deployment platforms.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="w-full">
                      View Category
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
              <Link href="/services/category/compute" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Computing & Storage
                    </CardTitle>
                    <CardDescription>Compute, databases, and storage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect free computing and storage services including serverless functions, databases, and object
                      storage.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="w-full">
                      View Category
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
              <Link href="/services/category/ai" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      AI & ML
                    </CardTitle>
                    <CardDescription>AI models and inference</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect free AI and ML services including inference providers, open source models, and ML
                      sandboxes.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="w-full">
                      View Category
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </DashboardShell>
    </div>
  )
}
