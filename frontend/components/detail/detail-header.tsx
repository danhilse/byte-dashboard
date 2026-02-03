import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DetailHeaderProps {
  title: string
  subtitle?: string
  avatarText?: string
  badge?: {
    label: string
    variant?: "default" | "secondary" | "outline" | "destructive"
  }
  actions?: React.ReactNode
}

export function DetailHeader({
  title,
  subtitle,
  avatarText,
  badge,
  actions,
}: DetailHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4">
        {avatarText && (
          <Avatar className="size-12">
            <AvatarFallback className="text-lg">{avatarText}</AvatarFallback>
          </Avatar>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{title}</h1>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
