import { Copy } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { users, roles } from "@/lib/data/settings"

export default function SettingsUsersPermissionsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Users & Permissions</CardTitle>
            <CardDescription>Manage access for teammates and partners.</CardDescription>
          </div>
          <Button>Invite User</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.roleVariant}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.statusVariant}>{user.status}</Badge>
                  </TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="xs">
                        Edit
                      </Button>
                      <Button variant="ghost" size="xs" className="text-destructive">
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Customize permission sets for different teams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map((role) => (
              <div key={role.name} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{role.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {role.permissions} · {role.members} members
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    Duplicate
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              Create Role
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite Link</CardTitle>
            <CardDescription>Share a one-time invite with partners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-link">Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input id="invite-link" readOnly value="https://byte.app/invite/ops" className="font-mono" />
                <Button variant="outline" size="sm" className="gap-2">
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-expiration">Expiration</Label>
              <Select defaultValue="7">
                <SelectTrigger id="link-expiration" className="w-full">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">24 hours</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="never">No expiration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full">Generate New Link</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite User</CardTitle>
          <CardDescription>Send a direct invite with role pre-selected.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="invite-email">Work Email</Label>
            <Input id="invite-email" placeholder="teammate@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select defaultValue="contributor">
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="contributor">Contributor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="md:col-span-3">Send Invite</Button>
        </CardContent>
      </Card>
    </div>
  )
}
