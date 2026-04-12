// app/api/auth/signup/route.ts
import { NextRequest } from "next/server";
import { handleAuth } from "@/app/api/auth/common";

export async function POST(request: NextRequest) {
  console.log(" # -----------Signup route called");
  return handleAuth(request, "signup");
}
