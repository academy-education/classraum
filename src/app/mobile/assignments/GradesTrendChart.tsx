"use client"

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

interface GradesTrendChartProps {
  data: Array<{ date: string; average: number }>
}

export default function GradesTrendChart({ data }: GradesTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={false}
          height={20}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#6B7280' }}
          width={25}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '0.375rem',
            fontSize: '12px'
          }}
          formatter={(value: number) => [value + '%']}
          labelFormatter={(label) => label}
          separator=""
        />
        <Line
          type="monotone"
          dataKey="average"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
