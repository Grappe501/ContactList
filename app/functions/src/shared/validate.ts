import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ApiError } from "./errors";

const ajv = new Ajv({ allErrors: true, removeAdditional: false, strict: false });
addFormats(ajv);

// Registry: in later overlays, load generated schemas. For now, keep a small in-code registry.
const schemas: Record<string, object> = {};

export function registerSchema(name: string, schema: object) {
  schemas[name] = schema;
  ajv.removeSchema(name);
  ajv.addSchema(schema, name);
}

export function validateBody<T>(schemaName: string, body: unknown): T {
  const validate = ajv.getSchema(schemaName);
  if (!validate) throw new ApiError(500, "INTERNAL", `Schema not registered: ${schemaName}`);
  const ok = validate(body);
  if (!ok) {
    throw new ApiError(400, "VALIDATION_ERROR", "Request body validation failed", { ajv_errors: validate.errors });
  }
  return body as T;
}
