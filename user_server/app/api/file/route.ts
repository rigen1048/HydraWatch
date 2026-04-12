// app/api/file/route.ts
import { NextRequest } from "next/server";
import { FastAPI_local } from "@/component/hardcoded";

export async function POST(request: NextRequest) {
  try {
    console.log("[Upload API] POST request received");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const username = formData.get("username") as string | null;

    if (!file) {
      console.warn("[Upload API] Missing file in request");
      return new Response("Missing file", { status: 400 });
    }

    if (!username || username.trim() === "") {
      console.warn("[Upload API] Missing or invalid username");
      return new Response("Missing or invalid username", { status: 400 });
    }

    console.log(
      `[Upload API] File received - name: ${file.name}, size: ${file.size} bytes, type: ${file.type}, username: ${username}`,
    );

    // Forward only the file to FastAPI
    const fastapiFormData = new FormData();
    fastapiFormData.append("file", file);

    const service = "import"; // ← hardcoded service

    const fastapiBase = FastAPI_local;
    const fastapiUrl = `${fastapiBase}/csv/${service}/${encodeURIComponent(username)}`;

    console.log(`[Upload API] Forwarding file to FastAPI: ${fastapiUrl}`);

    const response = await fetch(fastapiUrl, {
      method: "POST",
      body: fastapiFormData,
    });

    console.log(
      `[Upload API] FastAPI responded with status: ${response.status}`,
    );

    if (response.ok) {
      const result = await response.json().catch(() => ({}));
      console.log("[Upload API] Upload successful");
      return new Response(
        JSON.stringify({ message: "Upload successful", ...result }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      const errorText = await response.text();
      console.warn(
        `[Upload API] FastAPI error (${response.status}): ${errorText || "No error body"}`,
      );
      return new Response(errorText || "Upload failed on FastAPI", {
        status: response.status,
      });
    }
  } catch (error) {
    console.error("[Upload API] Internal server error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
