import { NextResponse } from "next/server";
import { getTemporalClient } from "@/lib/temporal/client";
import type {
  HelloWorkflowInput,
  HelloWorkflowResult,
} from "@/lib/workflows/hello-world";

/**
 * API Route to start a Hello World workflow
 *
 * Example request:
 * POST /api/workflows/hello
 * Body: { "name": "John", "email": "john@example.com" }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HelloWorkflowInput;

    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Get Temporal client
    const client = await getTemporalClient();

    // Start the workflow
    const handle = await client.workflow.start("helloWorldWorkflow", {
      taskQueue: "byte-dashboard",
      args: [body],
      workflowId: `hello-${body.name}-${Date.now()}`,
    });

    console.log(`Started workflow ${handle.workflowId}`);

    // Wait for result (for this demo - in production, you might not wait)
    const result = (await handle.result()) as HelloWorkflowResult;

    return NextResponse.json({
      temporalWorkflowId: handle.workflowId,
      result,
    });
  } catch (error) {
    console.error("Error starting workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to start workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * API Route to get workflow status
 *
 * Example request:
 * GET /api/workflows/hello?temporalWorkflowId=hello-john-123456789
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const temporalWorkflowId = searchParams.get("temporalWorkflowId");

    if (!temporalWorkflowId) {
      return NextResponse.json(
        { error: "temporalWorkflowId is required" },
        { status: 400 }
      );
    }

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(temporalWorkflowId);

    // Check if workflow is running
    const description = await handle.describe();

    return NextResponse.json({
      temporalWorkflowId,
      status: description.status.name,
      startTime: description.startTime,
    });
  } catch (error) {
    console.error("Error getting workflow status:", error);
    return NextResponse.json(
      {
        error: "Failed to get workflow status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
