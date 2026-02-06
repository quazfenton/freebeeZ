import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { FreeService } from "@/lib/free-service-aggregator"

interface AggregatedServiceCardProps {
  service: FreeService
}

function formatCategory(category?: string) {
  if (!category) {
    return "Uncategorized"
  }
  return category
    .split(/[_\-\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

export function AggregatedServiceCard({ service }: AggregatedServiceCardProps) {
  const lastChecked = service.lastChecked
    ? formatDistanceToNow(new Date(service.lastChecked), { addSuffix: true })
    : null

  const badges = [service.source, ...(service.tags || [])].filter(Boolean)

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-foreground">{service.name}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {formatCategory(service.category)}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[0.65rem] uppercase tracking-[0.1em]">
            {service.category || "Other"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {service.description || "Automatically discovered service. Run a manual review before automated onboarding."}
        </p>
        <div className="flex flex-wrap gap-2">
          {badges.slice(0, 4).map((badge) => (
            <Badge key={badge} variant="secondary" className="text-[0.65rem]">
              {badge}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Last refreshed</p>
          <p className="text-sm text-foreground">{lastChecked ?? "Just now"}</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={service.url} target="_blank" rel="noreferrer">
            Visit
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
