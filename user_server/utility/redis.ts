import type { RedisClientType } from "redis";
import { redisDb0, redisDb1 } from "@/component/hardcoded";

export async function usernameExists(username: string): Promise<boolean> {
  const result = await redisDb0.exists(username);

  return result === 1;
}

export async function logValue(log: string): Promise<string | null> {
  const result = await redisDb1.get(log);
  return result; // returns the value or null if the key doesn't exist
}

export async function setKey(
  client: RedisClientType,
  key: string,
  value: string,
  expirySeconds?: number, // ← Changed to number (seconds) for consistency with Redis EX
): Promise<void> {
  if (expirySeconds !== undefined) {
    console.log(`#--------------------- ${value}`); // Safe: this is the username for sessions
  }

  if (expirySeconds !== undefined && expirySeconds > 0) {
    await client.set(key, value, {
      EX: expirySeconds, // EX = expire in seconds
    });
  } else {
    await client.set(key, value);
  }
}
// but the result of the redis save is : "\"$argon2id$v=19$m=65536,t=3,p=4$3FJxwNct2xcbh7k3BcDzoQ$DuNPUxJ97TZKHT2S2O3zyGO/oelqyZk79+EemA9IRPU\"" ???
export async function getKey(username: string): Promise<string | null> {
  const password = await redisDb0.get(username);
  if (password !== null) {
    return password;
  } else {
    return null;
  }
}

// ← Minimal fix starts here
await redisDb0.connect(); // connect db0 (optional if you only use db1, but good practice)
await redisDb1.connect(); // ← this is the required line

await setKey(redisDb1, "x", "active"); // now works
// ← Minimal fix ends here
