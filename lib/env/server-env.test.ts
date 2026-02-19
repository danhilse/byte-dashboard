/** @vitest-environment node */

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  resetServerEnvironmentValidationCacheForTests,
  validateServerEnvironment,
} from "@/lib/env/server-env";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  TEMPORAL_ADDRESS: process.env.TEMPORAL_ADDRESS,
  TEMPORAL_NAMESPACE: process.env.TEMPORAL_NAMESPACE,
  TEMPORAL_API_KEY: process.env.TEMPORAL_API_KEY,
  TEMPORAL_CLIENT_CERT: process.env.TEMPORAL_CLIENT_CERT,
  TEMPORAL_CLIENT_KEY: process.env.TEMPORAL_CLIENT_KEY,
};

function setBaseValidEnv() {
  process.env.NODE_ENV = "production";
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/byte";
  process.env.CLERK_SECRET_KEY = "sk_test_123";
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
  process.env.TEMPORAL_ADDRESS = "localhost:7233";
  process.env.TEMPORAL_NAMESPACE = "default";
  delete process.env.TEMPORAL_API_KEY;
  delete process.env.TEMPORAL_CLIENT_CERT;
  delete process.env.TEMPORAL_CLIENT_KEY;
}

describe("lib/env/server-env", () => {
  beforeEach(() => {
    resetServerEnvironmentValidationCacheForTests();
    setBaseValidEnv();
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
    process.env.DATABASE_URL = ORIGINAL_ENV.DATABASE_URL;
    process.env.CLERK_SECRET_KEY = ORIGINAL_ENV.CLERK_SECRET_KEY;
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
      ORIGINAL_ENV.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    process.env.TEMPORAL_ADDRESS = ORIGINAL_ENV.TEMPORAL_ADDRESS;
    process.env.TEMPORAL_NAMESPACE = ORIGINAL_ENV.TEMPORAL_NAMESPACE;
    process.env.TEMPORAL_API_KEY = ORIGINAL_ENV.TEMPORAL_API_KEY;
    process.env.TEMPORAL_CLIENT_CERT = ORIGINAL_ENV.TEMPORAL_CLIENT_CERT;
    process.env.TEMPORAL_CLIENT_KEY = ORIGINAL_ENV.TEMPORAL_CLIENT_KEY;
    resetServerEnvironmentValidationCacheForTests();
  });

  it("passes for valid local development/server env", () => {
    expect(validateServerEnvironment()).toEqual({ ok: true, errors: [] });
  });

  it("throws when required server env vars are missing", () => {
    delete process.env.DATABASE_URL;

    expect(() => validateServerEnvironment()).toThrowError(
      /DATABASE_URL is required/
    );
  });

  it("throws when Temporal AWS endpoint is missing API key", () => {
    process.env.TEMPORAL_ADDRESS = "us-east-1.aws.api.temporal.io:7233";

    expect(() => validateServerEnvironment()).toThrowError(
      /TEMPORAL_API_KEY is required/
    );
  });

  it("throws when Temporal mTLS endpoint is missing cert/key", () => {
    process.env.TEMPORAL_ADDRESS = "fayette.tmprl.cloud:7233";

    expect(() => validateServerEnvironment()).toThrowError(
      /TEMPORAL_CLIENT_CERT is required/
    );
  });

  it("skips validation in test mode", () => {
    process.env.NODE_ENV = "test";
    delete process.env.DATABASE_URL;
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    expect(validateServerEnvironment()).toEqual({ ok: true, errors: [] });
  });
});
