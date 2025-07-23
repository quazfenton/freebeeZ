import type React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import Link from "next/link"

interface ServiceCardProps {
  title: string
  category: string
  icon: React.ReactNode
  status: "active" | "warning" | "error" | "inactive"
  usagePercent: number
  lastUsed: string
}

export function ServiceCard({ title, category, icon, status, usagePercent, lastUsed }: ServiceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "warning":
        return "bg-amber-500"
      case "error":
        return "bg-red-500"
      case "inactive":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500"
    if (percent >= 75) return "bg-amber-500"
    return "bg-primary"
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <div className="flex h-2 w-2 rounded-full" style={{ background: getStatusColor(status) }}></div>
        </div>
        <CardDescription>{category}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Usage</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${getUsageColor(usagePercent)}`}
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Last used: {lastUsed}</div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex w-full justify-between">
          <Link href={`/services/${title.toLowerCase().replace(/\s+/g, "-")}`}>
            <Button variant="ghost" size="sm">
              Details
            </Button>
          </Link>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
