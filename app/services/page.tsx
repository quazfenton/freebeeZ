import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowRight,
  Filter,
  Globe,
  MessageSquare,
  Search,
  Server,
  Zap,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { FreeServiceAggregator } from "@/lib/free-service-aggregator"
import { AggregatedServiceCard } from "@/components/aggregated-service-card"

async function getCatalogSummary(limit = 12) {
  const aggregator = new FreeServiceAggregator()
  const catalog = await aggregator.loadCatalog()

  catalog.sort((a, b) => {
    if (a.lastChecked && b.lastChecked) {
      return new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime()
    }
    if (a.lastChecked) return -1
    if (b.lastChecked) return 1
    return a.name.localeCompare(b.name)
  })

  const categories = [...new Set(catalog.map((service) => service.category || "other"))]
  return {
    totalServices: catalog.length,
    totalCategories: categories.length,
    featured: catalog.slice(0, limit),
  }
}

export default async function ServicesPage() {
  const { featured, totalServices, totalCategories } = await getCatalogSummary(9)

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Catalog</h1>
            <p className="text-sm text-muted-foreground">
              {totalServices.toLocaleString()} services across {totalCategories} categories
            </p>
          </div>
          <Link href="/services/add">
            <Button>
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
        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList>
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((service) => (
                <AggregatedServiceCard key={service.id} service={service} />
              ))}
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
