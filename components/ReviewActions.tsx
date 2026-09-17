"use client";

import React, { useState } from "react";
import { DocRow, today, updateDocument } from "../lib/documentTracker";

export default function ReviewActions({
  doc,
  approveField,
  approveLabel,
  onDone,
}: {
  doc: DocRow;
  approveField: "date_reviewed" | "date_approved_by_rd";
  approveLabel: string;
  onDone: () => void;
}) {
  const [returning, setReturning] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    await updateDocument(doc.id, { [approveField]: today() } as Partial<DocRow>);
    setBusy(false);
    onDone();
  }

  async function sendBack() {
    if (!remarks.trim()) return;
    setBusy(true);
    await updateDocument(doc.id, {
      status: "Returned for revision",
      remarks: remarks.trim(),
    });
    setBusy(false);
    setReturning(false);
    onDone();
  }

  return (
    <div className="mt-5 pt-4 border-t border-[#DDD7C8]">
      {!returning ? (
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            onClick={approve}
            className="bg-[#0A2C6B] text-white text-sm font-medium py-2 px-4 hover:bg-[#08214F] disabled:opacity-60 transition-colors"
          >
            {busy ? "Saving…" : approveLabel}
          </button>
          <button
            disabled={busy}
            onClick={() => setReturning(true)}
            className="text-sm text-[#8B3232] py-2 px-4 border border-[#8B3232] hover:bg-[#F3E6E6] transition-colors"
          >
            Return for revision
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-w-md">
          <label className="text-xs text-[#6B6A63] block">
            Reason for returning this document
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            autoFocus
            className="w-full bg-white border border-[#DDD7C8] p-2 text-sm focus:outline-none focus:border-[#0A2C6B]"
          />
          <div className="flex gap-3">
            <button
              disabled={busy || !remarks.trim()}
              onClick={sendBack}
              className="bg-[#8B3232] text-white text-sm font-medium py-2 px-4 hover:bg-[#722828] disabled:opacity-60 transition-colors"
            >
              {busy ? "Saving…" : "Confirm return"}
            </button>
            <button
              onClick={() => setReturning(false)}
              className="text-sm text-[#6B6A63] py-2 px-4 hover:text-[#1B2A44]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
