"use client";

import React from "react";
import Link from "next/link";
import DocumentTrackerView from "../../components/DocumentTrackerView";
import ReviewActions from "../../components/ReviewActions";
import { DocRow } from "../../lib/documentTracker";

// A document is waiting on the ARD once it's been drafted but not yet
// reviewed, and it hasn't already been returned, cancelled, or sent.
function isAwaitingArd(doc: DocRow) {
  if (!doc.date_drafted) return false;
  if (doc.date_reviewed) return false;
  const s = (doc.status || "").toLowerCase();
  if (s.includes("cancel") || s.includes("return") || s.includes("sent")) return false;
  return true;
}

export default function ArdPage() {
  return (
    <DocumentTrackerView
      title="Document Tracker"
      eyebrow="Regional Development Council · Negros Island Region — ARD Review Queue"
      queueFilter={isAwaitingArd}
      statsMode="count"
      emptyQueueMessage="Nothing waiting on your review right now."
            headerExtra={
        <div className="mb-6">
          {/* TEMPORARY DEV SWITCHER */}
          <div className="flex items-center gap-4 p-3 bg-[#FBF0DC] border border-[#A6741B] inline-flex rounded">
            <span className="text-xs font-bold text-[#A6741B] uppercase tracking-wider">Dev Switch:</span>
            <Link href="/sec" className="text-sm font-medium text-[#2A4B7C] hover:underline">
              Go to Secretariat View
            </Link>
            <Link href="/rd" className="text-sm font-medium text-[#2A4B7C] hover:underline">
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
