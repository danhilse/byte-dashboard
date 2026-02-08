"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const statusColors: Record<string, string> = {
  draft: "hsl(var(--chart-1))",
  in_review: "hsl(var(--chart-2))",
  pending: "hsl(var(--chart-3))",
  on_hold: "hsl(var(--chart-4))",
  approved: "hsl(var(--chart-5))",
  rejected: "hsl(0 84% 60%)",
  running: "hsl(var(--chart-2))",
  completed: "hsl(142 76% 36%)",
  failed: "hsl(0 84% 60%)",
  timeout: "hsl(25 95% 53%)",
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  pending: "Pending",
  on_hold: "On Hold",
  approved: "Approved",
  rejected: "Rejected",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  timeout: "Timed Out",
}

interface WorkflowStatusChartProps {
  data: Array<{ status: string; count: number }>
}

export function WorkflowStatusChart({ data }: WorkflowStatusChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No workflows yet
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartConfig = data.reduce<ChartConfig>((acc, item) => {
    acc[item.status] = {
      label: statusLabels[item.status] || item.status,
      color: statusColors[item.status] || "hsl(var(--chart-1))",
    }
    return acc
  }, {})

  const chartData = data.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
    status: item.status,
    fill: statusColors[item.status] || "hsl(var(--chart-1))",
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workflow Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
