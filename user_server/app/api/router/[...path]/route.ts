// app/api/router/[[...path]]/route.ts
// This catches ALL requests to /api/router/* and forwards them to FastAPI

import { NextRequest, NextResponse } from "next/server";
import { FastAPI_local } from "@/component/hardcoded";

const FASTAPI_BASE = FastAPI_local;

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

// You can add PUT, DELETE, etc. if needed later

async function proxyRequest(request: NextRequest) {
  const url = new URL(request.url);

  // Capture everything after /api/router/
  // e.g. /api/router/dashboard/emma/movies → /dashboard/emma/movies
  const forwardPath = url.pathname.replace(/^\/api\/router/, "") || "/";

  const targetUrl = `${FASTAPI_BASE}${forwardPath}`;

  // Extract search params if any (e.g. ?cache_bust=123)
  const searchParams = url.search;

  const fullTargetUrl = `${targetUrl}${searchParams}`;

  console.log("=== Router Proxy ===");
  console.log("Incoming:", request.method, request.url);
  console.log("Forwarding to FastAPI:", fullTargetUrl);
  console.log("=================\n");

  try {
    const response = await fetch(fullTargetUrl, {
      method: request.method,
      headers: {
        // Forward relevant headers (add more if needed, e.g. Authorization)
        Accept: "application/json",
        "Content-Type":
          request.headers.get("Content-Type") || "application/json",
        // You can forward cookies/auth if needed
      },
      body: request.body ? await request.text() : null, // Forward body for POST/PUT
      cache: "no-store", // Prevent Vercel/Netlify caching
    });

    // Stream or pass through the response cleanly
    if (!response.ok) {
      console.error(
        "FastAPI error:",
        response.status,
        await response.text().catch(() => ""),
      );
    }

    // Let Next.js handle content-type and streaming properly
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Proxy fetch failed:", error);
  }
}
