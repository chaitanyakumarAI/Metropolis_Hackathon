// Server-only: AES-256-GCM sealing of exclusive post content.
// The ciphertext is stored on-chain; the key never leaves the server.
// AAD binds each ciphertext to its creator so it cannot be re-published by someone else.
import crypto from "node:crypto";
import type { UnlockedContent } from "./types";

function key() {
  const secret = process.env.SEAL_SECRET;
  if (!secret || secret.length < 32) throw new Error("SEAL_SECRET is not configured");
  return crypto.createHash("sha256").update(secret).digest();
}

export function seal(creator: string, payload: UnlockedContent): `0x${string}` {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(creator.toLowerCase()));
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return `0x${Buffer.concat([Buffer.from([1]), iv, ct, cipher.getAuthTag()]).toString("hex")}`;
}

export function unseal(creator: string, sealedHex: string): UnlockedContent {
  const buf = Buffer.from(sealedHex.replace(/^0x/, ""), "hex");
  if (buf.length < 1 + 12 + 16 || buf[0] !== 1) throw new Error("Unsupported sealed payload");
  const iv = buf.subarray(1, 13);
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(13, buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAAD(Buffer.from(creator.toLowerCase()));
  decipher.setAuthTag(tag);
  const text = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  return JSON.parse(text) as UnlockedContent;
}
