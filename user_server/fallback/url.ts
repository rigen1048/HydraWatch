// lib/username.ts
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,32}$/; // adjust to your rules

export function getUsernameFromUrl(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\/?/);
  const candidate = match ? match[1] : null;

  if (!candidate || !USERNAME_REGEX.test(candidate)) {
    return null;
  }

  return candidate;
}

export function safeRedirect(
  url: string,
  options?: {
    delayMs?: number;
    newTab?: boolean;
    noHistory?: boolean;
  },
) {
  // ← THIS IS THE ONLY LINE ADDED
  if (typeof window === "undefined") return;

  const { delayMs = 100, newTab = false, noHistory = false } = options ?? {};
  const navigate = () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    const finalUrl = /^https?:\/\//i.test(cleanUrl)
      ? cleanUrl
      : `https://${cleanUrl}`;
    if (newTab) {
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } else if (noHistory) {
      window.location.replace(finalUrl);
    } else {
      window.location.href = finalUrl;
    }
  };
  if (delayMs > 0) {
    setTimeout(navigate, delayMs);
  } else {
    navigate();
  }
}

// Optional: React hook version for convenience in components
import { useCallback } from "react";

export function useSafeRedirect() {
  return useCallback(
    (url: string, options?: Parameters<typeof safeRedirect>[1]) => {
      safeRedirect(url, options);
    },
    [],
  );
}
