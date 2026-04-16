import { describe, it, expect } from 'vitest';
import { createGmgnClient } from '../../src/foundation/api/client.js';

describe('createGmgnClient', () => {
  it('returns an object with token, market, user, trade properties', () => {
    const client = createGmgnClient('test-api-key');
    expect(client).toHaveProperty('token');
    expect(client).toHaveProperty('market');
    expect(client).toHaveProperty('user');
    expect(client).toHaveProperty('trade');
  });

  it('token api has expected methods', () => {
    const client = createGmgnClient('test-api-key');
    expect(typeof client.token.getInfo).toBe('function');
    expect(typeof client.token.getSecurity).toBe('function');
    expect(typeof client.token.getPool).toBe('function');
    expect(typeof client.token.getTopHolders).toBe('function');
    expect(typeof client.token.getTopTraders).toBe('function');
  });

  it('market api has expected methods', () => {
    const client = createGmgnClient('test-api-key');
    expect(typeof client.market.getTrending).toBe('function');
    expect(typeof client.market.getTrenches).toBe('function');
    expect(typeof client.market.getKline).toBe('function');
  });

  it('user api has expected methods', () => {
    const client = createGmgnClient('test-api-key');
    expect(typeof client.user.getWalletStats).toBe('function');
    expect(typeof client.user.getWalletHoldings).toBe('function');
    expect(typeof client.user.getWalletActivity).toBe('function');
    expect(typeof client.user.getCreatedTokens).toBe('function');
    expect(typeof client.user.getKolTrades).toBe('function');
    expect(typeof client.user.getSmartMoneyTrades).toBe('function');
  });

  it('trade api has expected methods', () => {
    const client = createGmgnClient('test-api-key');
    expect(typeof client.trade.getQuote).toBe('function');
    expect(typeof client.trade.submitSwap).toBe('function');
    expect(typeof client.trade.getOrderStatus).toBe('function');
    expect(typeof client.trade.getStrategyOrders).toBe('function');
  });
});
