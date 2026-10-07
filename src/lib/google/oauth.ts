import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db, must } from "@/lib/db";
import { env } from "@/lib/env";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
/** Carries the OAuth state and return path between /connect and /callback. */
export const STATE_COOKIE = "pseo_google_state";
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

export type GoogleConnection = {
  id: string;
  created_at: string;
  email: string;
  scopes: string;
  connected_by: string | null;
};

export function googleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.CREDENTIALS_KEY);
}

export function redirectUri(origin: string): string {
  return `${origin}/api/google/callback`;
}

export function authorizationUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    // offline + consent: Google only returns a refresh token on a fresh consent.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      ...body,
    }),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) {
    throw new Error(`Google sign-in failed: ${json.error_description ?? json.error ?? res.status}`);
  }
  return json;
}

/** The email claim from Google's ID token (received directly from Google over TLS). */
function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

/** Finishes the OAuth flow and stores (or replaces) the account's refresh token. */
export async function saveConnectionFromCode(
  code: string,
  origin: string,
  operatorEmail: string,
): Promise<GoogleConnection> {
  const tokens = await tokenRequest({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(origin),
  });
  if (!tokens.refresh_token) {
    throw new Error(
      "Google didn't return a refresh token. Remove the app's access in your Google account and connect again.",
    );
  }
  if (!tokens.scope.includes("webmasters")) {
    throw new Error(
      "Search Console access wasn't granted. Connect again and tick the Search Console permission.",
    );
  }
  const email = emailFromIdToken(tokens.id_token);
  if (!email) throw new Error("Google didn't say which account was connected.");

  const [row] = must(
    await db()
      .from("pseo_google_connections")
      .upsert(
        {
          email,
          refresh_token_enc: encryptSecret(tokens.refresh_token),
          scopes: tokens.scope,
          connected_by: operatorEmail,
        },
        { onConflict: "email" },
      )
      .select("id, created_at, email, scopes, connected_by"),
    "Save Google connection",
  ) as GoogleConnection[];
  return row;
}

export async function listConnections(): Promise<GoogleConnection[]> {
  const { data, error } = await db()
    .from("pseo_google_connections")
    .select("id, created_at, email, scopes, connected_by")
    .order("created_at");
  // Migration 002 not run yet: behave as "not connected".
  if (error) return [];
  return data as GoogleConnection[];
}

// Access tokens last an hour; cache per connection within this server process.
const accessCache = new Map<string, { token: string; expires: number }>();

export async function accessToken(connectionId: string): Promise<string> {
  const cached = accessCache.get(connectionId);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const { data, error } = await db()
    .from("pseo_google_connections")
    .select("refresh_token_enc")
    .eq("id", connectionId)
    .maybeSingle();
  if (error || !data)
    throw new Error("That Google connection no longer exists. Reconnect in Settings.");

  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: decryptSecret((data as { refresh_token_enc: string }).refresh_token_enc),
  });
  accessCache.set(connectionId, {
    token: tokens.access_token,
    expires: Date.now() + tokens.expires_in * 1000,
  });
  return tokens.access_token;
}
