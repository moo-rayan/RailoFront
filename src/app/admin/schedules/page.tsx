"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, MapPin, Train } from "lucide-react"

export default function SchedulesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">جداول الرحلات</h1>
        <p className="text-muted-foreground mt-2">
          إدارة جداول القطارات ومواعيد الرحلات
        </p>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">قريباً</h3>
            <p className="text-muted-foreground">
              صفحة جداول الرحلات قيد التطوير
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
