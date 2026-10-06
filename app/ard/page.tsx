"use client";

import React from "react";
import Link from "next/link";
import DocumentTrackerView, { QueueTab } from "../../components/DocumentTrackerView";
import ReviewActions from "../../components/ReviewActions";
import { DocRow, canUndoArdReview, statusTone } from "../../lib/documentTracker";

function isOpen(doc: DocRow) {
  const tone = statusTone(doc.status);
  return tone !== "cancelled" && tone !== "returned" && tone !== "sent";
}

const TABS: QueueTab[] = [
  {
    key: "pending",
    label: "Needs my review",
    filter: (d) => isOpen(d) && !d.date_reviewed && !!d.date_drafted,
    emptyMessage: "Nothing waiting on your review right now.",
    oldestFirst: true,
    bulk: { label: "Mark reviewed", field: "date_reviewed", action: "reviewed" },
  },
  {
    key: "reviewed",
    label: "Recently reviewed",
    filter: (d) => isOpen(d) && !!d.date_reviewed && canUndoArdReview(d),
    emptyMessage: "No recent reviews you can still undo.",
  },
  {
    key: "returned",
    label: "Returned",
    filter: (d) => statusTone(d.status) === "returned",
    emptyMessage: "No documents are waiting to be resubmitted.",
  },
];

export default function ArdPage() {
  return (
    <DocumentTrackerView
      title="Document Tracker"
      eyebrow="Regional Development Council · Negros Island Region — ARD Review Queue"
      queueTabs={TABS}
      statsMode="count"
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
      renderActions={(doc, refresh) =>
        statusTone(doc.status) === "returned" ? (
          <div className="md:col-span-2 bg-[#FFF0B8] text-[#8A6100] text-sm rounded-xl px-4 py-3">
            Returned for revision — waiting for the Secretariat to resubmit.
          </div>
        ) : (
          <ReviewActions
            doc={doc}
            approveField="date_reviewed"
            approveLabel="Mark reviewed"
            onDone={refresh}
          />
        )
      }
    />
  );
}
