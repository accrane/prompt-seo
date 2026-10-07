import { FlashBanner } from "@/components/admin/flash-banner";

/**
 * Renders the page's single flash banner from `?flash=` (success) or
 * `?error=` query params. Pages pass the already-awaited search params.
 */
export function Flash({ flash, error }: { flash?: string; error?: string }) {
  if (error) return <FlashBanner tone="error">{error}</FlashBanner>;
  if (flash) return <FlashBanner>{flash}</FlashBanner>;
  return null;
}

/** Adds a query param before any #fragment, so the flash still reaches the page. */
function withParam(path: string, key: string, message: string): string {
  const hashAt = path.indexOf("#");
  const base = hashAt === -1 ? path : path.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : path.slice(hashAt);
  return `${base}${base.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}${hash}`;
}

export function withFlash(path: string, message: string): string {
  return withParam(path, "flash", message);
}

export function withError(path: string, message: string): string {
  return withParam(path, "error", message);
}
