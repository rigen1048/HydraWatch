// lib/validation.ts (new modular file for validation logic)
interface UserInput {
  name: string;
  password: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUserInput(input: UserInput): ValidationResult {
  // Check if inputs are present and strings
  if (!input.name || !input.password) {
    return { isValid: false, error: "Name and password are required" };
  }

  if (typeof input.name !== "string" || typeof input.password !== "string") {
    return { isValid: false, error: "Name and password must be strings" };
  }

  // Check name: alphanumeric, min 3 chars
  if (!/^[a-zA-Z0-9]{3,}$/.test(input.name)) {
    return {
      isValid: false,
      error: "Name must be alphanumeric and at least 3 characters long",
    };
  }

  // Check password: min 6 chars
  if (input.password.length < 6) {
    return {
      isValid: false,
      error: "Password must be at least 6 characters long",
    };
  }

  return { isValid: true };
}

export function sanitizeUsername(username: string): string | null {
  if (!username || typeof username !== "string") return null;
  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return normalized.length > 0 ? normalized : null;
}
