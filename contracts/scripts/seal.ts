// Mirror of web/src/lib/seal.ts — AES-256-GCM, bound to the creator address via AAD.
import crypto from "node:crypto";

export type SealedPayload = { body: string; imageURI?: string; link?: string };

function key(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

export function seal(secret: string, creator: string, payload: SealedPayload): `0x${string}` {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(creator.toLowerCase()));
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `0x${Buffer.concat([Buffer.from([1]), iv, ct, tag]).toString("hex")}`;
}
