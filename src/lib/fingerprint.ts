import { createHash } from "crypto";

/**
 * Generate a deterministic fingerprint for an issue
 */
export function generateFingerprint(
  errorType: string | null,
  errorMessage: string | null,
  runtime?: string | null
): string {
  const normalized = {
    type: normalizeErrorType(errorType),
    message: normalizeErrorMessage(errorMessage),
    runtimeMajor: runtime ? runtime.split("@")[0] + "@" + (runtime.split("@")[1]?.split(".")[0] || "") : "",
  };

  const input = [normalized.type, normalized.message, normalized.runtimeMajor].join("|");
  return createHash("sha256").update(input).digest("hex").substring(0, 64);
}

function normalizeErrorType(type: string | null): string {
  if (!type) return "";
  return type
    .replace(/Error$/, "")
    .replace(/Exception$/, "")
    .toLowerCase()
    .trim();
}

function normalizeErrorMessage(message: string | null): string {
  if (!message) return "";
  return message
    .replace(/\/[\w\-\/.]+/g, "<path>")
    .replace(/:\d{2,5}/g, ":<port>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, "<ip>")
    .replace(/\b\d{6,}\b/g, "<id>")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/**
 * Generate API key
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const secret = Array.from(randomBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const prefix = "agdb_" + secret.substring(0, 8);
  const key = prefix + secret.substring(8);
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
