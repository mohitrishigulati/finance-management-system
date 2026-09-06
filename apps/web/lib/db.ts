import pg from "pg";

/**
 * Two pools, mirroring the Supabase service_role vs authenticated/anon split:
 *
 * - `adminPool` connects as the migrator (superuser) role. RLS does not apply.
 *   Used only for the handful of genuinely cross-tenant or bootstrap
 *   operations (creating a brand-new company + its first user, where no
 *   app_current_user_id() exists yet to satisfy the RLS check). On real
 *   Supabase this becomes the service_role client, used server-side only.
 * - `appPool` connects as app_user (non-superuser, FORCE ROW LEVEL SECURITY).
 *   Every regular request runs through withCompanyContext() on this pool, so
 *   a bug that forgets a company_id filter still can't leak another tenant's
 *   rows — RLS enforces it at the database, not just in application code.
 */

const adminPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_MIGRATOR,
});

const appPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_APP,
});

export function getAdminPool() {
  return adminPool;
}

/**
 * Runs `fn` with a Postgres client whose session has app.current_user_id set
 * for the duration of one transaction, so every RLS policy scopes to that
 * user's company. Always use this for per-tenant reads/writes; never query
 * appPool directly outside of it.
 */
export async function withCompanyContext<T>(userId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
