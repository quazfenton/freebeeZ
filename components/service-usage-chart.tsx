"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function ServiceUsageChart() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const data = [
    {
      name: "Mon",
      Communication: 40,
      Web: 24,
      Computing: 35,
      AI: 27,
    },
    {
      name: "Tue",
      Communication: 30,
      Web: 13,
      Computing: 45,
      AI: 30,
    },
    {
      name: "Wed",
      Communication: 20,
      Web: 38,
      Computing: 25,
      AI: 40,
    },
    {
      name: "Thu",
      Communication: 27,
      Web: 39,
      Computing: 15,
      AI: 28,
    },
    {
      name: "Fri",
      Communication: 18,
      Web: 48,
      Computing: 22,
      AI: 34,
    },
    {
      name: "Sat",
      Communication: 23,
      Web: 38,
      Computing: 17,
      AI: 21,
    },
    {
      name: "Sun",
      Communication: 34,
      Web: 43,
      Computing: 28,
      AI: 15,
    },
  ]

  if (!mounted) {
    return <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-md"></div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="Communication" fill="#8884d8" />
        <Bar dataKey="Web" fill="#82ca9d" />
        <Bar dataKey="Computing" fill="#ffc658" />
        <Bar dataKey="AI" fill="#ff8042" />
      </BarChart>
    </ResponsiveContainer>
  )
}
