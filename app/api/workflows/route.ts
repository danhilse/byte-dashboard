import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts, workflows, workflowDefinitions } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

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
        workflow: workflows,
        contact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          avatarUrl: contacts.avatarUrl,
          email: contacts.email,
        },
        definitionName: workflowDefinitions.name,
      })
      .from(workflows)
      .leftJoin(
        contacts,
        and(eq(workflows.contactId, contacts.id), eq(contacts.orgId, orgId))
      )
      .leftJoin(
        workflowDefinitions,
        eq(workflows.workflowDefinitionId, workflowDefinitions.id)
      )
      .where(eq(workflows.orgId, orgId))
      .orderBy(desc(workflows.startedAt));

    const executions = rows.map(({ workflow, contact, definitionName }) => {
      const contactName = contact
        ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
        : undefined;

      return {
        ...workflow,
        contact,
        contactName,
        contactAvatarUrl: contact?.avatarUrl ?? undefined,
        definitionName: definitionName ?? undefined,
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
    if (workflowDefinitionId) {
      const [definition] = await db
        .select()
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
    }

    const [workflow] = await db
      .insert(workflows)
      .values({
        orgId,
        contactId,
        workflowDefinitionId: workflowDefinitionId || null,
        definitionVersion: definitionVersion ?? null,
        status: status || "draft",
        source: source || "manual",
        variables: variables || {},
        metadata: metadata || {},
      })
      .returning();

    const contactName =
      `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();

    return NextResponse.json({
      workflow: {
        ...workflow,
        contactName,
        contactAvatarUrl: contact.avatarUrl ?? undefined,
        definitionName,
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
