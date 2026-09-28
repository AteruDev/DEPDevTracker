"use client";

import React from "react";
import Link from "next/link";
import DocumentTrackerView from "../../components/DocumentTrackerView";
import ReviewActions from "../../components/ReviewActions";
import { DocRow, canUndoRdApproval } from "../../lib/documentTracker";

// A document stays in the RD queue while it's awaiting approval, AND for a
// few days after being approved in case the approval needs to be undone.
function isRdQueue(doc: DocRow) {
  const s = (doc.status || "").toLowerCase();
  if (s.includes("cancel") || s.includes("return") || s.includes("sent")) return false;

  if (!doc.date_approved_by_rd) {
    // Not yet approved — awaiting action.
    return !!doc.date_reviewed;
  }
  // Already approved — only keep it visible while undo is still available.
  return canUndoRdApproval(doc);
}

export default function RdPage() {
  return (
    <DocumentTrackerView
      title="Document Tracker"
      eyebrow="Regional Development Council · Negros Island Region — RD Approval Queue"
      queueFilter={isRdQueue}
      statsMode="count"
      emptyQueueMessage="Nothing waiting on your approval right now."
      headerExtra={
        <div className="mb-6">
          {/* View switcher (no login yet) */}
          <div className="flex items-center gap-4 p-3 bg-[#FBF0DC] border border-[#A6741B] inline-flex rounded">
            <span className="text-xs font-bold text-[#A6741B] uppercase tracking-wider">Switch view:</span>
            <Link href="/sec" className="text-sm font-medium text-[#0C2D5C] hover:underline">
              Go to Secretariat View
            </Link>
            <Link href="/ard" className="text-sm font-medium text-[#0C2D5C] hover:underline">
              Go to ARD View
            </Link>
          </div>
        </div>
      }
      renderActions={(doc, refresh) => (
        <ReviewActions
          doc={doc}
          approveField="date_approved_by_rd"
          approveLabel="Approve"
          onDone={refresh}
        />
      )}
    />
  );
}