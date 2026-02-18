import { clerkClient } from "@clerk/nextjs/server";

import {
  syncOrganizationUsersFromClerk,
  upsertClerkUserProfile,
  upsertOrganizationMembership,
} from "../lib/users/service";

const DEFAULT_ORG_NAME = "Fayette County Sheriff's Office";
const DEFAULT_ORG_SLUG = "fayette-county-sheriff-office";
const OWNER_MEMBERSHIP_ROLE = "org:admin";

interface ProvisionOptions {
  orgName: string;
  orgSlug: string;
  orgId: string | null;
  ownerEmail: string | null;
  ownerUserId: string | null;
  dryRun: boolean;
  skipDbSync: boolean;
}

interface ClerkEmailAddress {
  emailAddress: string;
}

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: ClerkEmailAddress[];
  primaryEmailAddress?: ClerkEmailAddress | null;
}

interface ClerkOrganization {
  id: string;
  slug: string;
  createdBy?: string;
}

interface ClerkOrganizationMembership {
  role: string;
}

function printUsage(): void {
  console.log(
    [
      "Usage:",
      "  npx tsx --env-file=.env.local scripts/provision-fayette-org.ts [options]",
      "",
      "Options:",
      "  --org-name <name>         Organization name",
      "  --org-slug <slug>         Organization slug",
      "  --org-id <id>             Existing organization ID (skip slug lookup/create)",
      "  --owner-email <email>     Owner user email",
      "  --owner-user-id <id>      Owner Clerk user ID",
      "  --dry-run                 Print planned changes without writing to Clerk/DB",
      "  --skip-db-sync            Skip syncing local DB user/membership records",
      "",
      "Env defaults:",
      "  AUTH_PROVISION_ORG_NAME, AUTH_PROVISION_ORG_SLUG, AUTH_PROVISION_ORG_ID, AUTH_PROVISION_OWNER_EMAIL, AUTH_PROVISION_OWNER_USER_ID",
      "  (legacy supported: FAYETTE_ORG_NAME, FAYETTE_ORG_SLUG, FAYETTE_OWNER_EMAIL, FAYETTE_OWNER_USER_ID)",
    ].join("\n")
  );
}

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    return undefined;
  }

  return value;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseOptions(): ProvisionOptions {
  const orgName =
    readArg("--org-name") ??
    process.env.AUTH_PROVISION_ORG_NAME ??
    process.env.FAYETTE_ORG_NAME ??
    DEFAULT_ORG_NAME;
  const orgSlug =
    readArg("--org-slug") ??
    process.env.AUTH_PROVISION_ORG_SLUG ??
    process.env.FAYETTE_ORG_SLUG ??
    DEFAULT_ORG_SLUG;
  const orgId =
    readArg("--org-id") ?? process.env.AUTH_PROVISION_ORG_ID ?? null;
  const ownerEmail =
    readArg("--owner-email") ??
    process.env.AUTH_PROVISION_OWNER_EMAIL ??
    process.env.FAYETTE_OWNER_EMAIL ??
    null;
  const ownerUserId =
    readArg("--owner-user-id") ??
    process.env.AUTH_PROVISION_OWNER_USER_ID ??
    process.env.FAYETTE_OWNER_USER_ID ??
    null;
  const dryRun = hasFlag("--dry-run");
  const skipDbSync = hasFlag("--skip-db-sync");

  return {
    orgName,
    orgSlug,
    orgId,
    ownerEmail,
    ownerUserId,
    dryRun,
    skipDbSync,
  };
}

function getUserEmails(user: ClerkUser): string[] {
  return user.emailAddresses
    .map((emailAddress) => emailAddress.emailAddress.toLowerCase())
    .filter((email) => email.length > 0);
}

function userHasEmail(user: ClerkUser, email: string): boolean {
  return getUserEmails(user).includes(email.toLowerCase());
}

function getPreferredEmail(user: ClerkUser): string {
  return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
}

