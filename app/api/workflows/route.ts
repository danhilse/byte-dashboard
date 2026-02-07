import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts, workflows } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

function getWorkflowProgress(status: string): number {
  if (status === "approved" || status === "completed") return 100;
  if (status === "rejected" || status === "failed" || status === "timeout") return 100;
  if (status === "in_review") return 50;
  if (status === "running") return 25;
  return 0;
}

/**
 * GET /api/workflows
 *
 * Lists workflow executions for the authenticated organization.
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
      })
      .from(workflows)
      .leftJoin(
        contacts,
        and(eq(workflows.contactId, contacts.id), eq(contacts.orgId, orgId))
      )
      .where(eq(workflows.orgId, orgId))
      .orderBy(desc(workflows.startedAt));

    const executions = rows.map(({ workflow, contact }) => {
      const contactName = contact
        ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
        : undefined;

      return {
        ...workflow,
        contact,
        contactName,
        contactAvatarUrl: contact?.avatarUrl ?? undefined,
        title: contactName
          ? `Applicant Review - ${contactName}`
          : `Workflow ${workflow.id.slice(0, 8)}`,
        progress: getWorkflowProgress(workflow.status),
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
