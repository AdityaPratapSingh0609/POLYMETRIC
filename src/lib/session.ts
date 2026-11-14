// Lightweight, standards-based Web Crypto signed-cookie session. Runs seamlessly
// in both Node.js and Next.js Edge Runtime with zero Node module warnings.

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type SessionPayload = {
  userId: string;
  username: string;
  name: string;
  role: "ADMIN" | "SUPERVISOR" | "OPERATOR";
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const base = bytesToBase64Url(encoder.encode(jsonStr));
  const key = await getHmacKey();
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(base));
  const sig = bytesToBase64Url(new Uint8Array(signatureBytes));
  return `${base}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [base, sig] = token.split(".");
  if (!base || !sig) return null;

  try {
    const key = await getHmacKey();
    const sigBytes = base64UrlToBytes(sig);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(base));
    if (!isValid) return null;

    const payloadBytes = base64UrlToBytes(base);
    return JSON.parse(decoder.decode(payloadBytes)) as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
