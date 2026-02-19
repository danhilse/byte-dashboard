import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  addRateLimitHeaders,
  checkRateLimit,
  getClientIp,
  isRateLimitingEnabled,
} from "@/lib/security/rate-limit";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/logo",
  "/api/webhooks(.*)", // Webhooks need to be public but verified separately
]);
const isSignUpRoute = createRouteMatcher(["/sign-up(.*)"]);
const isApiRoute = createRouteMatcher(["/(api|trpc)(.*)"]);
const isWebhookRoute = createRouteMatcher(["/api/webhooks(.*)"]);

const INVITATION_QUERY_KEYS = ["__clerk_ticket", "invitation_token", "token"];
const DEFAULT_MAX_API_BODY_BYTES = 1_048_576;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const MAX_API_BODY_BYTES = parsePositiveInt(
  process.env.MAX_API_REQUEST_BYTES,
  DEFAULT_MAX_API_BODY_BYTES
);

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  if (
    process.env.NODE_ENV === "production" &&
    request.nextUrl.protocol === "https:"
  ) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}

function finalizeResponse(
  response: NextResponse,
  request: NextRequest,
  rateLimitHeaders?: Record<string, string>
): NextResponse {
  if (rateLimitHeaders) {
    addRateLimitHeaders(response.headers, rateLimitHeaders);
  }

  return applySecurityHeaders(response, request);
}

export default clerkMiddleware(async (auth, request) => {
  let apiRateLimitHeaders: Record<string, string> | undefined;

  if (isApiRoute(request) && isRateLimitingEnabled()) {
    const rateLimitPolicy = isWebhookRoute(request) ? "api.webhook" : "api.ip";
    const clientIp = getClientIp(request);
    const result = checkRateLimit({
      policy: rateLimitPolicy,
      identifier: `ip:${clientIp}`,
    });

    apiRateLimitHeaders = result.headers;

    if (!result.allowed) {
      return finalizeResponse(
        NextResponse.json({ error: "Too many requests" }, { status: 429 }),
        request,
        apiRateLimitHeaders
      );
    }
  }

  if (isApiRoute(request)) {
    const contentLengthHeader = request.headers.get("content-length");

    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);

      if (Number.isFinite(contentLength) && contentLength > MAX_API_BODY_BYTES) {
        return finalizeResponse(
          NextResponse.json(
            {
              error: "Request payload too large",
              maxBytes: MAX_API_BODY_BYTES,
            },
            { status: 413 }
          ),
          request,
          apiRateLimitHeaders
        );
      }
    }
  }

  if (isSignUpRoute(request)) {
    const hasInvitationToken = INVITATION_QUERY_KEYS.some((key) =>
      Boolean(request.nextUrl.searchParams.get(key))
    );

    if (!hasInvitationToken) {
      return finalizeResponse(
        NextResponse.redirect(new URL("/sign-in", request.url)),
        request,
        apiRateLimitHeaders
      );
    }
  }

  // Protect all routes except public ones
  if (isPublicRoute(request)) {
    return finalizeResponse(NextResponse.next(), request, apiRateLimitHeaders);
  }

  await auth.protect();
  const { orgId } = await auth();

  if (!orgId) {
    if (isApiRoute(request)) {
      return finalizeResponse(
        NextResponse.json(
          { error: "Organization context required" },
          { status: 403 }
        ),
        request,
        apiRateLimitHeaders
      );
    }

    return finalizeResponse(
      NextResponse.redirect(new URL("/", request.url)),
      request,
      apiRateLimitHeaders
    );
  }

  return finalizeResponse(NextResponse.next(), request, apiRateLimitHeaders);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
