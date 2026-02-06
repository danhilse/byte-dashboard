import { Download } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auditLogs } from "@/lib/data/settings"

export default function SettingsAuditLogsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Zero in on the exact change log you need.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2">
            <Label>Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" defaultValue="2024-08-01" />
              <Input type="date" defaultValue="2024-08-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>User</Label>
            <Select defaultValue="all">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="maya">Maya Patel</SelectItem>
                <SelectItem value="system">System Bot</SelectItem>
                <SelectItem value="alex">Alex Morris</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Action</Label>
            <Select defaultValue="any">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="exported">Exported</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resource</Label>
            <Select defaultValue="all">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Resource type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:col-span-4">
            <Label htmlFor="audit-search">Search</Label>
            <Input id="audit-search" placeholder="Search by user, action, or IP" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Every change is captured for compliance.</CardDescription>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            Export Logs
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource Type</TableHead>
                <TableHead>Resource Name</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={`${log.timestamp}-${log.user}`}>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.resourceType}</TableCell>
                  <TableCell>{log.resourceName}</TableCell>
                  <TableCell>
                    <details className="space-y-2">
                      <summary className="cursor-pointer text-sm text-primary">View</summary>
                      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                        {log.changes}
                      </div>
                    </details>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{log.ip}</span>
                      <Badge variant="outline">Admin only</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
