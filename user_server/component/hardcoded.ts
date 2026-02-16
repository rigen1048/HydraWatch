// app/component/hardcoded.ts
import { createClient } from "redis";
import type { RedisClientType } from "redis";

export const redisDb0: RedisClientType = createClient({
  url: "redis://localhost:6379",
  database: 0,
});

export const redisDb1: RedisClientType = createClient({
  url: "redis://localhost:6379",
  database: 1,
});

export const SESSION_DURATION_SECONDS = 18 * 60; // 1080 seconds (~18 min) - for Redis TTL
export const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000; // 1,080,000 ms

export const short = SESSION_DURATION_SECONDS; // ← Backward compatible alias (seconds)
export const session_short = SESSION_DURATION_SECONDS; // ← Backward compatible alias (seconds)

export const COOKIE_MAX_AGE_SECONDS = SESSION_DURATION_SECONDS + 60;
export const name = "HydraWatch";

export const FastAPI_local = "http://127.0.0.1:8000";