async function resolveOwnerUser(
  client: Awaited<ReturnType<typeof clerkClient>>,
  options: ProvisionOptions
): Promise<ClerkUser> {
  if (options.ownerUserId) {
    const ownerUser = await client.users.getUser(options.ownerUserId);

    if (options.ownerEmail && !userHasEmail(ownerUser, options.ownerEmail)) {
      throw new Error(
        `Owner user ${ownerUser.id} does not have email ${options.ownerEmail}.`
      );
    }

    return ownerUser;
  }

  if (!options.ownerEmail) {
    throw new Error("Provide --owner-email or --owner-user-id.");
  }
  const ownerEmail = options.ownerEmail;

  const userPage = await client.users.getUserList({
    emailAddress: [ownerEmail],
    limit: 10,
  });

  const matches = userPage.data.filter((candidate) =>
    userHasEmail(candidate, ownerEmail)
  );

  if (matches.length === 0) {
    throw new Error(`No Clerk user found for email ${options.ownerEmail}.`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Multiple Clerk users matched ${options.ownerEmail}. Re-run with --owner-user-id.`
    );
  }

  return matches[0];
}

async function findOrganizationBySlug(
  client: Awaited<ReturnType<typeof clerkClient>>,
  slug: string
): Promise<ClerkOrganization | null> {
  const organizationPage = await client.organizations.getOrganizationList({
    query: slug,
    limit: 100,
  });

  return (
    organizationPage.data.find((organization) => organization.slug === slug) ?? null
  );
}

async function findOrganizationById(
  client: Awaited<ReturnType<typeof clerkClient>>,
  orgId: string
): Promise<ClerkOrganization | null> {
  try {
    const organization = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    return organization as ClerkOrganization;
  } catch {
    return null;
  }
}

async function ensureOwnerMembership(
  client: Awaited<ReturnType<typeof clerkClient>>,
  organizationId: string,
  userId: string,
  dryRun: boolean
): Promise<ClerkOrganizationMembership | null> {
  const membershipPage = await client.organizations.getOrganizationMembershipList({
    organizationId,
    userId: [userId],
    limit: 10,
  });

  const existingMembership = membershipPage.data[0] ?? null;

  if (!existingMembership) {
    if (dryRun) {
      console.log(
        `DRY RUN: would create membership ${OWNER_MEMBERSHIP_ROLE} for user ${userId}.`
      );
      return null;
    }

    return client.organizations.createOrganizationMembership({
      organizationId,
      userId,
      role: OWNER_MEMBERSHIP_ROLE,
    });
  }

  if (existingMembership.role !== OWNER_MEMBERSHIP_ROLE) {
    if (dryRun) {
      console.log(
        `DRY RUN: would update membership role from ${existingMembership.role} to ${OWNER_MEMBERSHIP_ROLE}.`
      );
      return existingMembership;
    }

    return client.organizations.updateOrganizationMembership({
      organizationId,
      userId,
      role: OWNER_MEMBERSHIP_ROLE,
    });
  }

  return existingMembership;
}

async function run(): Promise<void> {
  const options = parseOptions();

  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  if (!options.ownerEmail && !options.ownerUserId) {
    printUsage();
    throw new Error("Missing owner identity. Provide --owner-email or --owner-user-id.");
  }

  const client = await clerkClient();

  console.log("Provision options:");
  console.log(`  orgName: ${options.orgName}`);
  console.log(`  orgSlug: ${options.orgSlug}`);
  console.log(`  orgId: ${options.orgId ?? "(not provided)"}`);
  console.log(`  ownerEmail: ${options.ownerEmail ?? "(not provided)"}`);
  console.log(`  ownerUserId: ${options.ownerUserId ?? "(resolved by email)"}`);
  console.log(`  dryRun: ${options.dryRun}`);
  console.log(`  skipDbSync: ${options.skipDbSync}`);

  const ownerUser = await resolveOwnerUser(client, options);
  console.log(
    `Resolved owner: ${ownerUser.id} (${getPreferredEmail(ownerUser) || "no-email"})`
  );

  let organization = options.orgId
    ? await findOrganizationById(client, options.orgId)
    : await findOrganizationBySlug(client, options.orgSlug);

  if (options.orgId && !organization) {
    throw new Error(
      `No Clerk organization found for --org-id ${options.orgId}.`
    );
  }

  if (!organization) {
    if (options.dryRun) {
      console.log(
        `DRY RUN: would create organization "${options.orgName}" with slug "${options.orgSlug}" and createdBy "${ownerUser.id}".`
      );
      return;
    }

    organization = await client.organizations.createOrganization({
      name: options.orgName,
      slug: options.orgSlug,
      createdBy: ownerUser.id,
    });
    console.log(`Created organization ${organization.id}.`);
  } else {
    console.log(`Organization already exists: ${organization.id}.`);
  }

  if (organization.createdBy && organization.createdBy !== ownerUser.id) {
    console.warn(
      [
        `WARNING: org owner is currently ${organization.createdBy}, not ${ownerUser.id}.`,
        "If ownership should change, complete owner transfer in Clerk dashboard.",
      ].join(" ")
    );
  }

  const membership = await ensureOwnerMembership(
    client,
    organization.id,
    ownerUser.id,
    options.dryRun
  );

  if (membership) {
    console.log(
      `Owner membership ensured: user=${ownerUser.id}, org=${organization.id}, role=${membership.role}.`
    );
  }

  if (options.dryRun) {
    return;
  }

  if (options.skipDbSync) {
    console.log("Skipped local DB sync (--skip-db-sync).");
    return;
  }

  const roleForSync = membership?.role ?? OWNER_MEMBERSHIP_ROLE;
  const ownerEmail = getPreferredEmail(ownerUser);

  await upsertClerkUserProfile({
    userId: ownerUser.id,
    legacyOrgId: organization.id,
    email: ownerEmail,
    firstName: ownerUser.firstName ?? null,
    lastName: ownerUser.lastName ?? null,
    role: roleForSync,
  });

  await upsertOrganizationMembership({
    orgId: organization.id,
    userId: ownerUser.id,
    clerkRole: roleForSync,
  });

  const syncedCount = await syncOrganizationUsersFromClerk(organization.id);
  console.log(`Local DB sync complete for org ${organization.id}: ${syncedCount} user(s).`);
}

run()
  .then(() => {
    console.log("Provisioning complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Provisioning failed:", error);
    process.exit(1);
  });
