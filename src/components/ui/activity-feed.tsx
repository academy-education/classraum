"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, FileText, UserPlus, MessageCircle } from "lucide-react"

interface Activity {
  id: string
  type: "class" | "student" | "message" | "assignment"
  user: {
    name: string
    avatar?: string
    initials: string
  }
  title: string
  description: string
  time: string
  status?: "new" | "completed" | "pending"
}

const activities: Activity[] = [
  {
    id: "1",
    type: "class",
    user: { name: "Francisco Gibbs", initials: "FG" },
    title: "New Class Created",
    description: "created class Math 101",
    time: "Just Now",
    status: "new"
  },
  {
    id: "2", 
    type: "assignment",
    user: { name: "Chester Corp", initials: "CC" },
    title: "Assignment Submitted",
    description: "submitted homework for Science",
    time: "Friday, 12:26PM",
    status: "pending"
  }
]

const typeIcons = {
  class: FileText,
  student: UserPlus,
  message: MessageCircle,
  assignment: FileText
}

const statusColors = {
  new: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800", 
  pending: "bg-yellow-100 text-yellow-800"
}

export function ActivityFeed() {
  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Activities</h3>
      
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = typeIcons[activity.type]
          
          return (
            <div key={activity.id} className="flex items-start gap-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon className="w-3 h-3 text-green-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900">{activity.user.name}</p>
                  {activity.status && (
                    <Badge className={`text-xs h-4 px-1.5 ${statusColors[activity.status]}`}>
                      {activity.status.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600">{activity.description}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}