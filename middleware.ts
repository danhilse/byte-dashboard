import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  addRateLimitHeaders,
  checkRateLimit,
  getClientIp,
  isRateLimitingEnabled,
} from "@/lib/security/rate-limit";
import { PUBLIC_ROUTE_PATTERNS } from "@/lib/auth/public-routes";
import { REQUEST_ID_HEADER } from "@/lib/request-id";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher(PUBLIC_ROUTE_PATTERNS);
const isSignUpRoute = createRouteMatcher(["/sign-up(.*)"]);
const isApiRoute = createRouteMatcher(["/(api|trpc)(.*)"]);
const isWebhookRoute = createRouteMatcher(["/api/webhooks(.*)"]);

const INVITATION_QUERY_KEYS = ["__clerk_ticket", "invitation_token", "token"];
const DEFAULT_MAX_API_BODY_BYTES = 1_048_576;
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "ambient-light-sensor=()",
  "autoplay=()",
  "battery=()",
  "camera=()",
  "display-capture=()",
  "document-domain=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "picture-in-picture=()",
  "publickey-credentials-get=(self)",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

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

function resolveRequestId(request: NextRequest): string {
  const existing = request.headers.get(REQUEST_ID_HEADER)?.trim();

  if (existing) {
    return existing.slice(0, 128);
  }

  return crypto.randomUUID();
}

function buildContentSecurityPolicy(request: NextRequest): string {
  const isProduction = process.env.NODE_ENV === "production";
  const allowsHttps = request.nextUrl.protocol === "https:";
  const scriptSources = ["'self'", "'unsafe-inline'", "https:"];
  const connectSources = ["'self'", "https:", "wss:"];

  if (!isProduction) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src 'self' https:",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProduction && allowsHttps) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(request));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Origin-Agent-Cluster", "?1");
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
  requestId: string,
  rateLimitHeaders?: Record<string, string>
): NextResponse {
  if (rateLimitHeaders) {
    addRateLimitHeaders(response.headers, rateLimitHeaders);
  }

  response.headers.set(REQUEST_ID_HEADER, requestId);

  return applySecurityHeaders(response, request);
}

export default clerkMiddleware(async (auth, request) => {
  const requestId = resolveRequestId(request);
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(REQUEST_ID_HEADER, requestId);

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
        requestId,
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
          requestId,
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
        requestId,
        apiRateLimitHeaders
      );
    }
  }

  // Protect all routes except public ones
  if (isPublicRoute(request)) {
    return finalizeResponse(
      NextResponse.next({ request: { headers: forwardedHeaders } }),
      request,
      requestId,
      apiRateLimitHeaders
    );
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
        requestId,
        apiRateLimitHeaders
      );
    }

    return finalizeResponse(
      NextResponse.redirect(new URL("/", request.url)),
      request,
      requestId,
      apiRateLimitHeaders
    );
  }

  return finalizeResponse(
    NextResponse.next({ request: { headers: forwardedHeaders } }),
    request,
    requestId,
    apiRateLimitHeaders
  );
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
