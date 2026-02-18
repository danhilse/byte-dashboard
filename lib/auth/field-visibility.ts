import { and, eq } from "drizzle-orm";

import { type BaseOrgRole, resolveBaseOrgRole } from "@/lib/auth/permissions";
import { normalizeOrgRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationFieldVisibilityPolicies } from "@/lib/db/schema";

export type CrmEntityType = "contact";

export const CONTACT_CRM_FIELDS = [
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

export type ContactCrmField = (typeof CONTACT_CRM_FIELDS)[number];

const CONTACT_FIELD_SET = new Set<ContactCrmField>(CONTACT_CRM_FIELDS);
const ALL_CONTACT_FIELDS = new Set<ContactCrmField>(CONTACT_CRM_FIELDS);

const DEFAULT_GUEST_CONTACT_READ_FIELDS = new Set<ContactCrmField>([
  "firstName",
  "lastName",
  "company",
  "role",
  "status",
  "avatarUrl",
  "tags",
]);

const DEFAULT_CONTACT_READ_FIELDS_BY_ROLE: Record<
  BaseOrgRole,
  ReadonlySet<ContactCrmField>
> = {
  owner: ALL_CONTACT_FIELDS,
  admin: ALL_CONTACT_FIELDS,
  member: ALL_CONTACT_FIELDS,
  user: ALL_CONTACT_FIELDS,
  guest: DEFAULT_GUEST_CONTACT_READ_FIELDS,
};

const DEFAULT_CONTACT_WRITE_FIELDS_BY_ROLE: Record<
  BaseOrgRole,
  ReadonlySet<ContactCrmField>
> = {
  owner: ALL_CONTACT_FIELDS,
  admin: ALL_CONTACT_FIELDS,
  member: ALL_CONTACT_FIELDS,
  user: ALL_CONTACT_FIELDS,
  guest: new Set<ContactCrmField>(),
};

export interface OrganizationFieldVisibilityPolicyRecord {
  orgId: string;
  entityType: CrmEntityType;
  fieldKey: ContactCrmField;
  roleKey: string;
  canRead: boolean;
  canWrite: boolean;
}

export interface ContactFieldAccess {
  readableFields: Set<ContactCrmField>;
  writableFields: Set<ContactCrmField>;
}

type RoleFieldPolicy = {
  canRead: boolean;
  canWrite: boolean;
};

function normalizeRoleKeys(orgRoles: string[]): string[] {
  return [
    ...new Set(
      orgRoles
        .map((role) => normalizeOrgRole(role))
        .filter((role): role is string => Boolean(role))
    ),
  ];
}

function toContactField(value: string): ContactCrmField | null {
  return CONTACT_FIELD_SET.has(value as ContactCrmField)
    ? (value as ContactCrmField)
    : null;
}

function buildRolePolicyMap(
  policies: OrganizationFieldVisibilityPolicyRecord[]
): Map<string, Map<ContactCrmField, RoleFieldPolicy>> {
  const result = new Map<string, Map<ContactCrmField, RoleFieldPolicy>>();

  for (const policy of policies) {
    const rolePolicies =
      result.get(policy.roleKey) ?? new Map<ContactCrmField, RoleFieldPolicy>();

    rolePolicies.set(policy.fieldKey, {
      canRead: policy.canRead,
      canWrite: policy.canRead && policy.canWrite,
    });

    result.set(policy.roleKey, rolePolicies);
  }

  return result;
}

export async function listOrganizationFieldVisibilityPolicies(
  orgId: string,
  entityType: CrmEntityType
): Promise<OrganizationFieldVisibilityPolicyRecord[]> {
  const rows = await db
    .select({
      orgId: organizationFieldVisibilityPolicies.orgId,
      entityType: organizationFieldVisibilityPolicies.entityType,
      fieldKey: organizationFieldVisibilityPolicies.fieldKey,
      roleKey: organizationFieldVisibilityPolicies.roleKey,
      canRead: organizationFieldVisibilityPolicies.canRead,
      canWrite: organizationFieldVisibilityPolicies.canWrite,
    })
    .from(organizationFieldVisibilityPolicies)
    .where(
      and(
        eq(organizationFieldVisibilityPolicies.orgId, orgId),
        eq(organizationFieldVisibilityPolicies.entityType, entityType)
      )
    );

  return rows.flatMap((row) => {
    const fieldKey = toContactField(row.fieldKey);
    const roleKey = normalizeOrgRole(row.roleKey);

    if (!fieldKey || !roleKey) {
      return [];
    }

    return [
      {
        orgId: row.orgId,
        entityType: row.entityType as CrmEntityType,
        fieldKey,
        roleKey,
        canRead: row.canRead,
        canWrite: row.canRead && row.canWrite,
      },
    ];
  });
}

interface UpsertOrganizationFieldVisibilityPolicyInput {
  orgId: string;
  entityType: CrmEntityType;
  fieldKey: ContactCrmField;
  roleKey: string;
  canRead: boolean;
  canWrite: boolean;
}

export async function upsertOrganizationFieldVisibilityPolicy(
  input: UpsertOrganizationFieldVisibilityPolicyInput
): Promise<OrganizationFieldVisibilityPolicyRecord> {
  const roleKey = normalizeOrgRole(input.roleKey);
  if (!roleKey) {
    throw new Error("roleKey is required");
  }

  const canRead = input.canRead;
  const canWrite = input.canRead && input.canWrite;

  await db
    .insert(organizationFieldVisibilityPolicies)
    .values({
      orgId: input.orgId,
      entityType: input.entityType,
      fieldKey: input.fieldKey,
      roleKey,
      canRead,
      canWrite,
    })
    .onConflictDoUpdate({
      target: [
        organizationFieldVisibilityPolicies.orgId,
        organizationFieldVisibilityPolicies.entityType,
        organizationFieldVisibilityPolicies.fieldKey,
        organizationFieldVisibilityPolicies.roleKey,
      ],
      set: {
        canRead,
        canWrite,
        updatedAt: new Date(),
      },
    });

  return {
    orgId: input.orgId,
    entityType: input.entityType,
    fieldKey: input.fieldKey,
    roleKey,
    canRead,
    canWrite,
  };
}

export async function resolveContactFieldAccess(input: {
  orgId: string;
  orgRoles: string[];
}): Promise<ContactFieldAccess> {
  const roleKeys = normalizeRoleKeys(input.orgRoles);
  const readableFields = new Set<ContactCrmField>();
  const writableFields = new Set<ContactCrmField>();

  if (roleKeys.length === 0) {
    return { readableFields, writableFields };
  }

  const policies = await listOrganizationFieldVisibilityPolicies(
    input.orgId,
    "contact"
  );
  const rolePolicyMap = buildRolePolicyMap(policies);

  for (const roleKey of roleKeys) {
    const baseRole = resolveBaseOrgRole(roleKey);
    const defaultReadable =
      baseRole ? DEFAULT_CONTACT_READ_FIELDS_BY_ROLE[baseRole] : new Set<ContactCrmField>();
    const defaultWritable =
      baseRole
        ? DEFAULT_CONTACT_WRITE_FIELDS_BY_ROLE[baseRole]
        : new Set<ContactCrmField>();

    const overrides = rolePolicyMap.get(roleKey) ?? new Map();

    for (const fieldKey of CONTACT_CRM_FIELDS) {
      const override = overrides.get(fieldKey);
      const canRead = override ? override.canRead : defaultReadable.has(fieldKey);
      const canWrite = override ? override.canWrite : defaultWritable.has(fieldKey);

      if (canRead) {
        readableFields.add(fieldKey);
      }

      if (canWrite) {
        writableFields.add(fieldKey);
      }
    }
  }

  return { readableFields, writableFields };
}

export function redactContactForRead<T extends Record<string, unknown>>(
  contact: T,
  readableFields: ReadonlySet<ContactCrmField>
): T {
  const redacted = { ...contact } as Record<string, unknown>;

  for (const field of CONTACT_CRM_FIELDS) {
    if (!readableFields.has(field) && field in redacted) {
      redacted[field] = null;
    }
  }

  return redacted as T;
}

export function redactContactsForRead<T extends Record<string, unknown>>(
  contacts: T[],
  readableFields: ReadonlySet<ContactCrmField>
): T[] {
  return contacts.map((contact) => redactContactForRead(contact, readableFields));
}

export function findForbiddenContactWriteFields(
  payload: Record<string, unknown>,
  writableFields: ReadonlySet<ContactCrmField>
): ContactCrmField[] {
  const forbiddenFields: ContactCrmField[] = [];

  for (const field of CONTACT_CRM_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(payload, field) &&
      !writableFields.has(field)
    ) {
      forbiddenFields.push(field);
    }
  }

  return forbiddenFields;
}
