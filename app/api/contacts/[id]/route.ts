import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/lib/db/log-activity";
import { triggerWorkflowDefinitionsForContactUpdated } from "@/lib/workflow-triggers";
import {
  findForbiddenContactWriteFields,
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

const TRACKED_CONTACT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "company",
  "role",
  "status",
  "avatarUrl",
  "lastContactedAt",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "zip",
  "tags",
  "metadata",
] as const;

function normalizeComparableValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function areEquivalentValues(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeComparableValue(left);
  const normalizedRight = normalizeComparableValue(right);

  if (
    normalizedLeft !== null &&
    normalizedRight !== null &&
    typeof normalizedLeft === "object" &&
    typeof normalizedRight === "object"
  ) {
    return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
  }

  return normalizedLeft === normalizedRight;
}

function detectChangedContactFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const changedFields: string[] = [];

  for (const field of TRACKED_CONTACT_FIELDS) {
    if (!areEquivalentValues(before[field], after[field])) {
      changedFields.push(field);
    }
  }

  return changedFields;
}

/**
 * GET /api/contacts/:id
 *
 * Gets a single contact by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "contacts.read",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { orgId, orgRoles } = authResult.context;
    const fieldAccess = await resolveContactFieldAccess({ orgId, orgRoles });

    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)));

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({
      contact: redactContactForRead(contact, fieldAccess.readableFields),
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch contact",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contacts/:id
 *
 * Updates a contact
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "contacts.write",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId, orgRoles } = authResult.context;
    const fieldAccess = await resolveContactFieldAccess({ orgId, orgRoles });

    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)));

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

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

    const validationErrors = validateContactPayload(body as unknown as Record<string, unknown>, "update");
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

    // Build update object dynamically (only include provided fields)
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (lastContactedAt !== undefined) {
      updateData.lastContactedAt = lastContactedAt
        ? new Date(String(lastContactedAt))
        : null;
    }
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zip !== undefined) updateData.zip = zip;
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = metadata;

    const [contact] = await db
      .update(contacts)
      .set(updateData)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)))
      .returning();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await logActivity({
      orgId,
      userId,
      entityType: "contact",
      entityId: id,
      action: "updated",
    });

    const changedFields = detectChangedContactFields(
      existingContact as Record<string, unknown>,
      contact as Record<string, unknown>
    );

    if (changedFields.length > 0) {
      try {
        await triggerWorkflowDefinitionsForContactUpdated({
          orgId,
          userId,
          contact,
          changedFields,
        });
      } catch (triggerError) {
        // Auto-triggering should not fail contact updates.
        console.error("Failed to run contact_field_changed workflow triggers:", triggerError);
      }
    }

    return NextResponse.json({
      contact: redactContactForRead(contact, fieldAccess.readableFields),
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      {
        error: "Failed to update contact",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/:id
 *
 * Deletes a contact
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth({
      requiredPermission: "contacts.write",
    });
    const { id } = await params;

    if (!authResult.ok) {
      return authResult.response;
    }
    const { userId, orgId, orgRoles } = authResult.context;
    const fieldAccess = await resolveContactFieldAccess({ orgId, orgRoles });

    const [deletedContact] = await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)))
      .returning();

    if (!deletedContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await logActivity({
      orgId,
      userId,
      entityType: "contact",
      entityId: id,
      action: "deleted",
    });

    return NextResponse.json({
      success: true,
      contact: redactContactForRead(deletedContact, fieldAccess.readableFields),
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      {
        error: "Failed to delete contact",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
