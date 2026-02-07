"use client"

import { Mail, Phone, MapPin, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ContactStatusBadge } from "@/components/common/status-badge"
import { getInitials } from "@/lib/utils"
import type { Contact } from "@/types"

interface ContactCardProps {
  contact: Contact
  onEdit?: (contact: Contact) => void
  onDelete?: (contact: Contact) => void
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  const location = [contact.city, contact.state].filter(Boolean).join(", ") || null

  return (
    <Card className="hover:bg-muted/50 transition-colors grid-card-optimized">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            <AvatarImage src={contact.avatarUrl} alt={`${contact.firstName} ${contact.lastName}`} />
            <AvatarFallback>
              {getInitials(`${contact.firstName} ${contact.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  <Link
                    href={`/people/${contact.id}`}
                    className="hover:underline"
                  >
                    {contact.firstName} {contact.lastName}
                  </Link>
                </CardTitle>
                {(contact.company || contact.role) && (
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.role}
                    {contact.role && contact.company && " at "}
                    {contact.company}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/people/${contact.id}`}>
                      <Eye className="mr-2 size-4" />
                      View
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(contact)}>
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete?.(contact)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <ContactStatusBadge status={contact.status} />
          {contact.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="space-y-1.5 text-sm">
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="size-4" />
            <span className="truncate">{contact.email}</span>
          </a>
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="size-4" />
              <span>{contact.phone}</span>
            </a>
          )}
          {location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" />
              <span>{location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
