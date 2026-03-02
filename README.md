# RangeRider MVP

RangeRider is a Node.js + TypeScript MVP for monitoring concentrated LP positions on **Solana**, focused on **Orca** and **Raydium** pools.

## Features (MVP)

- Solana adapter interface with Orca and Raydium SDK dependencies.
- Position monitoring for configured pools.
- Net yield computation (`fees - impermanent loss`).
- Volatility tracking from recent pool price series.
- Manual rebalance alerting when:
  - Position is out of range.
  - Fees are below projected IL.
  - Volatility spikes above threshold.
- JSON output for CLI and REST API consumption.

## Project structure

- `src/engine/StrategyEngine.ts`: core math and alert logic.
- `src/adapters/SolanaAdapter.ts`: Solana pool + LP position adapter (`getPools`, `getPosition`, `calculateNetYield`, `checkAlerts`).
- `src/api/MonitoringAPI.ts`: CLI commands and optional REST server.
- `config/pools.sample.json`: sample pool configuration.
- `examples/output.sample.json`: example monitor result output.

## Setup

```bash
npm install
npm run build
```

Optional environment variables:

- `SOLANA_RPC_URL`: custom Solana RPC endpoint (defaults to mainnet-beta endpoint).
- `PORT`: API port in serve mode (defaults to `3000`).

## Usage

### 1) List configured pools

```bash
npm run start -- pools
```

### 2) Monitor one wallet + pool (manual mode)

```bash
npm run start -- monitor --wallet 7Y2o8wLT4YTRvkVYQwF62v5vVGfD8pdnLhys8EPq9R1t --pool orca-sol-usdc
```

Returns structured JSON including:

- `yield.feesEarnedUsd`
- `yield.impermanentLossUsd`
- `yield.netYieldUsd`
- `volatility.annualizedVolatilityPct`
- `alerts[]`

### 3) Start REST API

```bash
npm run start -- serve
```

Endpoints:

- `GET /health`
- `GET /pools`
- `GET /monitor/:wallet/:poolId`

## Notes on data sources

This MVP keeps adapter reads deterministic with synthetic snapshots so the core monitoring flow can be validated without private indexing services. Orca and Raydium SDK dependencies are already wired for easy migration to direct on-chain pool/position reads.

## Extending to Base (future)

Keep the same adapter contract and add `BaseAdapter` implementing:

- `getPools()`
- `getPosition()`
- `calculateNetYield()`
- `checkAlerts()`

Then route adapter selection in `src/index.ts` by chain.
