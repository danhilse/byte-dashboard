import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  // Get the Clerk webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error: Verification failed", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Get the user's organization memberships
    const orgMemberships = evt.data.organization_memberships || [];

    // Sync user for each organization they belong to
    for (const membership of orgMemberships) {
      const orgId = membership.organization.id;
      const role = membership.role;

      try {
        // Upsert user to database
        await db
          .insert(users)
          .values({
            id,
            orgId,
            email: email_addresses[0]?.email_address || "",
            firstName: first_name || null,
            lastName: last_name || null,
            role: role === "org:admin" ? "admin" : "user",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email: email_addresses[0]?.email_address || "",
              firstName: first_name || null,
              lastName: last_name || null,
              role: role === "org:admin" ? "admin" : "user",
              updatedAt: new Date(),
            },
          });

        console.log(
          `User ${id} synced to organization ${orgId} with role ${role}`
        );
      } catch (error) {
        console.error(`Error syncing user ${id} to org ${orgId}:`, error);
      }
    }
  }

  if (eventType === "organizationMembership.created") {
    const { organization, public_user_data, role } = evt.data;

    try {
      // Sync user to this new organization
      await db
        .insert(users)
        .values({
          id: public_user_data.user_id,
          orgId: organization.id,
          email: public_user_data.identifier || "",
          firstName: public_user_data.first_name || null,
          lastName: public_user_data.last_name || null,
          role: role === "org:admin" ? "admin" : "user",
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            orgId: organization.id,
            role: role === "org:admin" ? "admin" : "user",
            updatedAt: new Date(),
          },
        });

      console.log(
        `User ${public_user_data.user_id} added to organization ${organization.id}`
      );
    } catch (error) {
      console.error("Error syncing organization membership:", error);
    }
  }

  if (eventType === "organizationMembership.updated") {
    const { organization, public_user_data, role } = evt.data;

    try {
      // Update user role in organization
      await db
        .update(users)
        .set({
          role: role === "org:admin" ? "admin" : "user",
          updatedAt: new Date(),
        })
        .where(eq(users.id, public_user_data.user_id));

      console.log(
        `User ${public_user_data.user_id} role updated in organization ${organization.id}`
      );
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  }

  return new Response("Webhook processed successfully", { status: 200 });
}
