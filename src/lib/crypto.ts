import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

const ALGO = "aes-256-gcm";
const VERSION = "v1";

function key(): Buffer {
  if (!env.CREDENTIALS_KEY) {
    throw new Error(
      "CREDENTIALS_KEY is not set. Generate one with `openssl rand -base64 32` (see .env.example).",
    );
  }
  const buf = Buffer.from(env.CREDENTIALS_KEY, "base64");
  if (buf.length !== 32) {
    throw new Error("CREDENTIALS_KEY must decode to exactly 32 bytes (base64).");
  }
  return buf;
}

/** Encrypts a secret for storage. Output: `v1.<iv>.<tag>.<ciphertext>` (base64url). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(".");
}

export function decryptSecret(stored: string): string {
  const [version, ivB64, tagB64, dataB64] = stored.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Stored credential is in an unrecognized format.");
  }
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hasCredentialsKey(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}
