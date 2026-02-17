export type ApiError = {
  code: string;
  message: string;
  request_id?: string;
  details?: Record<string, unknown>;
};

export type ErrorEnvelope = { error: ApiError };

export function isErrorEnvelope(x: any): x is ErrorEnvelope {
  return Boolean(
    x &&
      typeof x === "object" &&
      (x as any).error &&
      typeof (x as any).error.code === "string" &&
      typeof (x as any).error.message === "string"
  );
}

export function getErrorMessage(e: unknown): string {
  if (isErrorEnvelope(e)) return e.error.message;
  if (e && typeof e === "object" && "message" in (e as any) && typeof (e as any).message === "string") {
    return (e as any).message;
  }
  if (typeof e === "string") return e;
  return "Unknown error";
}

/**
 * UI-friendly formatter used across components.
 * Handles:
 * - ErrorEnvelope objects
 * - Error(message=JSON-stringified ErrorEnvelope)
 * - plain strings
 */
export function formatApiError(e: unknown): string {
  // If API layer threw Error(text) where text is JSON, try to parse it
  const msg = getErrorMessage(e);

  try {
    const parsed = JSON.parse(msg);
    if (isErrorEnvelope(parsed)) {
      const rid = parsed.error.request_id ? ` (req ${parsed.error.request_id})` : "";
      return `${parsed.error.message}${rid}`;
    }
  } catch {
    // msg wasn't JSON; ignore
  }

  // If caller passed the envelope directly
  if (isErrorEnvelope(e)) {
    const rid = e.error.request_id ? ` (req ${e.error.request_id})` : "";
    return `${e.error.message}${rid}`;
  }

  return msg;
}
