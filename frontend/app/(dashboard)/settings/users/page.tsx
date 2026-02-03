import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus } from "lucide-react"

const teamMembers = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@byte.com",
    role: "Admin",
    initials: "AJ",
  },
  {
    id: "2",
    name: "Sarah Miller",
    email: "sarah@byte.com",
    role: "Member",
    initials: "SM",
  },
  {
    id: "3",
    name: "Chris Davis",
    email: "chris@byte.com",
    role: "Member",
    initials: "CD",
  },
]

const roleVariants: Record<string, "default" | "secondary" | "outline"> = {
  Admin: "default",
  Member: "secondary",
  Viewer: "outline",
}

export default function UsersSettingsPage() {
  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button>
          <Plus className="mr-2 size-4" />
          Invite User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {teamMembers.length} members in your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={roleVariants[member.role]}>{member.role}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Change Role</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Invitations that haven't been accepted yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        </CardContent>
      </Card>
    </div>
  )
}
