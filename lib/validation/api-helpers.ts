import { NextResponse } from "next/server"
import type { ValidationError } from "./rules"
import { validateBodyShape } from "./rules"

/** Safely parse JSON body. Returns { body } on success or { error: NextResponse } on failure. */
export async function parseJsonBody(
  req: Request
): Promise<{ body: Record<string, unknown> } | { error: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      ),
    }
  }

  const shapeErrors = validateBodyShape(raw)
  if (shapeErrors) {
    return {
      error: NextResponse.json(
        { error: shapeErrors[0].message },
        { status: 400 }
      ),
    }
  }

  return { body: raw as Record<string, unknown> }
}

/** Format validation errors into a 400 NextResponse. */
export function validationErrorResponse(errors: ValidationError[]): NextResponse {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: errors.map((e) => ({ field: e.field, message: e.message })),
    },
    { status: 400 }
  )
}
