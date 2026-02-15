import type { Handler } from "@netlify/functions";
import { json, notFound, withRequestId } from "./shared/http";
import { logger } from "./shared/logger";
import { healthRoute } from "./routes/health";

// Minimal router stub: implement full router in later overlays.
export const handler: Handler = async (event, context) => {
  const reqId = withRequestId(event);

  try {
    const path = event.path.replace(/^.*\/api/, "/api");
    const method = event.httpMethod.toUpperCase();

    // health
    if (method === "GET" && (path === "/api/health" || path === "/health" || path.endsWith("/health"))) {
      return json(200, await healthRoute(), reqId);
    }

    return notFound(reqId);
  } catch (e) {
    logger.error({ reqId, err: String(e) }, "Unhandled error");
    return json(500, { error: { code: "INTERNAL", message: "Internal error", request_id: reqId } }, reqId);
  }
};
