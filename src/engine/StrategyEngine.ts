import {
  AlertResult,
  MonitoringResult,
  PoolSnapshot,
  PositionSnapshot,
  VolatilityMetrics,
  YieldMetrics
} from "../types";

export interface AlertThresholds {
  volatilitySpikeThresholdPct: number;
}

export class StrategyEngine {
  constructor(private readonly thresholds: AlertThresholds = { volatilitySpikeThresholdPct: 80 }) {}

  public calculateImpermanentLoss(position: PositionSnapshot): { usd: number; pct: number } {
    const p0 = position.entryPrice;
    const p1 = position.currentPrice;

    if (p0 <= 0 || p1 <= 0) {
      return { usd: 0, pct: 0 };
    }

    const ratio = p1 / p0;
    const ilPct = 1 - (2 * Math.sqrt(ratio)) / (1 + ratio);
    const ilUsd = Math.max(0, ilPct * position.liquidityUsd);

    return {
      usd: ilUsd,
      pct: ilPct * 100
    };
  }

  public calculateVolatility(prices: number[]): VolatilityMetrics {
    if (prices.length < 2) {
      return {
        annualizedVolatilityPct: 0,
        dailyReturnsStdDev: 0,
        spikeDetected: false
      };
    }

    const returns = prices
      .slice(1)
      .map((price, idx) => Math.log(price / prices[idx]))
      .filter((v) => Number.isFinite(v));

    if (returns.length === 0) {
      return {
        annualizedVolatilityPct: 0,
        dailyReturnsStdDev: 0,
        spikeDetected: false
      };
    }

    const mean = returns.reduce((acc, cur) => acc + cur, 0) / returns.length;
    const variance = returns.reduce((acc, cur) => acc + (cur - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualized = stdDev * Math.sqrt(365) * 100;

    return {
      annualizedVolatilityPct: annualized,
      dailyReturnsStdDev: stdDev,
      spikeDetected: annualized > this.thresholds.volatilitySpikeThresholdPct
    };
  }

  public calculateNetYield(position: PositionSnapshot): YieldMetrics {
    const il = this.calculateImpermanentLoss(position);
    const netYieldUsd = position.feesEarnedUsd - il.usd;

    return {
      feesEarnedUsd: position.feesEarnedUsd,
      impermanentLossUsd: il.usd,
      impermanentLossPct: il.pct,
      netYieldUsd,
      netYieldPct: position.liquidityUsd > 0 ? (netYieldUsd / position.liquidityUsd) * 100 : 0
    };
  }

  public checkAlerts(
    position: PositionSnapshot,
    yieldMetrics: YieldMetrics,
    volatility: VolatilityMetrics
  ): AlertResult[] {
    const alerts: AlertResult[] = [];

    if (!position.inRange) {
      alerts.push({
        code: "OUT_OF_RANGE",
        severity: "high",
        message: `Position in pool ${position.poolId} is out of active range.`
      });
    }

    if (yieldMetrics.feesEarnedUsd < yieldMetrics.impermanentLossUsd) {
      alerts.push({
        code: "FEES_BELOW_IL",
        severity: "medium",
        message: "Fees earned are below projected impermanent loss."
      });
    }

    if (volatility.spikeDetected) {
      alerts.push({
        code: "VOLATILITY_SPIKE",
        severity: "medium",
        message: `Annualized volatility spiked to ${volatility.annualizedVolatilityPct.toFixed(2)}%.`
      });
    }

    return alerts;
  }

  public buildMonitoringResult(pool: PoolSnapshot, position: PositionSnapshot): MonitoringResult {
    const yieldMetrics = this.calculateNetYield(position);
    const volatility = this.calculateVolatility(position.last24hPrices);
    const alerts = this.checkAlerts(position, yieldMetrics, volatility);

    return {
      pool,
      position,
      yield: yieldMetrics,
      volatility,
      alerts
    };
  }
}
