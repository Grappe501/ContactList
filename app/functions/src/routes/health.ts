export async function healthRoute() {
  return { ok: true, version: "0.0.0", time_utc: new Date().toISOString() };
}
