"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DocRow, AuditLogRow, fetchDocumentHistory } from "../../lib/documentTracker";
import { buildHistory } from "../../lib/documentHistory";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "Who touched this document, what did they do, and how long did each step take?"
// Loads only when opened, so a long register doesn't fire one query per row.
export default function DocHistory({ doc }: { doc: DocRow }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    key: string;
    rows: AuditLogRow[];
    error: string | null;
  } | null>(null);

  // Changes whenever the document is updated, so the list refreshes itself
  // after an approval, return, or edit made while the panel is open.
  const version = [
    doc.id,
    doc.status,
    doc.remarks,
    doc.date_reviewed,
    doc.date_approved_by_rd,
    doc.date_signed_by_gov,
    doc.date_approved,
    doc.date_transmitted,
  ].join("|");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchDocumentHistory(doc.id).then((res) => {
      if (!cancelled) setResult({ key: version, ...res });
    });
    return () => {
      cancelled = true;
    };
  }, [open, doc.id, version]);

  const loading = open && result?.key !== version;
  const entries = useMemo(() => (result ? buildHistory(result.rows) : []), [result]);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-xs font-bold uppercase tracking-wider text-[#26357F] hover:underline"
      >
        {open ? "▾ Hide history" : "▸ Show history"}
      </button>

      {open && (
        <div className="mt-3">
          {loading && <p className="text-sm text-[#6B6A63]">Loading history…</p>}

          {!loading && result?.error && (
            <p className="text-sm text-[#9B1C28]">
              History couldn&apos;t be loaded ({result.error}).
            </p>
          )}

          {!loading && !result?.error && entries.length === 0 && (
            <p className="text-sm text-[#6B6A63]">
              No history recorded for this document yet. Changes made from now on will appear here.
            </p>
          )}

          {!loading && entries.length > 0 && (
            <ol className="relative border-l-2 border-[#FFB400]/50 ml-1.5 space-y-4">
              {entries.map((e) => (
                <li key={e.key} className="pl-4 relative">
                  <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#FFB400] ring-4 ring-[#FFB400]/25" />
                  <p className="text-sm font-medium text-[#1B2A44]">{e.headline}</p>
                  <p className="text-xs text-[#6B6A63]">
                    {formatWhen(e.at)}
                    {e.actor ? ` · ${e.actor}` : " · unknown user"}
                    {e.daysSincePrevious != null && e.daysSincePrevious >= 1 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-semibold text-[#A6741B]">
                          {e.daysSincePrevious} day{e.daysSincePrevious === 1 ? "" : "s"} after the previous step
                        </span>
                      </>
                    )}
                  </p>
                  {e.note && (
                    <p
                      className={`mt-1 text-sm text-[#1B2A44] border-l-4 px-3 py-1.5 whitespace-pre-line ${
                        e.noteKind === "note"
                          ? "bg-[#E4ECFA] border-[#26357F]"
                          : "bg-[#FDECEE] border-[#9B1C28]"
                      }`}
                    >
                      {e.note}
                    </p>
                  )}
                  {e.changes.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {e.changes.map((c, i) => (
                        <li key={i} className="text-xs text-[#5B5F66]">
                          <span className="font-semibold">{c.field}:</span> {c.from} → {c.to}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}