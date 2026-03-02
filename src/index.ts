import pools from "../config/pools.sample.json";
import { MonitoringAPI } from "./api/MonitoringAPI";
import { SolanaAdapter } from "./adapters/SolanaAdapter";
import { PoolConfig } from "./types";

const adapter = new SolanaAdapter(
  {
    rpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com"
  },
  pools as PoolConfig[]
);

const api = new MonitoringAPI(adapter);

async function bootstrap(): Promise<void> {
  const [mode] = process.argv.slice(2);

  if (mode === "serve") {
    const port = Number(process.env.PORT ?? "3000");
    api.startServer(port);
    return;
  }

  await api.runCli(process.argv);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
