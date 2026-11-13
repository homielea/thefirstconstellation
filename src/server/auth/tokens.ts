import crypto from "node:crypto";
export const newToken = () => crypto.randomBytes(32).toString("base64url"); // SEC-004: 32 bytes
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest();
