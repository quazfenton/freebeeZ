import { CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Cloud, Database, Filter, Globe, MessageSquare, Search, Server, Shield, Zap } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"

export default function AddServicePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center gap-4">
          <Link href="/services">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Add Service</h1>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search for services..." className="w-full bg-background pl-8" />
          </div>
          <Button variant="outline" size="sm" className="ml-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
        <Tabs defaultValue="categories" className="space-y-4">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="recent">Recently Added</TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/services/add/communication" className="block">
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
                </Card>
              </Link>
              <Link href="/services/add/web" className="block">
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
                </Card>
              </Link>
              <Link href="/services/add/compute" className="block">
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
                </Card>
              </Link>
              <Link href="/services/add/ai" className="block">
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
                </Card>
              </Link>
              <Link href="/services/add/developer" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5" />
                      Developer Tools
                    </CardTitle>
                    <CardDescription>CI/CD, monitoring, and more</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect free developer tools including CI/CD platforms, monitoring services, and error tracking.
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/services/add/security" className="block">
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security
                    </CardTitle>
                    <CardDescription>SSL, authentication, and more</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect free security services including SSL certificates, authentication providers, and security
                      scanning.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </TabsContent>
          <TabsContent value="popular" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Free Subdomain Provider
                  </CardTitle>
                  <CardDescription>Web Infrastructure</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Get free subdomains for your projects. No credit card required.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Connect</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Free Database Service
                  </CardTitle>
                  <CardDescription>Computing & Storage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Free database with 500MB storage and 10M monthly operations.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Connect</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Free AI Inference API
                  </CardTitle>
                  <CardDescription>AI & ML</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Access to free AI models with 100 requests per day.</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Connect</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Free VOIP Service
                  </CardTitle>
                  <CardDescription>Communication</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Make free voice calls with up to 60 minutes per day.</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Connect</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Free Static Hosting
                  </CardTitle>
                  <CardDescription>Web Infrastructure</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Host your static websites with 100GB bandwidth per month.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Connect</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Free SSL Certificate
                  </CardTitle>
                  <CardDescription>Security</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Secure your websites with free SSL certificates. Auto-renewal available.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Connect</Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DashboardShell>
    </div>
  )
}
