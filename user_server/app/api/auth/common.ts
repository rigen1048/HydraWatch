// app/api/auth/common.ts
import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { validateUserInput, sanitizeUsername } from "@/component/input_proc";
import { setKey, usernameExists, getKey } from "@/utility/redis";
import {
  redisDb0,
  redisDb1,
  session_short, // ← This should be SECONDS (e.g. 1080 for ~18 min)
  FastAPI_local,
  name as cookieName, // ← Cookie name
} from "@/component/hardcoded";
import { id } from "@/utility/rnd";

type AuthMode = "signup" | "login";

export async function handleAuth(request: NextRequest, mode: AuthMode) {
  try {
    const { name, password } = await request.json();

    // === INPUT VALIDATION (same for both) ===
    const validationResult = validateUserInput({ name, password });
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 },
      );
    }

    const sanitizedUsername = sanitizeUsername(name);
    if (!sanitizedUsername) {
      return NextResponse.json(
        { error: "Invalid name: must be alphanumeric, min 3 chars" },
        { status: 400 },
      );
    }

    const isTaken = await usernameExists(sanitizedUsername);

    // === SIGNUP vs LOGIN: existence check ===
    if (mode === "signup" && isTaken) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }
    if (mode === "login" && !isTaken) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // === CONNECT TO REDIS ===
    await Promise.allSettled([redisDb0.connect(), redisDb1.connect()]);

    // === PASSWORD HANDLING ===
    if (mode === "signup") {
      const hashedPassword = await argon2.hash(password);
      await setKey(redisDb0, sanitizedUsername, hashedPassword);
    } else {
      // login
      const storedHash = await getKey(sanitizedUsername);
      if (!storedHash || !(await argon2.verify(storedHash, password))) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 },
        );
      }
    }

    // === SESSION CREATION ===
    const sessionToken = id(30);
    console.log(`[Common.ts] | [Session token] :${sessionToken}`);

    // Store username as session value
    await setKey(redisDb1, sessionToken, sanitizedUsername, session_short);

    // Notify your content server
    fetch(`${FastAPI_local}/auth/${mode}/${sanitizedUsername}`).catch(
      console.error,
    );

    // === FINAL RESPONSE: send username + set cookie ===
    const response = NextResponse.json(
      { username: sanitizedUsername },
      { status: 200 },
    );

    // Use maxAge (seconds) - reliable, relative, no stale Date issues
    // Adds 1-minute buffer so cookie outlives Redis key slightly
    const cookieMaxAge = session_short + 60;

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: false, // LocalHost / Self host
      path: "/",
      maxAge: cookieMaxAge,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error(`${mode} error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
