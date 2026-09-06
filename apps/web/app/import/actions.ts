"use server";

import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { parseStatementFile } from "@/lib/importFile";
import { commitStatementRows } from "@/lib/importCommit";
import { createHash } from "node:crypto";

export async function importStatementAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/setup");

  const bankAccountId = String(formData.get("bank_account_id"));
  const file = formData.get("file") as File;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const { rows, errors } = parseStatementFile(file.name, buffer);
  const summary = await commitStatementRows(userId, bankAccountId, file.name, fileHash, rows, "csv", errors.length);

  redirect(`/import?imported=${summary.rowsNew}&duplicate=${summary.rowsDuplicate}&errors=${summary.rowsError}`);
}
