import { afterAll, beforeAll, describe, it, expect } from "vitest";

describe("encrypt/decrypt roundtrip", () => {
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.BETTER_AUTH_SECRET;
    process.env.BETTER_AUTH_SECRET = "test-secret-for-encryption-only-do-not-use";
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = originalSecret;
  });

  it("encrypts and decrypts plaintext", async () => {
    const { encrypt, decrypt } = await import("@/lib/utils/encryption");
    const cipher = encrypt("hello world");
    expect(cipher).not.toContain("hello");
    expect(decrypt(cipher)).toBe("hello world");
  });

  it("produces different ciphertexts for same plaintext (random IV)", async () => {
    const { encrypt } = await import("@/lib/utils/encryption");
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
  });

  it("handles unicode / long strings", async () => {
    const { encrypt, decrypt } = await import("@/lib/utils/encryption");
    const text = "🔐 héllo wörld " + "x".repeat(5000);
    expect(decrypt(encrypt(text))).toBe(text);
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("@/lib/utils/encryption");
    const cipher = encrypt("secret");
    const parts = cipher.split(":");
    // Modifico l'ultimo byte del ciphertext: GCM auth tag deve fallire
    const tampered = parts[2]!.slice(0, -2) + "AA";
    const evil = `${parts[0]}:${parts[1]}:${tampered}`;
    expect(() => decrypt(evil)).toThrow();
  });
});
