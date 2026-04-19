"use client"

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface AdminTrendChartProps {
  data: Array<{ day: number; [key: string]: number }>
  dataKey: string
  color: string
  isCurrency?: boolean
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function AdminTrendChart({ data, dataKey, color, isCurrency = false }: AdminTrendChartProps) {
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; color: string }>
    label?: string | number
  }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      const formattedValue = isCurrency ? formatCurrency(value) : value.toLocaleString()

      return (
        <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs shadow-lg">
          <p className="font-medium">{`Day ${(Number(label) || 0) + 1}`}</p>
          <p className="text-gray-300">{formattedValue}</p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
        <Tooltip
          content={<CustomTooltip />}
          wrapperStyle={{ outline: 'none' }}
          cursor={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
