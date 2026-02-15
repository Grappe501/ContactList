const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

export const logger = {
  info: (obj: unknown, msg?: string) =>
    console.log(JSON.stringify({ level: "info", msg, ...asObj(obj) })),

  warn: (obj: unknown, msg?: string) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...asObj(obj) })),

  error: (obj: unknown, msg?: string) =>
    console.error(JSON.stringify({ level: "error", msg, ...asObj(obj) })),
};
