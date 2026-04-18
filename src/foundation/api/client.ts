import type { GmgnApiResponse } from "../api-types.js";
import { signRequest } from "../auth.js";
import type { RateLimiter } from "../rate-limiter.js";
import { createRateLimiter, Priority } from "../rate-limiter.js";
import { createMarketApi, type MarketApi } from "./market.js";
import { createTokenApi, type TokenApi } from "./token.js";
import { createTradeApi, type TradeApi } from "./trade.js";
import { createUserApi, type UserApi } from "./user.js";

const BASE_URL = "https://openapi.gmgn.ai";

export class AuthTimestampExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthTimestampExpiredError";
  }
}

function isTimestampExpired(msg: string): boolean {
  return /AUTH_TIMESTAMP_EXPIRED|timestamp.*expired/i.test(msg);
}

export interface RequestOptions {
  params?: Record<string, string>;
  body?: unknown;
  weight?: number;
  sign?: boolean;
}

export interface ApiContext {
  rateLimiter: RateLimiter;
  request: <T>(method: "GET" | "POST", path: string, options?: RequestOptions) => Promise<T>;
}

export interface GmgnClient {
  token: TokenApi;
  market: MarketApi;
  user: UserApi;
  trade: TradeApi;
  // Read-only access to the underlying rate limiter for status indicators (D-14).
  // Consumers MUST treat this as read-only — never call applyPenalty() from the UI.
  rateLimiter: RateLimiter;
}

function sanitizeApiKey(message: string, apiKey: string): string {
  if (!apiKey) return message;
  return message.split(apiKey).join("[REDACTED]");
}

function createApiContext(apiKey: string): ApiContext {
  const rateLimiter = createRateLimiter();

  const executeOnce = async <T>(
    method: "GET" | "POST",
    path: string,
    params: Record<string, string> | undefined,
    body: unknown,
    sign: boolean,
  ): Promise<T> => {
    const url = new URL(`${BASE_URL}${path}`);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const clientId = crypto.randomUUID();

    url.searchParams.set("timestamp", timestamp);
    url.searchParams.set("client_id", clientId);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const bodyString = body !== undefined ? JSON.stringify(body) : "";

    const headers: Record<string, string> = {
      "X-APIKEY": apiKey,
      "Content-Type": "application/json",
    };

    if (sign) {
      const sortedQs = [...url.searchParams.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
      const signature = await signRequest(path, sortedQs, bodyString, parseInt(timestamp, 10));
      headers["X-Signature"] = signature;
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        ...(body !== undefined ? { body: bodyString } : {}),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(sanitizeApiKey(`Network error: ${msg}`, apiKey));
    }

    if (response.status === 429) {
      const resetHeader = response.headers.get("X-RateLimit-Reset");
      if (resetHeader) {
        const resetTimestamp = parseInt(resetHeader, 10);
        const now = Math.floor(Date.now() / 1000);
        const penaltyMs = Math.max(0, (resetTimestamp - now) * 1000);
        rateLimiter.applyPenalty(penaltyMs);
      }
      throw new Error("Rate limit exceeded (429)");
    }

    if (!response.ok) {
      let errBodyText = "";
      try {
        errBodyText = await response.text();
      } catch {
        // fall through
      }
      if (response.status === 401 && isTimestampExpired(errBodyText)) {
        throw new AuthTimestampExpiredError(
          sanitizeApiKey(`HTTP 401 AUTH_TIMESTAMP_EXPIRED: ${errBodyText}`, apiKey),
        );
      }
      const errMsg = errBodyText
        ? sanitizeApiKey(`HTTP ${response.status}: ${errBodyText}`, apiKey)
        : `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errMsg);
    }

    let json: GmgnApiResponse<T>;
    try {
      json = (await response.json()) as GmgnApiResponse<T>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(sanitizeApiKey(`Failed to parse response: ${msg}`, apiKey));
    }

    if (json.code !== 0) {
      const apiMsg = json.msg ?? `API error code ${json.code}`;
      if (isTimestampExpired(apiMsg)) {
        throw new AuthTimestampExpiredError(sanitizeApiKey(apiMsg, apiKey));
      }
      throw new Error(sanitizeApiKey(apiMsg, apiKey));
    }

    return json.data;
  };

  const request = async <T>(
    method: "GET" | "POST",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> => {
    const { params, body, weight = 1, sign = false } = options;

    return rateLimiter.schedule({ weight, priority: Priority.DEFAULT }, async () => {
      try {
        return await executeOnce<T>(method, path, params, body, sign);
      } catch (err) {
        // GET retry-once on AUTH_TIMESTAMP_EXPIRED (fresh timestamp).
        // POST never retried — caller routes to query_order to avoid double-spend.
        if (err instanceof AuthTimestampExpiredError && method === "GET") {
          return executeOnce<T>(method, path, params, body, sign);
        }
        throw err;
      }
    });
  };

  return { rateLimiter, request };
}

export function createGmgnClient(apiKey: string): GmgnClient {
  const ctx = createApiContext(apiKey);
  return {
    token: createTokenApi(ctx),
    market: createMarketApi(ctx),
    user: createUserApi(ctx),
    trade: createTradeApi(ctx),
    rateLimiter: ctx.rateLimiter,
  };
}
