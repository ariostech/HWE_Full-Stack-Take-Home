import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as path from "path";

async function runMigrations() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://emissions:emissions@localhost:5432/emissions",
  });

  const db = drizzle(pool);

  console.log("Running migrations...");
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "migrations"),
  });
  console.log("Migrations completed.");

  await pool.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
