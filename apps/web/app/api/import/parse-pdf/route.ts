import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { parsePdfStatement } from "@/lib/ai/parsePdfStatement";
import { createHash } from "node:crypto";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const { rows, warnings } = await parsePdfStatement(buffer.toString("base64"));

  return NextResponse.json({ fileName: file.name, fileHash, rows, warnings });
}
