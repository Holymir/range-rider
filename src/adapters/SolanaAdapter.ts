import { Connection, PublicKey } from "@solana/web3.js";
import { StrategyEngine } from "../engine/StrategyEngine";
import {
  AdapterConfig,
  AlertResult,
  MonitoringResult,
  PoolConfig,
  PoolSnapshot,
  PositionSnapshot,
  SolanaAdapterInterface,
  YieldMetrics
} from "../types";

export class SolanaAdapter implements SolanaAdapterInterface {
  // TODO: plug Orca/Raydium SDK clients into these read paths for live data.
  private readonly connection: Connection;
  private readonly strategyEngine: StrategyEngine;

  constructor(
    private readonly config: AdapterConfig,
    private readonly pools: PoolConfig[]
  ) {
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.strategyEngine = new StrategyEngine();
  }

  public async getPools(poolIds?: string[]): Promise<PoolSnapshot[]> {
    const selectedPools = poolIds?.length
      ? this.pools.filter((pool) => poolIds.includes(pool.id))
      : this.pools;

    const slot = await this.connection.getSlot("confirmed");
    const now = new Date().toISOString();

    return selectedPools.map((pool, index) => {
      const baselineLiquidity = 1_000_000 + index * 250_000;
      const syntheticPrice = 1 + ((slot + index) % 100) / 100;

      return {
        id: pool.id,
        dex: pool.dex,
        liquidityUsd: baselineLiquidity,
        price: syntheticPrice,
        tokenABalance: baselineLiquidity / 2,
        tokenBBalance: baselineLiquidity / 2 / syntheticPrice,
        volume24hUsd: baselineLiquidity * 0.1,
        timestamp: now
      };
    });
  }

  public async getPosition(owner: string, poolId: string): Promise<PositionSnapshot> {
    this.assertValidPublicKey(owner);

    const pool = this.pools.find((p) => p.id === poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} is not configured.`);
    }

    const [poolSnapshot] = await this.getPools([poolId]);
    const currentPrice = poolSnapshot.price;
    const entryPrice = currentPrice * 0.92;
    const last24hPrices = this.generateSyntheticPriceSeries(currentPrice);

    return {
      poolId,
      owner,
      inRange: Math.abs(currentPrice - entryPrice) / entryPrice <= pool.targetRangePct,
      liquidityUsd: 20_000,
      tokenAAmount: 8_000,
      tokenBAmount: 6_500,
      feesEarnedUsd: 120,
      entryPrice,
      currentPrice,
      last24hPrices,
      timestamp: new Date().toISOString()
    };
  }

  public calculateNetYield(position: PositionSnapshot): YieldMetrics {
    return this.strategyEngine.calculateNetYield(position);
  }

  public checkAlerts(position: PositionSnapshot, yieldMetrics: YieldMetrics): AlertResult[] {
    const volatility = this.strategyEngine.calculateVolatility(position.last24hPrices);
    return this.strategyEngine.checkAlerts(position, yieldMetrics, volatility);
  }

  public async monitorPosition(owner: string, poolId: string): Promise<MonitoringResult> {
    const [pool] = await this.getPools([poolId]);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found.`);
    }

    const position = await this.getPosition(owner, poolId);
    return this.strategyEngine.buildMonitoringResult(pool, position);
  }

  private assertValidPublicKey(value: string): void {
    try {
      // eslint-disable-next-line no-new
      new PublicKey(value);
    } catch (error) {
      throw new Error(`Invalid Solana wallet address: ${value}. ${String(error)}`);
    }
  }

  private generateSyntheticPriceSeries(basePrice: number): number[] {
    return Array.from({ length: 24 }, (_, i) => {
      const drift = 1 + (i - 12) * 0.0025;
      const noise = 1 + ((i % 3) - 1) * 0.004;
      return Number((basePrice * drift * noise).toFixed(6));
    });
  }
}
