import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface InfoFieldProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  href?: string
}

export function InfoField({ icon: Icon, label, value, href }: InfoFieldProps) {
  const valueContent = href ? (
    <a href={href} className="text-sm text-muted-foreground hover:underline">
      {value}
    </a>
  ) : (
    <p className="text-sm text-muted-foreground">{value}</p>
  )

  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        {valueContent}
      </div>
    </div>
  )
}
