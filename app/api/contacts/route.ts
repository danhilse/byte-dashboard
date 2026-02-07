import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/contacts
 *
 * Lists all contacts for the authenticated user's organization
 */
export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactsList = await db
      .select()
      .from(contacts)
      .where(eq(contacts.orgId, orgId))
      .orderBy(contacts.createdAt);

    return NextResponse.json({ contacts: contactsList });
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
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "firstName and lastName are required" },
        { status: 400 }
      );
    }

    const [contact] = await db
      .insert(contacts)
      .values({
        orgId,
        firstName,
        lastName,
        email,
        phone,
        company,
        role,
        status: status || "active",
        avatarUrl,
        lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : null,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        metadata: metadata || {},
        tags: tags || [],
      })
      .returning();

    return NextResponse.json({ contact });
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
