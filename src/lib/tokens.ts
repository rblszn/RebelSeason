import crypto from "crypto";

/** SHA-256 hex of a value. Cookie tokens are stored hashed, so the database never holds a usable token. */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** A long random token for cookies (32 bytes, URL-safe). */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
