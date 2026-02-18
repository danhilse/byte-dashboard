/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  verify: vi.fn(),
  dbDelete: vi.fn(),
  upsertClerkUserProfile: vi.fn(),
  upsertOrganizationMembership: vi.fn(),
  removeOrganizationMembership: vi.fn(),
  syncOrganizationUsersFromClerk: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("svix", () => ({
  Webhook: class {
    verify = mocks.verify;
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    delete: mocks.dbDelete,
  },
}));

vi.mock("@/lib/users/service", () => ({
  upsertClerkUserProfile: mocks.upsertClerkUserProfile,
  upsertOrganizationMembership: mocks.upsertOrganizationMembership,
  removeOrganizationMembership: mocks.removeOrganizationMembership,
  syncOrganizationUsersFromClerk: mocks.syncOrganizationUsersFromClerk,
}));

function deleteChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  return { where };
}

import { POST } from "@/app/api/webhooks/clerk/route";

function headersWith(values: Record<string, string | null>) {
  return {
    get: (key: string) => values[key] ?? null,
  };
}

describe("app/api/webhooks/clerk/route", () => {
  const originalSecret = process.env.CLERK_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_test";
  });

  it("throws when webhook secret is missing", async () => {
    process.env.CLERK_WEBHOOK_SECRET = "";

    await expect(
      POST(
        new Request("http://localhost/api/webhooks/clerk", {
          method: "POST",
          body: "{}",
        })
      )
    ).rejects.toThrow(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env.local"
    );
  });

  it("returns 400 when svix headers are missing", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": null,
        "svix-timestamp": null,
        "svix-signature": null,
      })
    );

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Error: Missing svix headers");
  });

  it("returns 400 when signature verification fails", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ type: "user.created", data: {} }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Error: Verification failed");
  });

  it("processes user.created event and upserts memberships", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockReturnValue({
      type: "user.created",
      data: {
        id: "user_1",
        email_addresses: [{ email_address: "ada@example.com" }],
        first_name: "Ada",
        last_name: "Lovelace",
        organization_memberships: [
          { organization: { id: "org_1" }, role: "org:admin" },
          { organization: { id: "org_2" }, role: "org:member" },
        ],
      },
    });

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Webhook processed successfully");
    expect(mocks.upsertClerkUserProfile).toHaveBeenCalledTimes(2);
    expect(mocks.upsertOrganizationMembership).toHaveBeenCalledTimes(2);
  });

  it("verifies signature against raw request body", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockReturnValue({
      type: "user.created",
      data: {},
    });

    const rawBody = '{ "type":"user.created", "data":{} }';
    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: rawBody,
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.verify).toHaveBeenCalledWith(rawBody, {
      "svix-id": "id_1",
      "svix-timestamp": "123",
      "svix-signature": "sig",
    });
  });

  it("updates membership on organizationMembership.updated", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockReturnValue({
      type: "organizationMembership.updated",
      data: {
        organization: { id: "org_1" },
        public_user_data: {
          user_id: "user_1",
          identifier: "ada@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
        },
        role: "org:admin",
      },
    });

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Webhook processed successfully");
    expect(mocks.upsertClerkUserProfile).toHaveBeenCalledTimes(1);
    expect(mocks.upsertOrganizationMembership).toHaveBeenCalledTimes(1);
  });

  it("removes membership on organizationMembership.deleted", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockReturnValue({
      type: "organizationMembership.deleted",
      data: {
        organization: { id: "org_1" },
        public_user_data: { user_id: "user_1" },
      },
    });

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.removeOrganizationMembership).toHaveBeenCalledWith(
      "org_1",
      "user_1"
    );
  });

  it("syncs org memberships on organization.created", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockReturnValue({
      type: "organization.created",
      data: { id: "org_1" },
    });

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.syncOrganizationUsersFromClerk).toHaveBeenCalledWith("org_1");
  });

  it("deletes org memberships on organization.deleted", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockReturnValue({
      type: "organization.deleted",
      data: { id: "org_1" },
    });
    const chain = deleteChain();
    mocks.dbDelete.mockReturnValue(chain);

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.dbDelete).toHaveBeenCalledTimes(1);
    expect(chain.where).toHaveBeenCalledTimes(1);
  });

  it("deletes memberships on user.deleted", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockReturnValue({
      type: "user.deleted",
      data: { id: "user_1" },
    });
    const chain = deleteChain();
    mocks.dbDelete.mockReturnValue(chain);

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.dbDelete).toHaveBeenCalledTimes(1);
    expect(chain.where).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when sync processing fails", async () => {
    mocks.headers.mockResolvedValue(
      headersWith({
        "svix-id": "id_1",
        "svix-timestamp": "123",
        "svix-signature": "sig",
      })
    );
    mocks.verify.mockReturnValue({
      type: "organizationMembership.updated",
      data: {
        organization: { id: "org_1" },
        public_user_data: {
          user_id: "user_1",
          identifier: "ada@example.com",
        },
        role: "org:admin",
      },
    });
    mocks.upsertOrganizationMembership.mockRejectedValueOnce(
      new Error("db unavailable")
    );

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Error: Webhook processing failed");
  });

  afterEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = originalSecret;
  });
});
