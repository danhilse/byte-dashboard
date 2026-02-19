import { REQUEST_ID_HEADER } from "@/lib/request-id";
import { runWithLogContext } from "@/lib/logging/context";
import { getOrCreateRequestId, getServiceLogger } from "@/lib/logging/logger";

type ApiRouteHandler = (...args: never[]) => Promise<Response> | Response;

function setRequestIdHeader(response: Response, requestId: string): Response {
  try {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    headers.set(REQUEST_ID_HEADER, requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

export function withApiRequestLogging<THandler extends ApiRouteHandler>(
  handler: THandler
): THandler {
  return (async (...args: unknown[]): Promise<Response> => {
    const startedAt = Date.now();
    const maybeRequest = args[0];
    const request = maybeRequest instanceof Request ? maybeRequest : undefined;

    const requestId = getOrCreateRequestId(request?.headers);
    const method = request?.method ?? "UNKNOWN";
    const route = request ? new URL(request.url).pathname : "unknown";

    const logger = getServiceLogger("api", {
      requestId,
      method,
      route,
      handler: handler.name || "anonymous",
    });

    logger.info({ event: "api.request.start" }, "API request started");

    try {
      const response = await runWithLogContext(
        {
          requestId,
          method,
          route,
          service: "api",
        },
        () => handler(...(args as Parameters<THandler>))
      );

      const durationMs = Date.now() - startedAt;
      logger.info(
        {
          event: "api.request.complete",
          statusCode: response.status,
          durationMs,
        },
        "API request completed"
      );

      return setRequestIdHeader(response, requestId);
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      logger.error(
        {
          event: "api.request.error",
          durationMs,
          err: error instanceof Error ? error : undefined,
          error: error instanceof Error ? undefined : String(error),
        },
        "API request failed"
      );
      throw error;
    }
  }) as unknown as THandler;
}
