"use client"

import { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    trend: "up" | "down"
  }
  icon: ReactNode
  color: "red" | "green" | "blue" | "purple"
}

const colorClasses = {
  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    text: "text-red-600"
  },
  green: {
    bg: "bg-green-50", 
    icon: "text-green-600",
    text: "text-green-600"
  },
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600", 
    text: "text-blue-600"
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    text: "text-purple-600"
  }
}

export function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const colorClass = colorClasses[color]
  
  return (
    <Card className="p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-1">
              {change.trend === "up" ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span className={`text-xs font-medium ${
                change.trend === "up" ? "text-green-600" : "text-red-600"
              }`}>
                {change.value}
              </span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg ${colorClass.bg} flex items-center justify-center`}>
          <div className={colorClass.icon}>
            {icon}
          </div>
        </div>
      </div>
    </Card>
  )
}