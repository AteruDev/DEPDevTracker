"use client";

import React from "react";
import Link from "next/link";
import DocumentTrackerView from "../../components/DocumentTrackerView";
import ReviewActions from "../../components/ReviewActions";
import { DocRow, canUndoArdReview } from "../../lib/documentTracker";

// A document stays in the ARD queue while it's awaiting review, AND for a
// few days after being reviewed in case the review needs to be undone.
function isArdQueue(doc: DocRow) {
  const s = (doc.status || "").toLowerCase();
  if (s.includes("cancel") || s.includes("return") || s.includes("sent")) return false;

  if (!doc.date_reviewed) {
    // Not yet reviewed — awaiting action.
    return !!doc.date_drafted;
  }
  // Already reviewed — only keep it visible while undo is still available.
  return canUndoArdReview(doc);
}

export default function ArdPage() {
  return (
    <DocumentTrackerView
      title="Document Tracker"
      eyebrow="Regional Development Council · Negros Island Region — ARD Review Queue"
      queueFilter={isArdQueue}
      statsMode="count"
      emptyQueueMessage="Nothing waiting on your review right now."
            headerExtra={
        <div className="mb-6">
          {/* View switcher (no login yet) */}
          <div className="flex items-center gap-4 p-3 bg-[#FBF0DC] border border-[#A6741B] inline-flex rounded">
            <span className="text-xs font-bold text-[#A6741B] uppercase tracking-wider">Switch view:</span>
            <Link href="/sec" className="text-sm font-medium text-[#0C2D5C] hover:underline">
              Go to Secretariat View
            </Link>
            <Link href="/rd" className="text-sm font-medium text-[#0C2D5C] hover:underline">
              Go to RD View
            </Link>
          </div>
        </div>
      }
      renderActions={(doc, refresh) => (
        <ReviewActions
          doc={doc}
          approveField="date_reviewed"
          approveLabel="Mark reviewed"
          onDone={refresh}
        />
      )}
    />
  );
}
