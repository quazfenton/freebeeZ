import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Zap } from "lucide-react"
import Link from "next/link"

interface AutomationCardProps {
  title: string
  description: string
  status: "active" | "warning" | "error" | "inactive"
  lastRun: string
  services: string[]
}

export function AutomationCard({ title, description, status, lastRun, services }: AutomationCardProps) {
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

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex h-2 w-2 rounded-full" style={{ background: getStatusColor(status) }}></div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Last run: {lastRun}</div>
          <div className="text-xs text-muted-foreground">Services: {services.join(", ")}</div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex w-full justify-between">
          <Link href={`/automations/${title.toLowerCase().replace(/\s+/g, "-")}`}>
            <Button variant="ghost" size="sm">
              Details
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Run Now
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
