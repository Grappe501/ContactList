import type { Handler } from "@netlify/functions";
import { handler as mainHandler } from "./index";
import { json, withRequestId } from "./shared/http";
import { logger } from "./shared/logger";

/**
 * Netlify function entrypoint for `/.netlify/functions/api/*`
 *
 * Delegates to the main handler in `src/index.ts`, but enforces that a
 * HandlerResponse is always returned (TypeScript strict compatibility).
 */
export const handler: Handler = async (event, context) => {
  const reqId = withRequestId(event);

  try {
    const res = await Promise.resolve(mainHandler(event, context));

    // If mainHandler ever returns void (older Netlify callback style), fail safely.
    if (!res) {
      logger.error({ reqId }, "Main handler returned no response");
      return json(500, { error: { code: "INTERNAL", message: "Internal error", request_id: reqId } }, reqId);
    }

    return res;
  } catch (e) {
    logger.error({ reqId, err: String(e) }, "Unhandled error (api wrapper)");
    return json(500, { error: { code: "INTERNAL", message: "Internal error", request_id: reqId } }, reqId);
  }
};
