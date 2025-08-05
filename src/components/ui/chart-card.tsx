"use client"

import { Card } from "@/components/ui/card"

interface ChartCardProps {
  title: string
  value: string
  data: number[]
  labels: string[]
}

export function ChartCard({ title, value, data, labels }: ChartCardProps) {
  const maxValue = Math.max(...data)
  
  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-end gap-1 h-24">
          {data.map((value, index) => {
            const height = (value / maxValue) * 100
            const isHighest = value === maxValue
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className={`w-full rounded-t transition-all duration-300 ${
                    isHighest ? "bg-blue-600" : "bg-blue-200"
                  }`}
                  style={{ height: `${height}%` }}
                />
                {isHighest && (
                  <div className="absolute -mt-6 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded">
                    ${value.toLocaleString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
    </Card>
  )
}