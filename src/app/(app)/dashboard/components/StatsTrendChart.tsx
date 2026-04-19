"use client"

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface StatsTrendChartProps {
  data: Array<{ day: number; value: number }>
  dataKey: string
  color: string
}

export default function StatsTrendChart({ data, dataKey, color }: StatsTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
