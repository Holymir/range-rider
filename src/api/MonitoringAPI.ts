import express, { Request, Response } from "express";
import { Command } from "commander";
import { SolanaAdapter } from "../adapters/SolanaAdapter";

export class MonitoringAPI {
  constructor(private readonly adapter: SolanaAdapter) {}

  public async runCli(argv: string[]): Promise<void> {
    const program = new Command();

    program
      .name("range-rider")
      .description("RangeRider Solana LP monitoring CLI")
      .version("0.1.0");

    program
      .command("monitor")
      .requiredOption("-w, --wallet <wallet>", "Solana wallet address")
      .requiredOption("-p, --pool <pool>", "Pool id")
      .action(async (options: { wallet: string; pool: string }) => {
        const result = await this.adapter.monitorPosition(options.wallet, options.pool);
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result, null, 2));
      });

    program
      .command("pools")
      .action(async () => {
        const pools = await this.adapter.getPools();
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(pools, null, 2));
      });

    await program.parseAsync(argv);
  }

  public startServer(port: number): void {
    const app = express();

    app.get("/health", (_req: Request, res: Response) => {
      res.json({ status: "ok" });
    });

    app.get("/pools", async (_req: Request, res: Response) => {
      const pools = await this.adapter.getPools();
      res.json({ pools });
    });

    app.get("/monitor/:wallet/:poolId", async (req: Request, res: Response) => {
      try {
        const result = await this.adapter.monitorPosition(req.params.wallet, req.params.poolId);
        res.json(result);
      } catch (error) {
        res.status(400).json({ error: String(error) });
      }
    });

    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Monitoring API listening on http://localhost:${port}`);
    });
  }
}
