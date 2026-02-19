const CLERK_FRONTEND_API_ENV_KEYS = [
  "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
  "CLERK_FRONTEND_API_URL",
  "NEXT_PUBLIC_CLERK_PROXY_URL",
  "CLERK_PROXY_URL",
] as const;

const CLERK_REQUIRED_SCRIPT_SOURCES = ["https://challenges.cloudflare.com"];
const CLERK_REQUIRED_FRAME_SOURCES = ["https://challenges.cloudflare.com"];
const CLERK_REQUIRED_IMAGE_SOURCES = ["https://img.clerk.com"];

function uniqueSources(values: string[]): string[] {
  return [...new Set(values)];
}

function toOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function resolveClerkFrontendApiOrigins(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const origins = CLERK_FRONTEND_API_ENV_KEYS.map((key) => toOrigin(env[key])).filter(
    (origin): origin is string => Boolean(origin)
  );

  return uniqueSources(origins);
}

interface BuildContentSecurityPolicyOptions {
  protocol: string;
  isProduction?: boolean;
  env?: NodeJS.ProcessEnv;
  frameAncestors?: string;
}

export function buildContentSecurityPolicy(
  options: BuildContentSecurityPolicyOptions
): string {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";
  const clerkFrontendApiOrigins = resolveClerkFrontendApiOrigins(options.env);

  const scriptSources = uniqueSources([
    "'self'",
    "'unsafe-inline'",
    "https:",
    ...CLERK_REQUIRED_SCRIPT_SOURCES,
    ...clerkFrontendApiOrigins,
  ]);
  const connectSources = uniqueSources([
    "'self'",
    "https:",
    "wss:",
    ...clerkFrontendApiOrigins,
  ]);
  const frameSources = uniqueSources([
    "'self'",
    "https:",
    ...CLERK_REQUIRED_FRAME_SOURCES,
  ]);

  if (!isProduction) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("ws:");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${options.frameAncestors ?? "'none'"}`,
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https:",
    `img-src ${uniqueSources(["'self'", "data:", "blob:", "https:", ...CLERK_REQUIRED_IMAGE_SOURCES]).join(" ")}`,
    "font-src 'self' data: https:",
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${frameSources.join(" ")}`,
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProduction && options.protocol === "https:") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
