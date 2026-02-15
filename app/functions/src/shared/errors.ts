export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL"
  | "RATE_LIMIT"
  | "UPSTREAM";

export function err(code: ErrorCode, message: string, request_id: string, details?: Record<string, unknown>) {
  return { error: { code, message, request_id, details } };
}
