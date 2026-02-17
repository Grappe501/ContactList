import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { requireEnv } from "./env";

/**
 * TOKEN_ENCRYPTION_KEY must be 32+ chars. We derive a 32-byte key via SHA-256.
 * (Later overlays can switch to HKDF + key rotation)
 */
function key32(): Buffer {
  const k = requireEnv("TOKEN_ENCRYPTION_KEY");
  return createHash("sha256").update(k, "utf8").digest();
}

function b64(buf: Buffer): string {
  return buf.toString("base64");
}

function fromB64(s: string): Buffer {
  return Buffer.from(s, "base64");
}

export function encryptString(plain: string): string {
  const key = key32();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${b64(iv)}:${b64(tag)}:${b64(ct)}`;
}

export function decryptString(enc: string): string {
  const [v, ivB64, tagB64, ctB64] = enc.split(":");
  if (v !== "v1") throw new Error("Unsupported token cipher version");
  const key = key32();
  const iv = fromB64(ivB64);
  const tag = fromB64(tagB64);
  const ct = fromB64(ctB64);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
