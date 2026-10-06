"use client";

import React, { useEffect, useState } from "react";
import {
  DocRow,
  ReviewContext,
  today,
  formatDate,
  addDays,
  updateDocument,
  logAudit,
  fetchReviewContext,
  parseAttachment,
  canUndoArdReview,
  canUndoRdApproval,
  APPROVAL_UNDO_GRACE_DAYS,
} from "../lib/documentTracker";

const RETURN_PRESETS = [
  "Missing or broken document link",
  "Wrong recipient / addressee",
  "Content needs corrections",
  "Incorrect format",
  "Needs more information",
];

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
  const isArd = approveField === "date_reviewed";
  const actionName = isArd ? "reviewed" : "approved";

  const [returning, setReturning] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [ardContext, setArdContext] = useState<ReviewContext | null>(null);

  const doneDate = doc[approveField];
  const canUndo = isArd ? canUndoArdReview(doc) : canUndoRdApproval(doc);
  const attachment = parseAttachment(doc.attachments);

  // The RD should see what the ARD said before deciding.
  useEffect(() => {
    if (isArd) return;
    let cancelled = false;
    fetchReviewContext(doc.id).then((ctx) => {
      if (!cancelled) setArdContext(ctx);
    });
    return () => {
      cancelled = true;
    };
  }, [isArd, doc.id, doc.date_reviewed]);

  async function approve() {
    setBusy(true);
    const error = await updateDocument(
      doc.id,
      { [approveField]: today() } as Partial<DocRow>,
      doc,
      actionName
    );
    if (error) {
      setBusy(false);
      alert("Couldn't save: " + error.message);
      return;
    }
    if (note.trim()) {
      await logAudit({
        document_id: doc.id,
        document_no: doc.document_no,
        action: actionName,
        field: "note",
        new_value: note.trim(),
      });
    }
    setBusy(false);
    setNote("");
    setAddingNote(false);
    onDone();
  }

  async function undo() {
    if (!confirm("Undo this approval? The document will go back to awaiting review.")) return;
    setBusy(true);
    const error = await updateDocument(
      doc.id,
      { [approveField]: null } as Partial<DocRow>,
      doc,
      isArd ? "undo_review" : "undo_approval"
    );
    setBusy(false);
    if (error) {
      alert("Couldn't undo: " + error.message);
      return;
    }
    onDone();
  }

  async function sendBack() {
    if (!remarks.trim()) return;
    setBusy(true);
    const error = await updateDocument(
      doc.id,
      { status: "Returned for revision", remarks: remarks.trim() },
      doc,
      "returned"
    );
    setBusy(false);
    if (error) {
      alert("Couldn't return the document: " + error.message);
      return;
    }
    setReturning(false);
    setRemarks("");
    onDone();
  }

  // Already actioned: only the undo option (inside its grace window).
  if (doneDate) {
    if (!canUndo) return null;
    const deadline = addDays(doneDate, APPROVAL_UNDO_GRACE_DAYS);
    return (
      <div className="md:col-span-2 bg-white border border-[#C9D6EE] rounded-xl shadow-sm p-4">
        <p className="text-sm text-[#1B2A44] mb-3">
          <span className="font-semibold text-[#0B6B3A]">✓ {isArd ? "Reviewed" : "Approved"}</span>{" "}
          on {formatDate(doneDate)}. You can undo this until {formatDate(deadline)}.
        </p>
        <button
          disabled={busy}
          onClick={undo}
          className="text-sm text-[#7A1219] py-2 px-4 border border-[#7A1219] rounded-full hover:bg-[#F3E6E6] disabled:opacity-60 transition-colors"
        >
          {busy ? "Undoing…" : "Undo"}
        </button>
      </div>
    );
  }

  return (
    <div className="md:col-span-2 bg-white border border-[#C9D6EE] rounded-xl shadow-sm p-4 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[#26357F]">
        {isArd ? "Your review" : "Your decision"}
      </p>

      {/* 1. The document itself — what the reviewer needs first. */}
      {attachment?.url ? (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#E4ECFA] text-[#26357F] text-sm font-semibold py-2 px-4 rounded-full hover:bg-[#26357F] hover:text-white transition-colors"
        >
          Open document in SharePoint
          <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <p className="text-sm text-[#8A6100] bg-[#FFF0B8] inline-block px-3 py-1.5 rounded">
          ⚠ No document link attached
          {attachment ? ` (only "${attachment.label}" is recorded)` : ""} — ask the Secretariat
          before {isArd ? "reviewing" : "approving"}.
        </p>
      )}

      {/* 2. What the ARD said (RD only). */}
      {!isArd && ardContext && (
        <div className="bg-[#F1F6FE] border-l-4 border-[#26357F] px-3 py-2 text-sm">
          <p className="text-xs text-[#5B6478]">
            Reviewed by {ardContext.reviewer || "ARD"} on{" "}
            {formatDate(ardContext.at.slice(0, 10))}
          </p>
          {ardContext.note ? (
            <p className="mt-1 text-[#1B2A44] whitespace-pre-line">{ardContext.note}</p>
          ) : (
            <p className="mt-1 text-[#6B6A63] italic">No note from the ARD.</p>
          )}
        </div>
      )}

      {/* 3. Decide. */}
      {!returning ? (
        <div className="space-y-3">
          {addingNote && (
            <div className="max-w-md">
              <label className="text-xs text-[#6B6A63] block mb-1">
                {isArd ? "Note to the RD (optional)" : "Note (optional)"}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                autoFocus
                className="w-full bg-white border border-[#C9D6EE] p-2 text-sm rounded-lg focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={busy}
              onClick={approve}
              className="bg-[#0C2D5C] text-white text-sm font-semibold py-2 px-5 rounded-full hover:bg-[#082044] disabled:opacity-60 transition-colors"
            >
              {busy ? "Saving…" : approveLabel}
            </button>
            <button
              disabled={busy}
              onClick={() => setReturning(true)}
              className="text-sm text-[#7A1219] py-2 px-4 border border-[#7A1219] rounded-full hover:bg-[#F3E6E6] transition-colors"
            >
              Return for revision
            </button>
            {!addingNote && (
              <button
                disabled={busy}
                onClick={() => setAddingNote(true)}
                className="text-sm text-[#26357F] hover:underline"
              >
                + Add a note
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-w-md">
          <label className="text-xs text-[#6B6A63] block">Reason for returning this document</label>
          <div className="flex flex-wrap gap-2">
            {RETURN_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setRemarks((r) => (r.trim() ? `${r.trim()}\n${p}` : p))}
                className="text-xs text-[#26357F] bg-[#E4ECFA] hover:bg-[#26357F] hover:text-white rounded-full px-3 py-1 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            autoFocus
            className="w-full bg-white border border-[#C9D6EE] p-2 text-sm rounded-lg focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
          />
          <div className="flex gap-3">
            <button
              disabled={busy || !remarks.trim()}
              onClick={sendBack}
              className="bg-[#7A1219] text-white text-sm font-semibold py-2 px-5 rounded-full hover:bg-[#5E0E14] disabled:opacity-60 transition-colors"
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
