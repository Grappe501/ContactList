import type { ApiError } from "./api";

export function formatApiError(e: unknown): string {
  const err = e as ApiError;
  if (err?.error?.message) return `${err.error.message} (request_id=${err.error.request_id})`;
  return "Unexpected error";
}
