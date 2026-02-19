// Central source for unauthenticated route patterns used by middleware and tests.
export const PUBLIC_ROUTE_PATTERNS = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/logo",
  "/api/webhooks(.*)",
  "/api/health",
  "/api/health/temporal",
];
