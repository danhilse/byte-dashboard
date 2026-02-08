/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  verify: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
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
    insert: mocks.insert,
    update: mocks.update,
  },
}));

import { POST } from "@/app/api/webhooks/clerk/route";

function headersWith(values: Record<string, string | null>) {
  return {
    get: (key: string) => values[key] ?? null,
  };
}

function insertChain() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  return { values, onConflictDoUpdate };
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

    const chain = insertChain();
    mocks.insert.mockReturnValue({ values: chain.values });

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Webhook processed successfully");
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(chain.onConflictDoUpdate).toHaveBeenCalledTimes(2);
  });

  it("updates role on organizationMembership.updated", async () => {
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
        public_user_data: { user_id: "user_1" },
        role: "org:admin",
      },
    });
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    mocks.update.mockReturnValue({ set });

    const res = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      })
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Webhook processed successfully");
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = originalSecret;
  });
});
