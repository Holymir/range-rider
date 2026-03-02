export type Dex = "orca" | "raydium";

export interface PoolConfig {
  id: string;
  name: string;
  dex: Dex;
  tokenA: string;
  tokenB: string;
  feeRateBps: number;
  targetRangePct: number;
  projectedApr: number;
}

export interface PositionSnapshot {
  poolId: string;
  owner: string;
  inRange: boolean;
  liquidityUsd: number;
  tokenAAmount: number;
  tokenBAmount: number;
  feesEarnedUsd: number;
  entryPrice: number;
  currentPrice: number;
  last24hPrices: number[];
  timestamp: string;
}

export interface PoolSnapshot {
  id: string;
  dex: Dex;
  liquidityUsd: number;
  price: number;
  tokenABalance: number;
  tokenBBalance: number;
  volume24hUsd: number;
  timestamp: string;
}

export interface YieldMetrics {
  feesEarnedUsd: number;
  impermanentLossUsd: number;
  impermanentLossPct: number;
  netYieldUsd: number;
  netYieldPct: number;
}

export interface VolatilityMetrics {
  annualizedVolatilityPct: number;
  dailyReturnsStdDev: number;
  spikeDetected: boolean;
}

export interface AlertResult {
  code: "OUT_OF_RANGE" | "FEES_BELOW_IL" | "VOLATILITY_SPIKE";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface MonitoringResult {
  pool: PoolSnapshot;
  position: PositionSnapshot;
  yield: YieldMetrics;
  volatility: VolatilityMetrics;
  alerts: AlertResult[];
}

export interface AdapterConfig {
  rpcUrl: string;
}

export interface SolanaAdapterInterface {
  getPools(poolIds?: string[]): Promise<PoolSnapshot[]>;
  getPosition(owner: string, poolId: string): Promise<PositionSnapshot>;
  calculateNetYield(position: PositionSnapshot): YieldMetrics;
  checkAlerts(position: PositionSnapshot, yieldMetrics: YieldMetrics): AlertResult[];
}
