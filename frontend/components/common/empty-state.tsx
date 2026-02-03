import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface EmptyStateProps {
  icon?: LucideIcon
  message: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {Icon && (
        <div className="mb-3 rounded-full bg-muted p-3">
          <Icon className="size-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
