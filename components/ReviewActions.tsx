"use client";

import React, { useState } from "react";
import {
  DocRow,
  today,
  formatDate,
  addDays,
  updateDocument,
  canUndoArdReview,
  canUndoRdApproval,
  APPROVAL_UNDO_GRACE_DAYS,
} from "../lib/documentTracker";

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

  const doneDate = doc[approveField];
  const canUndo =
    approveField === "date_reviewed" ? canUndoArdReview(doc) : canUndoRdApproval(doc);

  async function approve() {
    setBusy(true);
    await updateDocument(
      doc.id,
      { [approveField]: today() } as Partial<DocRow>,
      doc,
      approveField === "date_reviewed" ? "reviewed" : "approved"
    );
    setBusy(false);
    onDone();
  }

  async function undo() {
    if (!confirm("Undo this approval? The document will go back to awaiting review.")) return;
    setBusy(true);
    await updateDocument(
      doc.id,
      { [approveField]: null } as Partial<DocRow>,
      doc,
      approveField === "date_reviewed" ? "undo_review" : "undo_approval"
    );
    setBusy(false);
    onDone();
  }

  async function sendBack() {
    if (!remarks.trim()) return;
    setBusy(true);
    await updateDocument(
      doc.id,
      { status: "Returned for revision", remarks: remarks.trim() },
      doc,
      "returned"
    );
    setBusy(false);
    setReturning(false);
    onDone();
  }

  // Already actioned: show the undo option (if still within the grace window)
  // instead of the approve/return controls.
  if (doneDate) {
    if (!canUndo) return null;
    const deadline = addDays(doneDate, APPROVAL_UNDO_GRACE_DAYS);
    return (
      <div className="mt-5 pt-4 border-t border-[#DDD7C8]">
        <p className="text-sm text-[#5B5F66] mb-2">
          {approveLabel === "Approve" ? "Approved" : "Reviewed"} on {formatDate(doneDate)}. You
          can undo this until {formatDate(deadline)}.
        </p>
        <button
          disabled={busy}
          onClick={undo}
          className="text-sm text-[#7A1219] py-2 px-4 border border-[#7A1219] hover:bg-[#F3E6E6] disabled:opacity-60 transition-colors"
        >
          {busy ? "Undoing…" : "Undo"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 pt-4 border-t border-[#DDD7C8]">
      {!returning ? (
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            onClick={approve}
            className="bg-[#0C2D5C] text-white text-sm font-medium py-2 px-4 hover:bg-[#082044] disabled:opacity-60 transition-colors"
          >
            {busy ? "Saving…" : approveLabel}
          </button>
          <button
            disabled={busy}
            onClick={() => setReturning(true)}
            className="text-sm text-[#7A1219] py-2 px-4 border border-[#7A1219] hover:bg-[#F3E6E6] transition-colors"
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
            className="w-full bg-white border border-[#DDD7C8] p-2 text-sm focus:outline-none focus:border-[#0C2D5C]"
          />
          <div className="flex gap-3">
            <button
              disabled={busy || !remarks.trim()}
              onClick={sendBack}
              className="bg-[#7A1219] text-white text-sm font-medium py-2 px-4 hover:bg-[#722828] disabled:opacity-60 transition-colors"
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