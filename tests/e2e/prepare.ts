import { migrate } from "../../scripts/migrate";
import { seedDemo, upsertUser } from "../../scripts/seed";
import { closePool } from "../../src/server/db/pool";
import { createWorkspace } from "../../src/server/workspaces";

await migrate("reset", process.env.DATABASE_OWNER_URL!);
await seedDemo();
const outsider = await upsertUser("outsider@example.com", "Outsider (sample)");
await createWorkspace(outsider, "outsider-studio", "Outsider Studio");
await closePool();
