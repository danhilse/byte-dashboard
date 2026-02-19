/** @vitest-environment node */

import { describe, expect, it } from "vitest";
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import { PUBLIC_ROUTE_PATTERNS } from "@/lib/auth/public-routes";

/**
 * Tests that the public route patterns in middleware.ts cover the expected paths.
 *
 * Uses the same pathToRegexp that Clerk's createRouteMatcher delegates to,
 * so these tests validate real matching behavior without booting the full
 * middleware stack.
 */

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => {
    const regexp = pathToRegexp(pattern);
    return regexp.test(pathname);
  });
}

describe("middleware public routes", () => {
  it.each([
    "/api/health",
    "/api/health/",
    "/api/health/temporal",
    "/api/health/temporal/",
  ])("allows %s as public", (path) => {
    expect(isPublic(path)).toBe(true);
  });

  it.each([
    "/api/health/other",
    "/api/health/temporalfoo",
  ])("does NOT allow %s as public", (path) => {
    expect(isPublic(path)).toBe(false);
  });

  it.each([
    "/api/webhooks/clerk",
    "/sign-in",
    "/sign-in/sso-callback",
    "/",
  ])("existing public route %s still works", (path) => {
    expect(isPublic(path)).toBe(true);
  });

  it.each([
    "/dashboard",
    "/api/contacts",
    "/api/tasks",
    "/admin/settings",
  ])("protected route %s is NOT public", (path) => {
    expect(isPublic(path)).toBe(false);
  });
});
