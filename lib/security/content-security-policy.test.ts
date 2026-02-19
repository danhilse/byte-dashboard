/** @vitest-environment node */

import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  resolveClerkFrontendApiOrigins,
} from "@/lib/security/content-security-policy";

describe("content security policy", () => {
  it("includes Clerk-required sources for scripts, frames, and images", () => {
    const csp = buildContentSecurityPolicy({
      protocol: "https:",
      isProduction: true,
      env: {},
    });

    expect(csp).toContain("script-src");
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).toContain("frame-src");
    expect(csp).toContain("img-src");
    expect(csp).toContain("https://img.clerk.com");
  });

  it("keeps frame-ancestors none by default", () => {
    const csp = buildContentSecurityPolicy({
      protocol: "https:",
      isProduction: true,
      env: {},
    });

    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("adds Clerk frontend API origin when configured", () => {
    const env = {
      NEXT_PUBLIC_CLERK_FRONTEND_API_URL: "https://brisk-tiger-42.clerk.accounts.dev",
    } as NodeJS.ProcessEnv;

    const origins = resolveClerkFrontendApiOrigins(env);
    expect(origins).toEqual(["https://brisk-tiger-42.clerk.accounts.dev"]);

    const csp = buildContentSecurityPolicy({
      protocol: "https:",
      isProduction: true,
      env,
    });

    expect(csp).toContain("connect-src");
    expect(csp).toContain("https://brisk-tiger-42.clerk.accounts.dev");
  });

  it("only adds upgrade-insecure-requests for production HTTPS", () => {
    const productionCsp = buildContentSecurityPolicy({
      protocol: "https:",
      isProduction: true,
      env: {},
    });
    expect(productionCsp).toContain("upgrade-insecure-requests");

    const devCsp = buildContentSecurityPolicy({
      protocol: "http:",
      isProduction: false,
      env: {},
    });
    expect(devCsp).not.toContain("upgrade-insecure-requests");
  });
});
