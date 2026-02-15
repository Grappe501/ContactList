export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL"
  | "RATE_LIMIT"
  | "UPSTREAM";

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    request_id: string;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown>;
  status: number;

  constructor(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function err(code: ErrorCode, message: string, request_id: string, details?: Record<string, unknown>): ErrorResponse {
  return { error: { code, message, request_id, details } };
}
