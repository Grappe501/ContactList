export const logger = {
  info: (obj: unknown, msg?: string) => console.log(JSON.stringify({ level: "info", msg, ...obj })),
  warn: (obj: unknown, msg?: string) => console.warn(JSON.stringify({ level: "warn", msg, ...obj })),
  error: (obj: unknown, msg?: string) => console.error(JSON.stringify({ level: "error", msg, ...obj })),
};
