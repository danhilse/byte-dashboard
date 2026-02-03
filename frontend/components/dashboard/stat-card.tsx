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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground">
            {trend && (
              <span className={trend.isPositive ? trendColors.positive : trendColors.negative}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
            {trend && description && " "}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
})
