import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Chain } from "./types.js";

const CONFIG_DIR = join(homedir(), ".config", "trenchkit");
const ENV_PATH = join(CONFIG_DIR, ".env");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export type TrenchkitConfig = {
  defaultChain: Chain;
  maxTradeAmount: number;
  defaultPriorityFee: number;
  defaultTipFee: number;
  walletAddress?: string;
};

const DEFAULT_CONFIG: TrenchkitConfig = {
  defaultChain: "sol",
  maxTradeAmount: 1,
  defaultPriorityFee: 0.00001,
  defaultTipFee: 0.00001,
};

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): TrenchkitConfig {
  if (!existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: TrenchkitConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  chmodSync(CONFIG_PATH, 0o600);
}

export function loadApiKey(): string | null {
  if (!existsSync(ENV_PATH)) return null;
  try {
    const raw = readFileSync(ENV_PATH, "utf-8");
    const match = raw.match(/GMGN_API_KEY=(.+)/);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

export function saveEnv(apiKey: string, privateKeyPem?: string): void {
  ensureConfigDir();
  let content = `GMGN_API_KEY=${apiKey}\n`;
  if (privateKeyPem) {
    content += `GMGN_PRIVATE_KEY="${privateKeyPem}"\n`;
  }
  writeFileSync(ENV_PATH, content);
  chmodSync(ENV_PATH, 0o600);
}

export function hasPrivateKey(): boolean {
  if (!existsSync(ENV_PATH)) return false;
  try {
    const raw = readFileSync(ENV_PATH, "utf-8");
    return raw.includes("GMGN_PRIVATE_KEY=");
  } catch {
    return false;
  }
}

export function loadPrivateKeyBuffer(): Buffer | null {
  if (!existsSync(ENV_PATH)) return null;
  try {
    const raw = readFileSync(ENV_PATH, "utf-8");
    const match = raw.match(/GMGN_PRIVATE_KEY="?([^"]+)"?/);
    if (!match?.[1]) return null;
    return Buffer.from(match[1].replace(/\\n/g, "\n"));
  } catch {
    return null;
  }
}
