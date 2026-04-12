// app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import { handleAuth } from "@/app/api/auth/common";

export async function POST(request: NextRequest) {
  return handleAuth(request, "login");
}
