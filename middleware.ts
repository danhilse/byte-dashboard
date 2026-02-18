import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

const INVITATION_QUERY_KEYS = ["__clerk_ticket", "invitation_token", "token"];

export default clerkMiddleware(async (auth, request) => {
  if (isSignUpRoute(request)) {
    const hasInvitationToken = INVITATION_QUERY_KEYS.some((key) =>
      Boolean(request.nextUrl.searchParams.get(key))
    );

    if (!hasInvitationToken) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  // Protect all routes except public ones
  if (isPublicRoute(request)) {
    return;
  }

  await auth.protect();
  const { orgId } = await auth();

  if (!orgId) {
    if (isApiRoute(request)) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL("/", request.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
