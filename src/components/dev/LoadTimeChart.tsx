"use client"

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface LoadTimeChartProps {
  data: Array<{ name: string; loadTime: number; queryCount: number }>
  loadTimeColor: string
  queryCountColor: string
}

export default function LoadTimeChart({ data, loadTimeColor, queryCountColor }: LoadTimeChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value, name) => [
          name === 'loadTime' ? `${value}ms` : value,
          name === 'loadTime' ? 'Load Time' : 'Query Count'
        ]} />
        <Line type="monotone" dataKey="loadTime" stroke={loadTimeColor} strokeWidth={2} />
        <Line type="monotone" dataKey="queryCount" stroke={queryCountColor} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
