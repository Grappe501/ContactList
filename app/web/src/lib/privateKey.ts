const KEY_NAME = "contactlist_private_link_key";

export function getPrivateKey(): string | null {
  try { return localStorage.getItem(KEY_NAME); } catch { return null; }
}

export function setPrivateKey(k: string) {
  try { localStorage.setItem(KEY_NAME, k); } catch {}
}

export function clearPrivateKey() {
  try { localStorage.removeItem(KEY_NAME); } catch {}
}
