import type { Handler } from "@netlify/functions";
import { logger } from "./shared/logger";
import { getIncomingRequestId, newRequestId, json, error } from "./shared/http";
import { buildContext } from "./shared/request";
import { corsHeaders } from "./shared/cors";
import { enforceRateLimit } from "./shared/rateLimit";
import { ApiError, err } from "./shared/errors";
import { SimpleRouter, extractApiPath } from "./shared/router";
import { registerRoutes } from "./routes/_register";
import { registerCoreSchemas } from "./shared/schemaRegistry";

const router = new SimpleRouter();
registerCoreSchemas();
registerRoutes(router);

export const handler: Handler = async (event) => {
  const requestId = getIncomingRequestId(event) ?? newRequestId();
  const ctx = buildContext(event, requestId);
  const headers = corsHeaders(ctx);

  try {
    if (event.httpMethod.toUpperCase() === "OPTIONS") {
      return json(200, { ok: true }, requestId, headers);
    }

    enforceRateLimit(ctx);

    const apiPath = extractApiPath(event.path);
    const result = await router.dispatch(event.httpMethod, apiPath, event);

    if (!result) {
      return error(404, err("NOT_FOUND", "Not found", requestId), requestId, headers);
    }

    return json(result.status, result.body, requestId, headers);
  } catch (e) {
    if (e instanceof ApiError) {
      logger.warn({ requestId, code: e.code, status: e.status, path: ctx.path }, "API error");
      return error(e.status, err(e.code, e.message, requestId, e.details), requestId, {
        ...headers,
        ...(e.status === 429 ? { "Retry-After": String(e.details?.retry_after_seconds ?? 10) } : {}),
      });
    }

    logger.error({ requestId, err: String(e), path: ctx.path }, "Unhandled error");
    return error(500, err("INTERNAL", "Internal error", requestId), requestId, headers);
  } finally {
    const dur = Date.now() - ctx.startMs;
    logger.info({ requestId, method: ctx.method, path: ctx.path, duration_ms: dur }, "request_complete");
  }
};
