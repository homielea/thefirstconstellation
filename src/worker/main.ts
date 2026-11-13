import { loadEnv } from "@/server/env";
import { createProviders } from "@/server/providers/registry";
import { runWorker } from "./loop";

loadEnv();
const ctl = new AbortController();
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => ctl.abort());
runWorker(createProviders(), { signal: ctl.signal, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2) }).then(() => process.exit(0));
