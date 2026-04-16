// Chain identifiers
export type Chain = 'sol' | 'bsc' | 'base';

// Security fields applicable per chain
export interface ApplicableSecurityFields {
  freezeAuthority: boolean;
  mintAuthority: boolean;
  honeypot: boolean;
  buyTax: boolean;
  sellTax: boolean;
}

// Per-chain configuration
export interface ChainConfig {
  id: Chain;
  nativeCurrency: string;
  nativeAddress: string;
  nativeDecimals: number;
  defaultFilters: Record<string, unknown>;
  explorerUrl: string;
  applicableSecurityFields: ApplicableSecurityFields;
}

// Lifecycle stages
export type LifecycleStage = 'EARLY' | 'BREAKOUT' | 'DISTRIBUTION' | 'DECLINE';

// Conviction labels
export type ConvictionLabel = 'HIGH' | 'MODERATE' | 'LOW' | 'AVOID';

// Signal strength
export type SignalStrength = 'WEAK' | 'MEDIUM' | 'STRONG' | 'VERY_STRONG';

// Full token analysis result (~40 nullable fields)
export interface TokenAnalysis {
  address: string;
  chain: Chain;
  symbol: string | null;
  name: string | null;
  marketCap: number | null;
  liquidity: number | null;
  holderCount: number | null;
  volume24h: number | null;
  age: number | null;
  priceChange5m: number | null;
  isHoneypot: boolean | null;
  isRenounced: boolean | null;
  isFreezeAuthorityRenounced: boolean | null;
  isMintAuthorityRenounced: boolean | null;
  buyTax: number | null;
  sellTax: number | null;
  rugRatio: number | null;
  burnRatio: number | null;
  isWashTrading: boolean | null;
  isOnCurve: boolean | null;
  launchpadProgress: number | null;
  top10HolderRate: number | null;
  holderGrowthRate: number | null;
  freshWalletRate: number | null;
  insiderHoldRate: number | null;
  botDegenRate: number | null;
  bundlerRate: number | null;
  ratTraderRate: number | null;
  sniperCount: number | null;
  bluechipOwnerPercentage: number | null;
  privateVaultHoldRate: number | null;
  creatorOpenCount: number | null;
  creatorInnerCount: number | null;
  creatorOpenRatio: number | null;
  devAthMc: number | null;
  smartMoneyWalletCount: number | null;
  smartMoneyVolumeRatio: number | null;
  convergenceStrength: number | null;
  liquidityStable: boolean | null;
  lifecycleStage: LifecycleStage | null;
  dimensionScores: Record<string, number> | null;
  convictionScore: number | null;
  convictionLabel: ConvictionLabel | null;
  partialData: boolean;
}

// Slice types — focused subsets of TokenAnalysis
export type SecuritySlice = Pick<
  TokenAnalysis,
  | 'address'
  | 'chain'
  | 'isHoneypot'
  | 'isRenounced'
  | 'isFreezeAuthorityRenounced'
  | 'isMintAuthorityRenounced'
  | 'buyTax'
  | 'sellTax'
>;

export type HolderSlice = Pick<
  TokenAnalysis,
  | 'address'
  | 'chain'
  | 'holderCount'
  | 'top10HolderRate'
  | 'holderGrowthRate'
  | 'freshWalletRate'
  | 'insiderHoldRate'
  | 'privateVaultHoldRate'
>;

export type SmartMoneySlice = Pick<
  TokenAnalysis,
  | 'address'
  | 'chain'
  | 'smartMoneyWalletCount'
  | 'smartMoneyVolumeRatio'
  | 'bluechipOwnerPercentage'
  | 'convergenceStrength'
>;

export type DevSlice = Pick<
  TokenAnalysis,
  | 'address'
  | 'chain'
  | 'creatorOpenCount'
  | 'creatorInnerCount'
  | 'creatorOpenRatio'
  | 'devAthMc'
>;

export type LiquiditySlice = Pick<
  TokenAnalysis,
  | 'address'
  | 'chain'
  | 'liquidity'
  | 'liquidityStable'
  | 'burnRatio'
  | 'rugRatio'
>;

export type BotSlice = Pick<
  TokenAnalysis,
  | 'address'
  | 'chain'
  | 'botDegenRate'
  | 'bundlerRate'
  | 'ratTraderRate'
  | 'sniperCount'
  | 'isWashTrading'
>;

// Wallet profile
export interface WalletProfile {
  address: string;
  chain: Chain;
  winRate: number | null;
  avgRoi: number | null;
  style: string | null;
  tags: string[] | null;
  riskLevel: string | null;
  activeSince: number | null;
  totalCost: number | null;
  realizedProfit: number | null;
  unrealizedProfit: number | null;
  buyCount: number | null;
  sellCount: number | null;
  walletScore: number | null;
}

// Factory function to create an empty TokenAnalysis
export function createEmptyTokenAnalysis(address: string, chain: Chain): TokenAnalysis {
  return {
    address,
    chain,
    symbol: null,
    name: null,
    marketCap: null,
    liquidity: null,
    holderCount: null,
    volume24h: null,
    age: null,
    priceChange5m: null,
    isHoneypot: null,
    isRenounced: null,
    isFreezeAuthorityRenounced: null,
    isMintAuthorityRenounced: null,
    buyTax: null,
    sellTax: null,
    rugRatio: null,
    burnRatio: null,
    isWashTrading: null,
    isOnCurve: null,
    launchpadProgress: null,
    top10HolderRate: null,
    holderGrowthRate: null,
    freshWalletRate: null,
    insiderHoldRate: null,
    botDegenRate: null,
    bundlerRate: null,
    ratTraderRate: null,
    sniperCount: null,
    bluechipOwnerPercentage: null,
    privateVaultHoldRate: null,
    creatorOpenCount: null,
    creatorInnerCount: null,
    creatorOpenRatio: null,
    devAthMc: null,
    smartMoneyWalletCount: null,
    smartMoneyVolumeRatio: null,
    convergenceStrength: null,
    liquidityStable: null,
    lifecycleStage: null,
    dimensionScores: null,
    convictionScore: null,
    convictionLabel: null,
    partialData: false,
  };
}
