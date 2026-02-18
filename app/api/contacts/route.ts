import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/db/log-activity";
import { triggerWorkflowDefinitionsForContactCreated } from "@/lib/workflow-triggers";
import {
  findForbiddenContactWriteFields,
  redactContactsForRead,
  redactContactForRead,
  resolveContactFieldAccess,
} from "@/lib/auth/field-visibility";
import { validateContactPayload } from "@/lib/validation/rules";
import { parseJsonBody, validationErrorResponse } from "@/lib/validation/api-helpers";

interface ContactMutationPayload {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  status?: string | null;
  avatarUrl?: string | null;
  lastContactedAt?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * GET /api/contacts
 *
 * Lists all contacts for the authenticated user's organization
 */
export async function GET() {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "contacts.read",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { orgId, orgRoles } = authResult.context;
    const fieldAccess = await resolveContactFieldAccess({ orgId, orgRoles });

    const contactsList = await db
      .select()
      .from(contacts)
      .where(eq(contacts.orgId, orgId))
      .orderBy(contacts.createdAt);

    return NextResponse.json({
      contacts: redactContactsForRead(contactsList, fieldAccess.readableFields),
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch contacts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts
 *
 * Creates a new contact
 */
export async function POST(req: Request) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "contacts.write",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { userId, orgId, orgRoles } = authResult.context;
    const fieldAccess = await resolveContactFieldAccess({ orgId, orgRoles });

    const result = await parseJsonBody(req);
    if ("error" in result) return result.error;
    const body = result.body as ContactMutationPayload;

    const forbiddenFields = findForbiddenContactWriteFields(
      body as Record<string, unknown>,
      fieldAccess.writableFields
    );

    if (forbiddenFields.length > 0) {
      return NextResponse.json(
        {
          error: "Forbidden",
          details: "You do not have permission to update one or more contact fields",
          fields: forbiddenFields,
        },
        { status: 403 }
      );
    }

    const validationErrors = validateContactPayload(body as unknown as Record<string, unknown>, "create");
    if (validationErrors.length > 0) return validationErrorResponse(validationErrors);

    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      role,
      status,
      avatarUrl,
      lastContactedAt,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      tags,
      metadata,
    } = body;

    // firstName and lastName are guaranteed non-empty by validateContactPayload
    const [contact] = await db
      .insert(contacts)
      .values({
        orgId,
        firstName: firstName!,
        lastName: lastName!,
        email,
        phone,
        company,
        role,
        status: status || "active",
        avatarUrl,
        lastContactedAt: lastContactedAt ? new Date(String(lastContactedAt)) : null,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        metadata: metadata || {},
        tags: tags || [],
      })
      .returning();

    await logActivity({
      orgId,
      userId,
      entityType: "contact",
      entityId: contact.id,
      action: "created",
    });

    try {
      await triggerWorkflowDefinitionsForContactCreated({
        orgId,
        userId,
        contact,
      });
    } catch (triggerError) {
      // Auto-triggering should not fail contact creation.
      console.error("Failed to run contact_created workflow triggers:", triggerError);
    }

    return NextResponse.json({
      contact: redactContactForRead(contact, fieldAccess.readableFields),
    });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      {
        error: "Failed to create contact",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
