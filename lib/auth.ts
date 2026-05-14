const AUTH_COOKIE = "nova_session";

export function getAuthCookieName() {
  return AUTH_COOKIE;
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.NOVA_ACCESS_PASSWORD || "nova-dev-secret";
}

export function isAuthConfigured() {
  return Boolean(process.env.NOVA_ACCESS_PASSWORD);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

async function sign(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToHex(new Uint8Array(signature));
}

export async function createSessionToken() {
  const payload = `nova:${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token?: string) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await sign(payload);
  return constantTimeEqual(signature, expected);
}

export function verifyPassword(password: string) {
  const expected = process.env.NOVA_ACCESS_PASSWORD;
  if (!expected) return false;

  return constantTimeEqual(password, expected);
}
