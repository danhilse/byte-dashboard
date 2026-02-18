import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizationMemberships } from "@/lib/db/schema";
import {
  removeOrganizationMembership,
  syncOrganizationUsersFromClerk,
  upsertClerkUserProfile,
  upsertOrganizationMembership,
} from "@/lib/users/service";

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

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

  // Use the raw request body for signature verification.
  const body = await req.text();

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

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const data = evt.data as {
        id?: string;
        email_addresses?: Array<{ email_address?: string }>;
        first_name?: string | null;
        last_name?: string | null;
        organization_memberships?: Array<{
          organization?: { id?: string };
          role?: string | null;
        }>;
      };
      const userId = toOptionalString(data.id);
      const email = data.email_addresses?.[0]?.email_address ?? "";
      const memberships = Array.isArray(data.organization_memberships)
        ? data.organization_memberships
        : [];

      if (userId) {
        for (const membership of memberships) {
          const orgId = toOptionalString(membership.organization?.id);
          if (!orgId) continue;

          await upsertClerkUserProfile({
            userId,
            legacyOrgId: orgId,
            email,
            firstName: data.first_name ?? null,
            lastName: data.last_name ?? null,
            role: membership.role ?? null,
          });
          await upsertOrganizationMembership({
            orgId,
            userId,
            clerkRole: membership.role ?? null,
          });
        }
      }
    }

    if (
      eventType === "organizationMembership.created" ||
      eventType === "organizationMembership.updated"
    ) {
      const data = evt.data as {
        organization?: { id?: string };
        public_user_data?: {
          user_id?: string;
          identifier?: string | null;
          first_name?: string | null;
          last_name?: string | null;
        };
        role?: string | null;
      };

      const orgId = toOptionalString(data.organization?.id);
      const userId = toOptionalString(data.public_user_data?.user_id);
      if (orgId && userId) {
        await upsertClerkUserProfile({
          userId,
          legacyOrgId: orgId,
          email: data.public_user_data?.identifier ?? "",
          firstName: data.public_user_data?.first_name ?? null,
          lastName: data.public_user_data?.last_name ?? null,
          role: data.role ?? null,
        });
        await upsertOrganizationMembership({
          orgId,
          userId,
          clerkRole: data.role ?? null,
        });
      }
    }

    if (eventType === "organizationMembership.deleted") {
      const data = evt.data as {
        organization?: { id?: string };
        public_user_data?: { user_id?: string };
        user_id?: string;
      };
      const orgId = toOptionalString(data.organization?.id);
      const userId =
        toOptionalString(data.public_user_data?.user_id) ??
        toOptionalString(data.user_id);

      if (orgId && userId) {
        await removeOrganizationMembership(orgId, userId);
      }
    }

    if (eventType === "organization.created" || eventType === "organization.updated") {
      const data = evt.data as { id?: string };
      const orgId = toOptionalString(data.id);

      if (orgId) {
        await syncOrganizationUsersFromClerk(orgId);
      }
    }

    if (eventType === "organization.deleted") {
      const data = evt.data as { id?: string };
      const orgId = toOptionalString(data.id);

      if (orgId) {
        await db
          .delete(organizationMemberships)
          .where(eq(organizationMemberships.orgId, orgId));
      }
    }

    if (eventType === "user.deleted") {
      const data = evt.data as { id?: string };
      const userId = toOptionalString(data.id);

      if (userId) {
        await db
          .delete(organizationMemberships)
          .where(eq(organizationMemberships.userId, userId));
      }
    }
  } catch (error) {
    console.error(`Error processing Clerk webhook event "${eventType}":`, error);
    return new Response("Error: Webhook processing failed", { status: 500 });
  }

  return new Response("Webhook processed successfully", { status: 200 });
}
