import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/lib/db/log-activity";
import { triggerWorkflowDefinitionsForContactUpdated } from "@/lib/workflow-triggers";

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
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)));

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ contact });
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
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, orgId)));

    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const body = await req.json();
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
    if (lastContactedAt !== undefined) updateData.lastContactedAt = lastContactedAt;
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

    return NextResponse.json({ contact });
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
    const { userId, orgId } = await auth();
    const { id } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      details: { firstName: deletedContact.firstName, lastName: deletedContact.lastName },
    });

    return NextResponse.json({ success: true, contact: deletedContact });
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
