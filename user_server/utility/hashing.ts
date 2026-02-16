import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required and must be a string" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
      hashLength: 32,
    });

    return NextResponse.json({ hash });
  } catch (error) {
    console.error("Error hashing password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
