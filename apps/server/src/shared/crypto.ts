import crypto from "node:crypto";

const DEFAULT_KEY = "media-news-automation-default-key-please-change";

function getKey(): Buffer {
  const raw = process.env.APP_SECRET || DEFAULT_KEY;
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptObject(value: Record<string, unknown>): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptObject<T>(value: string): T {
  const [ivHex, encryptedHex] = value.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as T;
}
