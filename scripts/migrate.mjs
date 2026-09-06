// Applies every SQL file in supabase/migrations, in filename order, using the
// migrator (superuser) connection — same shape `supabase db push` would use
// against a real project. Then grants the app_user role table access so RLS
// (not superuser bypass) actually governs runtime queries.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "dotenv/config";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

const connectionString = process.env.DATABASE_URL_MIGRATOR;
if (!connectionString) {
  console.error("DATABASE_URL_MIGRATOR is not set. Copy .env.example to .env first.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const { rows } = await client.query("select 1 from schema_migrations where filename = $1", [file]);
    if (rows.length > 0) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`apply ${file}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [file]);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }

  console.log("granting app_user table access (RLS governs row visibility, not table grants)...");
  const grantSql = readFileSync(path.join(__dirname, "grants.sql"), "utf8");
  await client.query(grantSql);

  console.log("done.");
} finally {
  await client.end();
}
