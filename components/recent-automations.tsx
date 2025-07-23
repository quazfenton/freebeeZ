import { Check, Clock, X } from "lucide-react"

export function RecentAutomations() {
  const automations = [
    {
      id: 1,
      name: "VOIP to SIP Bridge",
      status: "success",
      time: "10 minutes ago",
      duration: "2s",
    },
    {
      id: 2,
      name: "AI Model Rotation",
      status: "success",
      time: "30 minutes ago",
      duration: "1.5s",
    },
    {
      id: 3,
      name: "Subdomain to Hosting Connector",
      status: "pending",
      time: "1 hour ago",
      duration: "-",
    },
    {
      id: 4,
      name: "Proxy Load Balancer",
      status: "failed",
      time: "2 hours ago",
      duration: "5s",
    },
    {
      id: 5,
      name: "Database Backup",
      status: "success",
      time: "3 hours ago",
      duration: "10s",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <Check className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />
      case "failed":
        return <X className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {automations.map((automation) => (
        <div key={automation.id} className="flex items-center justify-between border-b pb-2 last:border-0">
          <div>
            <div className="font-medium">{automation.name}</div>
            <div className="text-xs text-muted-foreground">{automation.time}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">{automation.duration}</div>
            {getStatusIcon(automation.status)}
          </div>
        </div>
      ))}
    </div>
  )
}
