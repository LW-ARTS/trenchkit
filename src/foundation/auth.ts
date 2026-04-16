import { randomUUID } from "node:crypto";
import * as ed25519 from "@noble/ed25519";
import { loadPrivateKeyBuffer } from "./config.js";

let cachedKeyBytes: Uint8Array | null = null;

function getPrivateKeyBytes(): Uint8Array {
  if (cachedKeyBytes) return cachedKeyBytes;

  const keyBuffer = loadPrivateKeyBuffer();
  if (!keyBuffer) {
    throw new Error('Trade mode requires GMGN_PRIVATE_KEY. Run "trenchkit init" to configure.');
  }

  // Extract raw key from PEM: the Ed25519 private key is the last 32 bytes of the DER
  const pem = keyBuffer.toString("utf-8");
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const der = Buffer.from(base64, "base64");
  const raw = der.subarray(der.length - 32);

  cachedKeyBytes = new Uint8Array(raw);

  // Zero intermediate buffers (key lifecycle protection)
  keyBuffer.fill(0);

  // Remove from process.env if dotenv loaded it
  if (process.env.GMGN_PRIVATE_KEY) {
    delete process.env.GMGN_PRIVATE_KEY;
  }

  return cachedKeyBytes;
}

export function clearKeyMaterial(): void {
  if (cachedKeyBytes) {
    cachedKeyBytes.fill(0);
    cachedKeyBytes = null;
  }
}

export async function signRequest(
  path: string,
  querystring: string,
  body: string,
  timestamp: number,
): Promise<string> {
  const keyBytes = getPrivateKeyBytes();
  const message = `${path}:${querystring}:${body}:${timestamp}`;
  const messageBytes = new TextEncoder().encode(message);

  const signature = await ed25519.signAsync(messageBytes, keyBytes);
  return Buffer.from(signature).toString("base64");
}

export function generateAuthParams(): { timestamp: number; clientId: string } {
  return {
    timestamp: Math.floor(Date.now() / 1000),
    clientId: randomUUID(),
  };
}
