import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trendColors } from "@/lib/design-tokens"
import { type LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}

export const StatCard = memo(function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="group/stat relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className="rounded-lg bg-primary/5 p-2 transition-all duration-200 group-hover/stat:bg-primary/10">
            <Icon className="size-4 text-primary/60" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {trend && (
              <span className={`font-medium ${trend.isPositive ? trendColors.positive : trendColors.negative}`}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}%
              </span>
            )}
            {trend && description && " "}
            {description}
          </p>
        )}
      </CardContent>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity duration-200 group-hover/stat:opacity-100" />
    </Card>
  )
})
