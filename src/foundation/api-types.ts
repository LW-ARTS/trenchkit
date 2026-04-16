// Raw GMGN API response envelope
export type GmgnApiResponse<T> = {
  code: number;
  data: T;
  msg?: string;
};

// Link info nested in token
export interface GmgnTokenLinks {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

// Pool info nested in token
export interface GmgnTokenPool {
  address: string;
  dex: string;
  base_reserve: number;
  quote_reserve: number;
  initial_liquidity?: number;
}

// Dev info nested in token
export interface GmgnTokenDev {
  address: string;
  token_count: number;
  ath_mc?: number;
  created_open_count?: number;
  created_inner_count?: number;
  created_open_ratio?: number;
}

// Stat info nested in token
export interface GmgnTokenStat {
  volume_1h?: number;
  volume_6h?: number;
  volume_24h?: number;
  price_change_5m?: number;
  price_change_1h?: number;
  price_change_24h?: number;
  holder_growth_rate?: number;
  fresh_wallet_rate?: number;
  smart_money_wallet_count?: number;
  smart_money_volume_ratio?: number;
  bluechip_owner_percentage?: number;
}

// Wallet tag stats nested in token
export interface GmgnWalletTagsStat {
  bot_degen?: number;
  smart_money?: number;
  kol?: number;
  insider?: number;
  sniper?: number;
}

// Core token info from GMGN
export interface GmgnTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  liquidity: number;
  holder_count: number;
  circulating_supply: number;
  total_supply: number;
  creation_timestamp: number;
  open_timestamp: number;
  launchpad?: string;
  launchpad_status?: string;
  launchpad_progress?: number;
  ath_price?: number;
  locked_ratio?: number;
  pool?: GmgnTokenPool;
  dev?: GmgnTokenDev;
  link?: GmgnTokenLinks;
  stat?: GmgnTokenStat;
  wallet_tags_stat?: GmgnWalletTagsStat;
}

// Security audit data
export interface GmgnTokenSecurity {
  is_honeypot?: boolean;
  open_source?: boolean;
  owner_renounced?: boolean;
  renounced_mint?: boolean;
  renounced_freeze_account?: boolean;
  buy_tax?: number;
  sell_tax?: number;
  top_10_holder_rate?: number;
  dev_team_hold_rate?: number;
  creator_balance_rate?: number;
  creator_token_status?: string;
  suspected_insider_hold_rate?: number;
  rug_ratio?: number;
  is_wash_trading?: boolean;
  rat_trader_amount_rate?: number;
  bundler_trader_amount_rate?: number;
  sniper_count?: number;
  burn_status?: string;
}

// Pool info (standalone)
export interface GmgnPoolInfo {
  address: string;
  dex: string;
  token_address: string;
  base_reserve: number;
  quote_reserve: number;
  liquidity: number;
  created_at: number;
  initial_liquidity?: number;
  is_locked?: boolean;
  lock_percent?: number;
}

// Holder entry
export interface GmgnHolder {
  address: string;
  balance: number;
  percent: number;
  is_locked?: boolean;
  tag?: string;
}

// Rank item for trending/top lists
export interface GmgnRankItem {
  address: string;
  symbol: string;
  name: string;
  price: number;
  market_cap: number;
  liquidity: number;
  holder_count: number;
  volume_24h: number;
  price_change_5m?: number;
  price_change_1h?: number;
  price_change_24h?: number;
  created_at?: number;
  open_timestamp?: number;
  launchpad?: string;
  launchpad_status?: string;
  launchpad_progress?: number;
  rug_ratio?: number;
  is_honeypot?: boolean;
}

// Trenches (smart money focus) response wrapper
export interface GmgnTrenchesResponse {
  items: GmgnRankItem[];
  total?: number;
  next_cursor?: string;
}

// Kline (OHLCV) candle
export interface GmgnKlineCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volume_usd?: number;
}

// Wallet performance stats
export interface GmgnWalletStats {
  address: string;
  win_rate: number;
  avg_roi: number;
  total_cost: number;
  realized_profit: number;
  unrealized_profit: number;
  buy_count: number;
  sell_count: number;
  wallet_score?: number;
  tags?: string[];
  risk_level?: string;
  style?: string;
  active_since?: number;
}

// Wallet holding entry
export interface GmgnWalletHolding {
  token_address: string;
  symbol: string;
  name: string;
  balance: number;
  value_usd: number;
  price: number;
  cost_basis?: number;
  unrealized_pnl?: number;
  unrealized_roi?: number;
}

// Token created by a wallet/dev
export interface GmgnCreatedTokens {
  tokens: Array<{
    address: string;
    symbol: string;
    name: string;
    created_at: number;
    ath_mc?: number;
    current_mc?: number;
    status?: string;
  }>;
  total?: number;
}

// Smart money trade entry
export interface GmgnSmartMoneyTrade {
  wallet_address: string;
  token_address: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  value_usd: number;
  price: number;
  timestamp: number;
  tx_hash?: string;
  wallet_tags?: string[];
  // 0 = position opened/added, 1 = position closed/reduced (for kol/smartmoney endpoints)
  is_open_or_close?: number;
}

// Swap/quote response
export interface GmgnSwapResponse {
  order_id: string;
  status: string;
  tx_hash?: string;
  error?: string;
}

export interface GmgnQuoteResponse {
  input_token: string;
  output_token: string;
  input_amount: number;
  output_amount: number;
  price_impact: number;
  fee: number;
  route?: string[];
  expires_at?: number;
}
