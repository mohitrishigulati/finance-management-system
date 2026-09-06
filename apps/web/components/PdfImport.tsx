"use client";

import { useState } from "react";

interface Account {
  id: string;
  name: string;
  bucket: string;
}

interface ParsedRow {
  txnDate: string;
  descriptionRaw: string;
  amountPaise: number;
  balanceAfterPaise: number | null;
}

type Stage = { kind: "idle" } | { kind: "loading" } | { kind: "confirm"; data: { fileName: string; fileHash: string; rows: ParsedRow[]; warnings: string[] } } | { kind: "done"; summary: { rowsNew: number; rowsDuplicate: number } } | { kind: "error"; message: string };

/** BLUEPRINT.md §10.1/§12: PDF rows are shown for confirmation before anything is committed — never inserted straight from the model's read. */
export function PdfImport({ accounts }: { accounts: Account[] }) {
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id ?? "");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });

  async function onFileChosen(file: File) {
    setStage({ kind: "loading" });
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/import/parse-pdf", { method: "POST", body: formData });
    if (!res.ok) {
      setStage({ kind: "error", message: "Could not parse this PDF." });
      return;
    }
    const data = await res.json();
    setStage({ kind: "confirm", data });
  }

  async function confirmImport() {
    if (stage.kind !== "confirm") return;
    const res = await fetch("/api/import/commit-parsed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankAccountId, fileName: stage.data.fileName, fileHash: stage.data.fileHash, rows: stage.data.rows }),
    });
    const summary = await res.json();
    setStage({ kind: "done", summary });
  }

  return (
    <div className="border border-slate-200 rounded p-4 flex flex-col gap-3">
      <p className="text-sm font-bold">Or upload a PDF statement</p>
      <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="w-full border border-slate-200 rounded px-3 py-2">
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.bucket})
          </option>
        ))}
      </select>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => e.target.files?.[0] && onFileChosen(e.target.files[0])}
        disabled={stage.kind === "loading"}
      />

      {stage.kind === "loading" && <p className="text-sm text-slate-500">Reading statement…</p>}
      {stage.kind === "error" && <p className="text-sm text-red">{stage.message}</p>}

      {stage.kind === "confirm" && (
        <div className="flex flex-col gap-2">
          {stage.data.warnings.length > 0 && (
            <div className="text-sm text-amber">
              {stage.data.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-left">Description</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {stage.data.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.txnDate}</td>
                    <td>{r.descriptionRaw}</td>
                    <td className="text-right tabular-nums">{(r.amountPaise / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={confirmImport} className="bg-primary text-white rounded py-2 text-sm font-medium">
            Confirm &amp; import {stage.data.rows.length} rows
          </button>
        </div>
      )}

      {stage.kind === "done" && (
        <p className="text-sm">
          Imported {stage.summary.rowsNew} new · {stage.summary.rowsDuplicate} already seen.
        </p>
      )}
    </div>
  );
}
