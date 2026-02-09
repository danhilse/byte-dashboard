import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts, workflowExecutions, workflowDefinitions } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { logActivity } from "@/lib/db/log-activity";
import {
  getAllowedWorkflowStatuses,
  isAllowedWorkflowStatus,
  resolveInitialWorkflowStatus,
} from "@/lib/workflow-status";
import type { DefinitionStatus } from "@/types";

/**
 * GET /api/workflows
 *
 * Lists workflow executions for the authenticated organization.
 * Joins contacts and workflow_definitions for display names.
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        workflow: workflowExecutions,
        contact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          avatarUrl: contacts.avatarUrl,
          email: contacts.email,
        },
        definitionName: workflowDefinitions.name,
        definitionStatuses: workflowDefinitions.statuses,
      })
      .from(workflowExecutions)
      .leftJoin(
        contacts,
        and(eq(workflowExecutions.contactId, contacts.id), eq(contacts.orgId, orgId))
      )
      .leftJoin(
        workflowDefinitions,
        eq(workflowExecutions.workflowDefinitionId, workflowDefinitions.id)
      )
      .where(eq(workflowExecutions.orgId, orgId))
      .orderBy(desc(workflowExecutions.startedAt));

    const executions = rows.map(({ workflow, contact, definitionName, definitionStatuses }) => {
      const contactName = contact
        ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
        : undefined;

      return {
        ...workflow,
        contact,
        contactName,
        contactAvatarUrl: contact?.avatarUrl ?? undefined,
        definitionName: definitionName ?? undefined,
        definitionStatuses:
          (definitionStatuses as DefinitionStatus[] | null) ?? undefined,
      };
    });

    return NextResponse.json({ workflows: executions });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch workflows",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 *
 * Creates a new workflow execution (manual, no Temporal).
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      contactId,
      workflowDefinitionId,
      status,
      source,
      variables,
      metadata,
    } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    // Validate contact exists and belongs to org
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.orgId, orgId)));

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // If definition provided, validate and snapshot version
    let definitionVersion: number | undefined;
    let definitionName: string | undefined;
    let definitionStatuses: DefinitionStatus[] | undefined;
    if (workflowDefinitionId) {
      const [definition] = await db
        .select({
          id: workflowDefinitions.id,
          name: workflowDefinitions.name,
          version: workflowDefinitions.version,
          statuses: workflowDefinitions.statuses,
        })
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, workflowDefinitionId),
            eq(workflowDefinitions.orgId, orgId)
          )
        );

      if (!definition) {
        return NextResponse.json(
          { error: "Workflow definition not found" },
          { status: 404 }
        );
      }

      definitionVersion = definition.version;
      definitionName = definition.name;
      definitionStatuses =
        (definition.statuses as DefinitionStatus[] | null) ?? [];
    }

    if (status !== undefined) {
      if (!isAllowedWorkflowStatus(status, definitionStatuses)) {
        return NextResponse.json(
          {
            error: "Invalid workflow status for this workflow definition",
            allowedStatuses: getAllowedWorkflowStatuses(definitionStatuses),
          },
          { status: 400 }
        );
      }
    }

    const initialStatus =
      status ??
      resolveInitialWorkflowStatus(
        definitionStatuses,
        workflowDefinitionId ? "running" : "draft"
      );

    const [workflow] = await db
      .insert(workflowExecutions)
      .values({
        orgId,
        contactId,
        workflowDefinitionId: workflowDefinitionId || null,
        definitionVersion: definitionVersion ?? null,
        status: initialStatus,
        source: source || "manual",
        variables: variables || {},
        metadata: metadata || {},
      })
      .returning();

    const contactName =
      `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();

    await logActivity({
      orgId,
      userId,
      entityType: "workflow",
      entityId: workflow.id,
      action: "created",
      details: { contactName, definitionName },
    });

    return NextResponse.json({
      workflow: {
        ...workflow,
        contactName,
        contactAvatarUrl: contact.avatarUrl ?? undefined,
        definitionName,
        definitionStatuses,
      },
    });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to create workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
