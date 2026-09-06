import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";

export default async function RootPage() {
  const userId = await getCurrentUserId();
  redirect(userId ? "/cash-today" : "/setup");
}
