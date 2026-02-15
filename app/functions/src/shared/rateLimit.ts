import type { RequestContext } from "./request";
import { ApiError } from "./errors";

type Bucket = { tokens: number; lastRefillMs: number };

const buckets = new Map<string, Bucket>();

function getLimit(ctx: RequestContext): { capacity: number; refillPerSec: number } {
  // Defaults from spec; adjust in later overlays.
  const isWrite = ["POST", "PUT", "DELETE"].includes(ctx.method);
  const isImport = ctx.path.includes("/imports/");
  const isAi = ctx.path.includes("/ai/");
  if (isImport && isWrite) return { capacity: 10, refillPerSec: 10 / 60 };
  if (isAi && isWrite) return { capacity: 30, refillPerSec: 30 / 60 };
  if (isWrite) return { capacity: 60, refillPerSec: 60 / 60 };
  return { capacity: 120, refillPerSec: 120 / 60 };
}

export function enforceRateLimit(ctx: RequestContext) {
  const key = `${ctx.ipHash}`;
  const { capacity, refillPerSec } = getLimit(ctx);
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, lastRefillMs: now };

  // Refill
  const elapsedSec = Math.max(0, (now - b.lastRefillMs) / 1000);
  b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec);
  b.lastRefillMs = now;

  if (b.tokens < 1) {
    buckets.set(key, b);
    // Retry-After is best-effort (seconds)
    throw new ApiError(429, "RATE_LIMIT", "Too many requests", { retry_after_seconds: 10 });
  }

  b.tokens -= 1;
  buckets.set(key, b);
}
