"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Briefcase,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Search,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Contact, Task, WorkflowExecution, Notification as AppNotification } from "@/types"

interface BreadcrumbItemType {
  label: string
  href?: string
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItemType[]
  actions?: React.ReactNode
}

interface SearchContact {
  id: string
  name: string
  email?: string
  company?: string
}

interface SearchTask {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  contactName?: string
}

interface SearchWorkflow {
  id: string
  definitionName?: string
  contactName?: string
  status: string
  workflowExecutionState?: string
}

interface SearchState {
  contacts: SearchContact[]
  tasks: SearchTask[]
  workflows: SearchWorkflow[]
}

interface NotificationsState {
  notifications: AppNotification[]
  unreadCount: number
}

const QUICK_LINKS = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview and metrics",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: "overview home stats",
  },
  {
    id: "my-work",
    label: "My Work",
    description: "Assigned tasks and approvals",
    href: "/my-work",
    icon: Briefcase,
    keywords: "tasks approvals work",
  },
  {
    id: "workflows",
    label: "Workflows",
    description: "Workflow executions",
    href: "/workflows",
    icon: Workflow,
    keywords: "executions pipeline process",
  },
  {
    id: "people",
    label: "People",
    description: "Contacts and profiles",
    href: "/people",
    icon: Users,
    keywords: "contacts crm",
  },
  {
    id: "support",
    label: "Support",
    description: "Help center",
    href: "/support",
    icon: HelpCircle,
    keywords: "help docs support",
  },
] as const

const MAX_RESULTS_PER_GROUP = 6
const EMPTY_SEARCH_STATE: SearchState = {
  contacts: [],
  tasks: [],
  workflows: [],
}

const EMPTY_NOTIFICATIONS_STATE: NotificationsState = {
  notifications: [],
  unreadCount: 0,
}

const NOTIFICATIONS_MAX_ATTEMPTS = 2
const NOTIFICATIONS_RETRY_DELAY_MS = 1200

type SearchTaskApi = Task & { contactName?: string }

function includesQuery(values: Array<string | undefined>, query: string): boolean {
  return values.some((value) => value?.toLowerCase().includes(query))
}

function formatNotificationDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Just now"
  }
  return date.toLocaleString()
}

function isRetryableNotificationsStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function PageHeader({ breadcrumbs, actions }: PageHeaderProps) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchData, setSearchData] = React.useState<SearchState>(EMPTY_SEARCH_STATE)
  const [searchLoaded, setSearchLoaded] = React.useState(false)
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [notificationsData, setNotificationsData] = React.useState<NotificationsState>(
    EMPTY_NOTIFICATIONS_STATE
  )
  const [notificationsLoaded, setNotificationsLoaded] = React.useState(false)
  const [notificationsLoading, setNotificationsLoading] = React.useState(false)
  const [notificationsError, setNotificationsError] = React.useState<string | null>(null)
  const [selectedNotification, setSelectedNotification] = React.useState<AppNotification | null>(null)
  const [dismissingNotificationIds, setDismissingNotificationIds] = React.useState<string[]>([])

  const loadSearchData = React.useCallback(async () => {
    setSearchLoading(true)
    setSearchError(null)

    try {
      const [contactsRes, tasksRes, workflowsRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/tasks?assignee=me"),
        fetch("/api/workflows"),
      ])

      if (!contactsRes.ok || !tasksRes.ok || !workflowsRes.ok) {
        throw new Error("Search index fetch failed")
      }

      const [contactsPayload, tasksPayload, workflowsPayload] = await Promise.all([
        contactsRes.json() as Promise<{ contacts?: Contact[] }>,
        tasksRes.json() as Promise<{ tasks?: SearchTaskApi[] }>,
        workflowsRes.json() as Promise<{ workflows?: WorkflowExecution[] }>,
      ])

      const contacts = (contactsPayload.contacts ?? []).map((contact) => ({
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`.trim() || "Unnamed contact",
        email: contact.email || undefined,
        company: contact.company || undefined,
      }))

      const tasks = (tasksPayload.tasks ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        status: task.status,
        priority: task.priority,
        contactName: task.contactName || undefined,
      }))

      const workflows = (workflowsPayload.workflows ?? []).map((workflow) => ({
        id: workflow.id,
        definitionName: workflow.definitionName || undefined,
        contactName: workflow.contactName || undefined,
        status: workflow.status,
        workflowExecutionState: workflow.workflowExecutionState,
      }))

      setSearchData({ contacts, tasks, workflows })
      setSearchLoaded(true)
    } catch (error) {
      console.error("Error loading header search data:", error)
      setSearchError("Unable to load search right now.")
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const loadNotifications = React.useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setNotificationsLoading(true)
    }
    if (!silent || !notificationsLoaded) {
      setNotificationsError(null)
    }

    let lastError: unknown = null
    try {
      for (let attempt = 1; attempt <= NOTIFICATIONS_MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetch("/api/notifications?limit=20", { cache: "no-store" })
          if (!response.ok) {
            if (
              attempt < NOTIFICATIONS_MAX_ATTEMPTS &&
              isRetryableNotificationsStatus(response.status)
            ) {
              await sleep(NOTIFICATIONS_RETRY_DELAY_MS)
              continue
            }

            const details = await response.text()
            const message = details.trim() || response.statusText || "Unknown error"
            throw new Error(`Notifications fetch failed (${response.status}): ${message}`)
          }

          const payload = await response.json() as {
            notifications?: Array<AppNotification & { readAt?: string | null }>
            unreadCount?: number
          }

          const notifications = (payload.notifications ?? []).map((notification) => ({
            ...notification,
            readAt: notification.readAt ?? undefined,
          }))

          setNotificationsData({
            notifications,
            unreadCount: payload.unreadCount ?? 0,
          })
          setNotificationsLoaded(true)
          return
        } catch (error) {
          lastError = error
          const networkError = error instanceof TypeError

          if (attempt < NOTIFICATIONS_MAX_ATTEMPTS && networkError) {
            await sleep(NOTIFICATIONS_RETRY_DELAY_MS)
            continue
          }

          throw error
        }
      }
    } catch (error) {
      const failure = error ?? lastError
      if (silent && notificationsLoaded) {
        console.warn("Background notification refresh failed:", failure)
      } else {
        console.error("Error loading notifications:", failure)
        setNotificationsError("Unable to load notifications right now.")
      }
    } finally {
      if (!silent) {
        setNotificationsLoading(false)
      }
    }
  }, [notificationsLoaded])

  const markAllNotificationsRead = React.useCallback(async () => {
    if (notificationsData.unreadCount === 0 || notificationsLoading) {
      return
    }

    setNotificationsLoading(true)
    setNotificationsError(null)

    try {
      const response = await fetch("/api/notifications", { method: "PATCH" })
      if (!response.ok) {
        throw new Error("Failed to mark notifications as read")
      }

      const readAt = new Date().toISOString()
      setNotificationsData((current) => ({
        notifications: current.notifications.map((notification) =>
          notification.isRead
            ? notification
            : { ...notification, isRead: true, readAt }
        ),
        unreadCount: 0,
      }))
    } catch (error) {
      console.error("Error marking notifications as read:", error)
      setNotificationsError("Unable to mark notifications as read.")
    } finally {
      setNotificationsLoading(false)
    }
  }, [notificationsData.unreadCount, notificationsLoading])

  const dismissNotification = React.useCallback(async (notificationId: string) => {
    if (dismissingNotificationIds.includes(notificationId)) {
      return
    }

    setDismissingNotificationIds((current) => [...current, notificationId])
    setNotificationsError(null)

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, { method: "PATCH" })
      if (!response.ok) {
        throw new Error("Failed to dismiss notification")
      }

      const readAt = new Date().toISOString()
      setNotificationsData((current) => {
        let dismissed = false
        const notifications = current.notifications.map((notification) => {
          if (notification.id !== notificationId || notification.isRead) {
            return notification
          }

          dismissed = true
          return { ...notification, isRead: true, readAt }
        })

        return {
          notifications,
          unreadCount: dismissed ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
        }
      })
    } catch (error) {
      console.error("Error dismissing notification:", error)
      setNotificationsError("Unable to dismiss notification.")
    } finally {
      setDismissingNotificationIds((current) => current.filter((id) => id !== notificationId))
    }
  }, [dismissingNotificationIds])

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredLinks = React.useMemo(() => {
    if (!normalizedQuery) return QUICK_LINKS

    return QUICK_LINKS.filter((item) =>
      includesQuery([item.label, item.description, item.keywords], normalizedQuery)
    )
  }, [normalizedQuery])

  const filteredContacts = React.useMemo(() => {
    if (!normalizedQuery) return searchData.contacts.slice(0, MAX_RESULTS_PER_GROUP)

    return searchData.contacts
      .filter((contact) => includesQuery([contact.name, contact.email, contact.company], normalizedQuery))
      .slice(0, MAX_RESULTS_PER_GROUP)
  }, [normalizedQuery, searchData.contacts])

  const filteredTasks = React.useMemo(() => {
    if (!normalizedQuery) return searchData.tasks.slice(0, MAX_RESULTS_PER_GROUP)

    return searchData.tasks
      .filter((task) =>
        includesQuery([task.title, task.description, task.status, task.priority, task.contactName], normalizedQuery)
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
  }, [normalizedQuery, searchData.tasks])

  const filteredWorkflows = React.useMemo(() => {
    if (!normalizedQuery) return searchData.workflows.slice(0, MAX_RESULTS_PER_GROUP)

    return searchData.workflows
      .filter((workflow) =>
        includesQuery(
          [workflow.definitionName, workflow.contactName, workflow.status, workflow.workflowExecutionState],
          normalizedQuery
        )
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
  }, [normalizedQuery, searchData.workflows])

  const resultCount =
    filteredLinks.length + filteredContacts.length + filteredTasks.length + filteredWorkflows.length
  const unreadNotifications = React.useMemo(
    () => notificationsData.notifications.filter((notification) => !notification.isRead),
    [notificationsData.notifications]
  )

  const handleSearchNavigate = React.useCallback((href: string) => {
    setSearchOpen(false)
    setSearchQuery("")
    router.push(href)
  }, [router])

  React.useEffect(() => {
    if (!searchOpen || searchLoaded || searchLoading) return
    void loadSearchData()
  }, [loadSearchData, searchLoaded, searchLoading, searchOpen])

  React.useEffect(() => {
    if (!notificationsOpen || notificationsLoaded || notificationsLoading) return
    void loadNotifications()
  }, [loadNotifications, notificationsLoaded, notificationsLoading, notificationsOpen])

  React.useEffect(() => {
    const refreshNotifications = () => {
      if (document.visibilityState !== "visible") {
        return
      }
      if (!navigator.onLine) {
        return
      }
      void loadNotifications({ silent: true })
    }

    refreshNotifications()

    const intervalId = window.setInterval(() => {
      refreshNotifications()
    }, 30000)

    const handleWindowFocus = () => {
      refreshNotifications()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNotifications()
      }
    }

    const handleNetworkReconnect = () => {
      refreshNotifications()
    }

    window.addEventListener("focus", handleWindowFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("online", handleNetworkReconnect)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleWindowFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("online", handleNetworkReconnect)
    }
  }, [loadNotifications])

  React.useEffect(() => {
    if (searchOpen) return
    setSearchQuery("")
  }, [searchOpen])

  const hasUnreadNotifications = notificationsData.unreadCount > 0

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-10">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <React.Fragment key={item.label}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        {actions}

        {/* Search */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative group">
              <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="sr-only">Search</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[28rem] p-0 shadow-refined-lg animate-scale-in" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search contacts, tasks, workflows..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                autoFocus
              />
              <CommandList className="max-h-[420px]">
                {searchLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading search index...
                  </div>
                )}

                {!searchLoading && searchError && (
                  <div className="space-y-3 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">{searchError}</p>
                    <Button size="sm" variant="outline" onClick={() => void loadSearchData()}>
                      Retry
                    </Button>
                  </div>
                )}

                {!searchLoading && !searchError && (
                  <>
                    {filteredLinks.length > 0 && (
                      <CommandGroup heading="Pages">
                        {filteredLinks.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={`page-${item.label}`}
                            onSelect={() => handleSearchNavigate(item.href)}
                          >
                            <item.icon className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span>{item.label}</span>
                              <span className="text-xs text-muted-foreground">{item.description}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {filteredContacts.length > 0 && (
                      <CommandGroup heading="Contacts">
                        {filteredContacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={`contact-${contact.name}-${contact.email ?? ""}`}
                            onSelect={() => handleSearchNavigate(`/people/${contact.id}`)}
                          >
                            <Users className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span>{contact.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {contact.email ?? contact.company ?? "Open contact"}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {filteredTasks.length > 0 && (
                      <CommandGroup heading="Tasks">
                        {filteredTasks.map((task) => (
                          <CommandItem
                            key={task.id}
                            value={`task-${task.title}-${task.description ?? ""}`}
                            onSelect={() =>
                              handleSearchNavigate(`/my-work?taskId=${encodeURIComponent(task.id)}`)
                            }
                          >
                            <ListTodo className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="line-clamp-1">{task.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {task.contactName
                                  ? `${task.contactName} • ${task.status}`
                                  : `${task.status} • ${task.priority}`}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {filteredWorkflows.length > 0 && (
                      <CommandGroup heading="Workflows">
                        {filteredWorkflows.map((workflow) => (
                          <CommandItem
                            key={workflow.id}
                            value={`workflow-${workflow.definitionName ?? ""}-${workflow.contactName ?? ""}`}
                            onSelect={() => handleSearchNavigate(`/workflows/${workflow.id}`)}
                          >
                            <Workflow className="size-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="line-clamp-1">{workflow.definitionName ?? "Workflow execution"}</span>
                              <span className="text-xs text-muted-foreground">
                                {workflow.contactName
                                  ? `${workflow.contactName} • ${workflow.status}`
                                  : workflow.status}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {resultCount === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {`No results found for "${searchQuery.trim()}".`}
                      </div>
                    )}
                  </>
                )}
              </CommandList>
            </Command>

            <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
              <span>
                Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">⌘K</kbd>
                {" / "}
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">Ctrl+K</kbd>
              </span>
              {searchLoaded && !searchLoading && !searchError && (
                <span>{searchData.contacts.length + searchData.tasks.length + searchData.workflows.length} indexed</span>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* AI Assistant */}
        <Button
          variant="ghost"
          size="icon"
          disabled
          aria-disabled="true"
          className="h-9 w-9 relative opacity-50 cursor-not-allowed"
        >
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">AI Assistant</span>
          <div className="absolute inset-0 rounded-lg bg-muted opacity-40 -z-10" />
        </Button>

        {/* Notifications */}
        <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative group">
              <Bell className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="sr-only">Notifications</span>
              {hasUnreadNotifications && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/50 animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 shadow-refined-lg animate-scale-in">
            <DropdownMenuLabel className="flex items-center justify-between py-3">
              <span className="font-semibold">Notifications</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void markAllNotificationsRead()}
                disabled={notificationsLoading || notificationsData.unreadCount === 0}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationsLoading && !notificationsLoaded ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading notifications...
              </div>
            ) : notificationsError ? (
              <div className="space-y-3 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">{notificationsError}</p>
                <Button size="sm" variant="outline" onClick={() => void loadNotifications()}>
                  Retry
                </Button>
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                  <Bell className="h-5 w-5 text-muted-foreground/50" />
                </div>
                No new notifications
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto py-1">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-2 px-3 py-2.5 hover:bg-muted/60 transition-colors"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setSelectedNotification(notification)
                        setNotificationsOpen(false)
                        void dismissNotification(notification.id)
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5 inline-flex h-2 w-2 rounded-full bg-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight line-clamp-1">{notification.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatNotificationDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      disabled={dismissingNotificationIds.includes(notification.id)}
                      onClick={() => void dismissNotification(notification.id)}
                    >
                      {dismissingNotificationIds.includes(notification.id) ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                      <span className="sr-only">Dismiss notification</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-4" />
        <ThemeToggle />
      </div>

      <Dialog
        open={Boolean(selectedNotification)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNotification(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title ?? "Notification"}</DialogTitle>
            <DialogDescription>
              {selectedNotification ? formatNotificationDate(selectedNotification.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-foreground">
            {selectedNotification?.message ?? ""}
          </p>
          <DialogFooter>
            <Button type="button" onClick={() => setSelectedNotification(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
