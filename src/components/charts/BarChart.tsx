'use client'

import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface BarChartProps {
  data: { label: string; completed: number; total: number }[]
  title?: string
}

export function BarChart({ data, title }: BarChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <RechartsBarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [
              value as number,
              (name as string) === 'completed' ? 'Selesai' : 'Total DN',
            ] as [number, string]}
          />
          <Legend
            formatter={(value) => (value === 'completed' ? 'Selesai' : 'Total DN')}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="total" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill="#002D62" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
