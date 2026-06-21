import { createHash, randomUUID } from "crypto";

export function hashWithSecret(value: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

export function newTokenId(): string {
  return randomUUID();
}
