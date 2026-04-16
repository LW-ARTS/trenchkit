import type { RateLimiter } from '../rate-limiter.js';
import { createRateLimiter, Priority } from '../rate-limiter.js';
import type { GmgnApiResponse } from '../api-types.js';
import { createTokenApi, type TokenApi } from './token.js';
import { createMarketApi, type MarketApi } from './market.js';
import { createUserApi, type UserApi } from './user.js';
import { createTradeApi, type TradeApi } from './trade.js';

const BASE_URL = 'https://openapi.gmgn.ai';

export interface ApiContext {
  rateLimiter: RateLimiter;
  request: <T>(
    method: 'GET' | 'POST',
    path: string,
    options?: { params?: Record<string, string>; body?: unknown; weight?: number }
  ) => Promise<T>;
}

export interface GmgnClient {
  token: TokenApi;
  market: MarketApi;
  user: UserApi;
  trade: TradeApi;
}

function sanitizeApiKey(message: string, apiKey: string): string {
  if (!apiKey) return message;
  return message.split(apiKey).join('[REDACTED]');
}

function createApiContext(apiKey: string): ApiContext {
  const rateLimiter = createRateLimiter();

  const request = async <T>(
    method: 'GET' | 'POST',
    path: string,
    options: { params?: Record<string, string>; body?: unknown; weight?: number } = {}
  ): Promise<T> => {
    const { params, body, weight = 1 } = options;

    const url = new URL(`${BASE_URL}${path}`);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const clientId = crypto.randomUUID();

    url.searchParams.set('timestamp', timestamp);
    url.searchParams.set('client_id', clientId);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    return rateLimiter.schedule({ weight, priority: Priority.DEFAULT }, async () => {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method,
          headers: {
            'X-APIKEY': apiKey,
            'Content-Type': 'application/json',
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(sanitizeApiKey(`Network error: ${msg}`, apiKey));
      }

      if (response.status === 429) {
        const resetHeader = response.headers.get('X-RateLimit-Reset');
        if (resetHeader) {
          const resetTimestamp = parseInt(resetHeader, 10);
          const now = Math.floor(Date.now() / 1000);
          const penaltyMs = Math.max(0, (resetTimestamp - now) * 1000);
          rateLimiter.applyPenalty(penaltyMs);
        }
        throw new Error('Rate limit exceeded (429)');
      }

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errBody = await response.text();
          errMsg = sanitizeApiKey(`HTTP ${response.status}: ${errBody}`, apiKey);
        } catch {
          // ignore parse error, use status message
        }
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
        throw new Error(sanitizeApiKey(apiMsg, apiKey));
      }

      return json.data;
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
  };
}
