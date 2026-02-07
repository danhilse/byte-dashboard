import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tasks, contacts, workflows } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

/**
 * GET /api/tasks
 *
 * Lists tasks for the authenticated organization.
 * Query params:
 *   ?status=todo,in_progress  - filter by status(es)
 *   ?available=true           - only unclaimed role-based tasks
 */
export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const availableParam = url.searchParams.get("available");

    const rows = await db
      .select({
        task: tasks,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        workflowStatus: workflows.status,
      })
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contactId, contacts.id))
      .leftJoin(workflows, eq(tasks.workflowId, workflows.id))
      .where(eq(tasks.orgId, orgId))
      .orderBy(tasks.position, desc(tasks.createdAt));

    let result = rows.map(({ task, contactFirstName, contactLastName }) => {
      const contactName =
        contactFirstName || contactLastName
          ? `${contactFirstName ?? ""} ${contactLastName ?? ""}`.trim()
          : undefined;

      return {
        ...task,
        contactName,
      };
    });

    // Filter by status
    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim());
      result = result.filter((t) => statuses.includes(t.status));
    }

    // Filter to available (unclaimed role-based) tasks
    if (availableParam === "true") {
      result = result.filter(
        (t) => !t.assignedTo && t.assignedRole
      );
    }

    return NextResponse.json({ tasks: result });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 *
 * Creates a new task.
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      status,
      priority,
      taskType,
      assignedTo,
      assignedRole,
      workflowId,
      contactId,
      dueDate,
      position,
      metadata,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    // Validate contactId belongs to org if provided
    if (contactId) {
      const [contact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.orgId, orgId)));

      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found" },
          { status: 404 }
        );
      }
    }

    // Validate workflowId belongs to org if provided
    if (workflowId) {
      const [workflow] = await db
        .select({ id: workflows.id })
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.orgId, orgId)));

      if (!workflow) {
        return NextResponse.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }
    }

    const [task] = await db
      .insert(tasks)
      .values({
        orgId,
        title,
        description: description || null,
        status: status || "todo",
        priority: priority || "medium",
        taskType: taskType || "standard",
        assignedTo: assignedTo || null,
        assignedRole: assignedRole || null,
        workflowId: workflowId || null,
        contactId: contactId || null,
        dueDate: dueDate || null,
        position: position ?? 0,
        metadata: metadata || {},
      })
      .returning();

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      {
        error: "Failed to create task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
