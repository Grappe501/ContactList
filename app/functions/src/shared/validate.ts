// Stub for AJV validation wiring. Implement in later overlays.
export function validateBody<T>(_schemaName: string, body: unknown): T {
  return body as T;
}
