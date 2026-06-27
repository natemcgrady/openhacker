// Web-Crypto only so this module works in both the Edge middleware and Node.
export const SESSION_COOKIE = "oh_session";

export function adminPassword(): string | null {
  return process.env.OPENHACKER_ADMIN_PASSWORD || null;
}

export function authEnabled(): boolean {
  return Boolean(adminPassword());
}

export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`openhacker:${password}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedToken(): Promise<string | null> {
  const password = adminPassword();
  return password ? sessionToken(password) : null;
}
