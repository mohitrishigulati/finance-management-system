import { cookies } from "next/headers";

/**
 * Dev-session stub (docs/DECISIONS.md): real Supabase Auth phone-OTP isn't
 * wired up yet — there's no Supabase project to issue it against. Until then,
 * "logging in" is Setup creating the first app_user row and this cookie
 * remembering its id. Swapping in real phone-OTP later means replacing this
 * file's two functions; nothing else in the app should read cookies directly.
 */

const SESSION_COOKIE = "fos_dev_user_id";

export async function getCurrentUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setCurrentUserId(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
