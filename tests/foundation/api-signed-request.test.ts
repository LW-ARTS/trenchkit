import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as auth from "../../src/foundation/auth.js";
import {
  AuthTimestampExpiredError,
  createGmgnClient,
} from "../../src/foundation/api/client.js";

const API_KEY = "test-api-key-12345";
const OK_ENVELOPE = { code: 0, data: { order_id: "o1", status: "pending" } };

function mockResponse(body: unknown, init: { status?: number; text?: string } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  const payload = init.text ?? JSON.stringify(body);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(),
    text: () => Promise.resolve(payload),
    json: () => Promise.resolve(JSON.parse(payload)),
  } as Response;
}

describe("signed request", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let signSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    signSpy = vi.spyOn(auth, "signRequest").mockResolvedValue("fake-signature-base64");
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(mockResponse(OK_ENVELOPE));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches X-Signature header and passes canonical message to signRequest on POST", async () => {
    const client = createGmgnClient(API_KEY);
    await client.trade.submitSwap("sol", {
      from: "wallet1",
      input_token: "SOL",
      output_token: "TOKEN",
      amount: "0.5",
      slippage: 0.02,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Signature"]).toBe("fake-signature-base64");
    expect(headers["X-APIKEY"]).toBe(API_KEY);
    expect(init.method).toBe("POST");
    expect(url).toContain("/v1/trade/swap");

    // signRequest receives (path, sortedQuerystring, bodyJson, timestamp).
    expect(signSpy).toHaveBeenCalledTimes(1);
    const [path, qs, body, ts] = signSpy.mock.calls[0] as [string, string, string, number];
    expect(path).toBe("/v1/trade/swap");
    // Querystring is sorted alphabetically: client_id, timestamp.
    const qsEntries = qs.split("&").map((p) => p.split("=")[0]);
    expect(qsEntries).toEqual([...qsEntries].sort());
    expect(qsEntries).toContain("client_id");
    expect(qsEntries).toContain("timestamp");
    expect(body).toBe(
      JSON.stringify({
        chain: "sol",
        from: "wallet1",
        input_token: "SOL",
        output_token: "TOKEN",
        amount: "0.5",
        slippage: 0.02,
      }),
    );
    expect(Number.isInteger(ts)).toBe(true);
  });

  it("does NOT attach X-Signature on unsigned requests", async () => {
    const client = createGmgnClient(API_KEY);
    await client.market.getTrending("sol").catch(() => {
      // market endpoint response shape differs; we only care about the fetch call.
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Signature"]).toBeUndefined();
    expect(signSpy).not.toHaveBeenCalled();
  });

  it("surfaces AuthTimestampExpiredError on 401 AUTH_TIMESTAMP_EXPIRED and never retries POST", async () => {
    fetchSpy.mockReset();
    fetchSpy.mockResolvedValue(
      mockResponse(null, { status: 401, text: "AUTH_TIMESTAMP_EXPIRED" }),
    );

    const client = createGmgnClient(API_KEY);
    await expect(
      client.trade.submitSwap("sol", {
        from: "w",
        input_token: "SOL",
        output_token: "T",
        amount: "0.5",
        slippage: 0.02,
      }),
    ).rejects.toBeInstanceOf(AuthTimestampExpiredError);

    // Crucial: POST must be fired exactly once.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries GET once on AUTH_TIMESTAMP_EXPIRED with fresh timestamp", async () => {
    fetchSpy.mockReset();
    fetchSpy
      .mockResolvedValueOnce(mockResponse(null, { status: 401, text: "AUTH_TIMESTAMP_EXPIRED" }))
      .mockResolvedValueOnce(mockResponse({ code: 0, data: { order_id: "o", status: "ok" } }));

    const client = createGmgnClient(API_KEY);
    await client.trade.getOrderStatus("sol", "order-id");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
