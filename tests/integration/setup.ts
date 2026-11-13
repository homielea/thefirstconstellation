import { afterAll, beforeAll } from "vitest";
import { closePool } from "../../src/server/db/pool";
import { resetDb, useTestEnv } from "../helpers/db";

useTestEnv();
beforeAll(async () => { await resetDb(); });
afterAll(async () => { await closePool(); });
