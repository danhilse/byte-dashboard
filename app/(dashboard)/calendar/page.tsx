import { Calendar as CalendarIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CalendarPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Calendar" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            View and manage your schedule.
          </p>
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="size-5" />
              Calendar View
            </CardTitle>
            <CardDescription>
              Your schedule and upcoming events will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[400px] items-center justify-center">
            <div className="text-center text-muted-foreground">
              <CalendarIcon className="mx-auto mb-4 size-12 opacity-50" />
              <p>Calendar integration coming soon.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
