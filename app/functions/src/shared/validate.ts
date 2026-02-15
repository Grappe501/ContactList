import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ApiError } from "./errors";

const ajv = new Ajv({ allErrors: true, removeAdditional: false, strict: false });
addFormats(ajv);

const validators = new Map<string, (data: unknown) => boolean>();

export function registerSchema(name: string, schema: object) {
  const validate = ajv.compile(schema);
  validators.set(name, validate as (data: unknown) => boolean);
}

export function validateBody<T>(schemaName: string, data: unknown): T {
  const validate = validators.get(schemaName);
  if (!validate) {
    // Keep ErrorCode compatible with your project's union type.
    throw new ApiError(500, "INTERNAL", `Schema not registered: ${schemaName}`);
  }

  const ok = validate(data);
  if (!ok) {
    const details = (validate as any).errors ?? [];
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid request body", details);
  }

  return data as T;
}
