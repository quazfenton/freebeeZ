import type React from "react"
interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="container grid flex-1 items-start gap-4 py-6 md:gap-8">
      <main className="grid gap-4 md:gap-8">{children}</main>
    </div>
  )
}
