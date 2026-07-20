import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ENCRYPTION_VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_BYTES,
  });
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(value: string) {
  const [version, ivValue, authTagValue, encryptedValue] = value.split(".");

  if (
    version !== ENCRYPTION_VERSION ||
    !ivValue ||
    !authTagValue ||
    !encryptedValue
  ) {
    throw new Error("Encrypted secret has an unsupported format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
    { authTagLength: AUTH_TAG_BYTES }
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getEncryptionKey() {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;

  if (!rawKey || rawKey.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be at least 32 characters.");
  }

  return createHash("sha256").update(rawKey).digest();
}
