export interface ServerEnvValidationResult {
  ok: boolean;
  errors: string[];
}

let cachedValidation: ServerEnvValidationResult | null = null;

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function validateRequiredEnv(errors: string[]): void {
  const requiredServerEnvVars = [
    "DATABASE_URL",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  ] as const;

  for (const envVar of requiredServerEnvVars) {
    if (isBlank(process.env[envVar])) {
      errors.push(`${envVar} is required`);
    }
  }
}

function validateTemporalEnv(errors: string[]): void {
  const address = process.env.TEMPORAL_ADDRESS?.trim() || "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE?.trim() || "default";

  if (!namespace) {
    errors.push("TEMPORAL_NAMESPACE cannot be empty");
  }

  if (address.includes("tmprl.cloud")) {
    if (isBlank(process.env.TEMPORAL_CLIENT_CERT)) {
      errors.push(
        "TEMPORAL_CLIENT_CERT is required when TEMPORAL_ADDRESS uses *.tmprl.cloud"
      );
    }

    if (isBlank(process.env.TEMPORAL_CLIENT_KEY)) {
      errors.push(
        "TEMPORAL_CLIENT_KEY is required when TEMPORAL_ADDRESS uses *.tmprl.cloud"
      );
    }

    return;
  }

  if (address.includes("aws.api.temporal.io")) {
    if (isBlank(process.env.TEMPORAL_API_KEY)) {
      errors.push(
        "TEMPORAL_API_KEY is required when TEMPORAL_ADDRESS uses *.aws.api.temporal.io"
      );
    }

    return;
  }

  const isLocalAddress =
    address === "localhost:7233" || address.startsWith("127.0.0.1");

  if (!isLocalAddress) {
    errors.push(
      "TEMPORAL_ADDRESS must be localhost:7233, 127.0.0.1:7233, *.tmprl.cloud, or *.aws.api.temporal.io"
    );
  }
}

function buildErrorMessage(errors: string[]): string {
  const detailList = errors.map((error) => `- ${error}`).join("\n");
  return `Invalid server environment configuration:\n${detailList}`;
}

export function validateServerEnvironment(): ServerEnvValidationResult {
  if (process.env.NODE_ENV === "test") {
    return { ok: true, errors: [] };
  }

  if (cachedValidation) {
    if (!cachedValidation.ok) {
      throw new Error(buildErrorMessage(cachedValidation.errors));
    }

    return cachedValidation;
  }

  const errors: string[] = [];

  validateRequiredEnv(errors);
  validateTemporalEnv(errors);

  const result: ServerEnvValidationResult = {
    ok: errors.length === 0,
    errors,
  };

  cachedValidation = result;

  if (!result.ok) {
    throw new Error(buildErrorMessage(result.errors));
  }

  return result;
}

export function resetServerEnvironmentValidationCacheForTests(): void {
  cachedValidation = null;
}
