"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TableItem {
  id: string
  name: string
  date: string
  client: string
  amount: string
  status: "paid" | "overdue" | "pending"
}

const items: TableItem[] = [
  {
    id: "PQ-4491C",
    name: "John Smith",
    date: "3 Jul, 2020", 
    client: "Daniel Padilla",
    amount: "$2,450",
    status: "paid"
  },
  {
    id: "IN-9911J",
    name: "Sarah Wilson",
    date: "21 May, 2021",
    client: "Christina Jacobs", 
    amount: "$14,810",
    status: "overdue"
  },
  {
    id: "UV-2319A",
    name: "Mike Johnson", 
    date: "14 Apr, 2020",
    client: "Elizabeth Bailey",
    amount: "$450",
    status: "paid"
  }
]

const statusColors = {
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800", 
  pending: "bg-yellow-100 text-yellow-800"
}

export function RecentTable({ title = "Recent Students" }: { title?: string }) {
  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                No.
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Date Created
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Client
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Amount
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="py-2.5 text-sm font-medium text-gray-900">
                  {item.id}
                </td>
                <td className="py-2.5 text-sm text-gray-600">
                  {item.date}
                </td>
                <td className="py-2.5 text-sm text-gray-900">
                  {item.client}
                </td>
                <td className="py-2.5 text-sm font-medium text-gray-900">
                  {item.amount}
                </td>
                <td className="py-2.5">
                  <Badge className={`text-xs h-4 px-1.5 ${statusColors[item.status]}`}>
                    {item.status.toUpperCase()}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}