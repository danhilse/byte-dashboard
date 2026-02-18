/**
 * Dashboard Query Functions
 *
 * Server-side queries for dashboard stats, charts, and widgets.
 * All queries are scoped by orgId for multi-tenancy.
 */

import { db } from "@/lib/db";
import {
  contacts,
  workflowExecutions,
  tasks,
  activityLog,
  organizationMemberships,
  users,
  workflowDefinitions,
} from "@/lib/db/schema";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

/**
 * Dashboard stats: total contacts, active workflowExecutions, pending tasks,
 * completed tasks this week.
 */
export async function getDashboardStats(orgId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    [contactCount],
    [activeWorkflowCount],
    [pendingTaskCount],
    [completedThisWeek],
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(contacts)
      .where(eq(contacts.orgId, orgId)),
    db
      .select({ count: count() })
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.orgId, orgId),
          sql`COALESCE(${workflowExecutions.workflowExecutionState}, CASE
            WHEN ${workflowExecutions.completedAt} IS NOT NULL THEN 'completed'
            ELSE 'running'
          END) = 'running'`
        )
      ),
    db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, orgId),
          sql`${tasks.status} IN ('todo', 'in_progress')`
        )
      ),
    db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, orgId),
          eq(tasks.status, "done"),
          gte(tasks.completedAt, weekAgo)
        )
      ),
  ]);

  return {
    totalContacts: contactCount.count,
    activeWorkflows: activeWorkflowCount.count,
    pendingTasks: pendingTaskCount.count,
    completedTasksThisWeek: completedThisWeek.count,
  };
}

/**
 * Workflow counts grouped by status for pie/bar chart.
 */
export async function getWorkflowCountsByStatus(orgId: string) {
  // Dashboard distribution should reflect runtime execution state, not business status.
  const stateExpr = sql<string>`COALESCE(${workflowExecutions.workflowExecutionState}, CASE
    WHEN ${workflowExecutions.completedAt} IS NOT NULL THEN 'completed'
    ELSE 'running'
  END)`;

  const rows = await db
    .select({
      status: stateExpr,
      count: count(),
    })
    .from(workflowExecutions)
    .where(eq(workflowExecutions.orgId, orgId))
    .groupBy(stateExpr);

  return rows;
}

/**
 * Workflow creation counts per day for line/area chart.
 */
export async function getWorkflowsOverTime(orgId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = await db
    .select({
      date: sql<string>`DATE(${workflowExecutions.createdAt})`.as("date"),
      count: count(),
    })
    .from(workflowExecutions)
    .where(and(eq(workflowExecutions.orgId, orgId), gte(workflowExecutions.createdAt, startDate)))
    .groupBy(sql`DATE(${workflowExecutions.createdAt})`)
    .orderBy(sql`DATE(${workflowExecutions.createdAt})`);

  return rows;
}

/**
 * Recent workflows with contact and definition names.
 */
export async function getRecentWorkflows(orgId: string, limit: number = 5) {
  const stateExpr = sql<string>`COALESCE(${workflowExecutions.workflowExecutionState}, CASE
    WHEN ${workflowExecutions.completedAt} IS NOT NULL THEN 'completed'
    ELSE 'running'
  END)`;

  const rows = await db
    .select({
      id: workflowExecutions.id,
      status: stateExpr,
      startedAt: workflowExecutions.startedAt,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      definitionName: workflowDefinitions.name,
    })
    .from(workflowExecutions)
    .leftJoin(
      contacts,
      and(
        eq(workflowExecutions.contactId, contacts.id),
        eq(contacts.orgId, orgId)
      )
    )
    .leftJoin(
      workflowDefinitions,
      and(
        eq(workflowExecutions.workflowDefinitionId, workflowDefinitions.id),
        eq(workflowDefinitions.orgId, orgId)
      )
    )
    .where(eq(workflowExecutions.orgId, orgId))
    .orderBy(desc(workflowExecutions.startedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    contactName: [row.contactFirstName, row.contactLastName]
      .filter(Boolean)
      .join(" ") || "Unknown",
    definitionName: row.definitionName ?? undefined,
  }));
}

/**
 * Tasks assigned to user, sorted by priority and due date.
 */
export async function getMyTasks(
  orgId: string,
  userId: string,
  limit: number = 5
) {
  // Cast to text so ORDER BY remains safe across text/enum-backed schemas.
  const priorityOrder = sql`CASE ${tasks.priority}::text
    WHEN 'urgent' THEN 0
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
    ELSE 4
  END`;

  try {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        taskType: tasks.taskType,
      })
      .from(tasks)
      .where(
        and(
          // Cast predicates to text so this query works if local DB columns were created as uuid.
          sql`${tasks.orgId}::text = ${orgId}`,
          sql`${tasks.assignedTo}::text = ${userId}`,
          // Support both current ("done") and legacy ("completed") labels without enum cast errors.
          sql`${tasks.status}::text NOT IN ('done', 'completed')`
        )
      )
      .orderBy(priorityOrder, tasks.dueDate)
      .limit(limit);

    return rows.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      taskType: task.taskType,
    }));
  } catch (error) {
    console.error("Error fetching my tasks:", error);
    return [];
  }
}

/**
 * Recent activity log entries joined with users for display names.
 */
export async function getRecentActivity(orgId: string, limit: number = 10) {
  const rows = await db
    .select({
      id: activityLog.id,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      action: activityLog.action,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      userId: activityLog.userId,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(activityLog)
    .leftJoin(
      organizationMemberships,
      and(
        eq(organizationMemberships.orgId, activityLog.orgId),
        eq(organizationMemberships.userId, activityLog.userId)
      )
    )
    .leftJoin(users, eq(organizationMemberships.userId, users.id))
    .where(eq(activityLog.orgId, orgId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entityType as "workflow" | "contact" | "task",
    entityId: row.entityId,
    action: row.action,
    details: row.details as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    userId: row.userId,
    userName: [row.userFirstName, row.userLastName].filter(Boolean).join(" ") || "System",
  }));
}
