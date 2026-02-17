// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { logValue } from "@/utility/redis";
import { name, short, redisDb1 } from "./component/hardcoded";

const COOKIE_NAME = name;
const EXPIRY_SECONDS = short; // ← Same as session_short in common.ts (seconds)
const COOKIE_MAX_AGE = EXPIRY_SECONDS + 60; // 1-minute buffer to match login

// Prefixes that expect a username segment (e.g. /dashboard/john)
const PROTECTED_PREFIXES = ["/dashboard/", "/setting/"];

// Exact paths that are protected but have NO username segment
const PROTECTED_EXACT = ["/"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Auth] Incoming request: ${pathname}`);

  // ── Handle exact protected paths (e.g. "/") ─────────────────────────────────
  if (PROTECTED_EXACT.includes(pathname)) {
    console.log(
      `[Auth] Exact protected path hit: ${pathname} → redirecting to /login`,
    );
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ── Prefix-based protection ─────────────────────────────
  const matchingPrefix = PROTECTED_PREFIXES.find((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!matchingPrefix) {
    console.log(`[Auth] Not a protected route: ${pathname}`);
    return NextResponse.next();
  }

  const pathAfterPrefix = pathname.slice(matchingPrefix.length);
  const parts = pathAfterPrefix.split("/");
  const usernameInUrl = parts[0];

  if (!usernameInUrl || !/^[a-zA-Z0-9_-]{3,32}$/.test(usernameInUrl)) {
    console.log(
      `[Auth] Invalid or empty username in URL: ${usernameInUrl} for path ${pathname}`,
    );
    return NextResponse.next();
  }

  console.log(`[Auth] Protecting → ${pathname} (user: ${usernameInUrl})`);

  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionToken) {
    console.log(
      `[Auth] user: ${usernameInUrl} | session token: ${sessionToken} | ${COOKIE_NAME}`,
    );
    return redirectToLogin(request);
  }

  try {
    const storedUsername = await logValue(sessionToken);
    console.log(
      `[Auth] Retrieved stored username: ${storedUsername} for token: ${sessionToken}`,
    );

    if (storedUsername !== usernameInUrl) {
      console.log(
        `[Auth] Username mismatch - stored: ${storedUsername}, URL: ${usernameInUrl}, token: ${sessionToken}`,
      );
      return clearCookieAndRedirect(request);
    }

    // Extend Redis TTL (sliding expiration)
    await redisDb1.expire(sessionToken, EXPIRY_SECONDS);
    console.log(
      `[Auth] Session expiry extended for user: ${usernameInUrl}, token: ${sessionToken}`,
    );

    // === SLIDING EXPIRATION FOR COOKIE ===
    // Re-set the cookie with fresh maxAge so it matches Redis lifetime
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: false, // Set to true in production
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error(
      `[Auth] Redis error for token: ${sessionToken}, user: ${usernameInUrl}:`,
      err,
    );
    return clearCookieAndRedirect(request);
  }
}

// ── Helpers ─────────────────────────────────────
function redirectToLogin(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", req.url);
  return NextResponse.redirect(url);
}

function clearCookieAndRedirect(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(COOKIE_NAME);
  return res;
}

// ── Matcher ─────────────────────────────────────
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
