/**
 * AES-256-GCM encryption per token at-rest.
 *
 * Master key = derived da `BETTER_AUTH_SECRET` via scrypt con un salt costante.
 * Per ogni cifratura usiamo un IV random a 12 byte (raccomandato per GCM).
 *
 * Storage format (string singola, separatori `:`):
 *   `${iv_base64}:${authTag_base64}:${ciphertext_base64}`
 *
 * Rotazione chiave: in caso di compromise di BETTER_AUTH_SECRET, basta
 * cambiarlo + ri-cifrare tutti i token (non gestiamo questa migration qui).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const SALT = "todoist-tracker:calendar-token-v1";

let _key: Buffer | null = null;

function getKey(): Buffer {
  if (_key) return _key;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET non impostata — necessaria per cifrare i token calendario.",
    );
  }
  _key = scryptSync(secret, SALT, KEY_BYTES);
  return _key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Encrypted payload malformato");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64!, "base64");
  const tag = Buffer.from(tagB64!, "base64");
  const ct = Buffer.from(ctB64!, "base64");
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ct), decipher.final()]);
  return out.toString("utf8");
}
