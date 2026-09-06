import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { commitStatementRows } from "@/lib/importCommit";
import type { NormalizedRow } from "@/lib/csvImport";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json()) as {
    bankAccountId: string;
    fileName: string;
    fileHash: string;
    rows: NormalizedRow[];
  };

  const summary = await commitStatementRows(userId, body.bankAccountId, body.fileName, body.fileHash, body.rows, "pdf", 0);
  return NextResponse.json(summary);
}
