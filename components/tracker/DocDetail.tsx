"use client";

import React, { useState } from "react";
import {
  DocRow,
  formatDate,
  buildTimeline,
  staleSeverity,
  STALE_LABEL,
  daysSinceActivity,
  updateDocument,
  parseAttachment,
} from "../../lib/documentTracker";
import DocHistory from "./DocHistory";

export default function DocDetail({
  doc,
  renderActions,
  onRefresh,
  allowManage,
  onEditDetails,
  onArchive,
}: {
  doc: DocRow;
  renderActions?: (doc: DocRow, refresh: () => void) => React.ReactNode;
  onRefresh: () => void;
  allowManage?: boolean;
  onEditDetails?: (doc: DocRow) => void;
  onArchive?: (doc: DocRow) => void;
}) {
  const timeline = buildTimeline(doc);
  const severity = staleSeverity(doc);
  const days = daysSinceActivity(doc);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dates, setDates] = useState({
    date_signed_by_gov: doc.date_signed_by_gov || "",
    date_approved: doc.date_approved || "",
    date_transmitted: doc.date_transmitted || "",
  });

  async function handleSaveDates() {
    setSaving(true);
    const patch = {
      date_signed_by_gov: dates.date_signed_by_gov || null,
      date_approved: dates.date_approved || null,
      date_transmitted: dates.date_transmitted || null,
    };
    const error = await updateDocument(doc.id, patch, doc, "dates_edited");

    setSaving(false);

    if (!error) {
      setIsEditing(false);
      onRefresh();
    } else {
      alert("Error saving dates: " + error.message);
    }
  }

  return (
    <div className="grid md:grid-cols-[1.3fr_1fr] gap-8">
      {renderActions && renderActions(doc, onRefresh)}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#26357F]">Approval timeline</p>

          {allowManage && !isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditDetails && onEditDetails(doc)}
                className="text-xs font-semibold text-[#26357F] bg-[#E4ECFA] hover:bg-[#26357F] hover:text-white rounded-full px-3 py-1.5 transition-colors"
              >
                Edit Details
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-[#26357F] bg-[#E4ECFA] hover:bg-[#26357F] hover:text-white rounded-full px-3 py-1.5 transition-colors"
              >
                Edit Dates
              </button>
              {onArchive && (
                <button
                  onClick={() => onArchive(doc)}
                  className="text-xs font-semibold text-[#9B1C28] bg-[#FDECEE] hover:bg-[#9B1C28] hover:text-white rounded-full px-3 py-1.5 ml-2 transition-colors"
                >
                  Archive
                </button>
              )}
            </div>
          )}
        </div>

        {severity !== "none" && (
          <p className="text-xs text-[#A6741B] bg-[#FBF0DC] inline-block px-2 py-1 mb-3">
            ⚠ {STALE_LABEL[severity]} — no activity in {days} day{days === 1 ? "" : "s"}.
          </p>
        )}

        {isEditing ? (
          <div className="bg-white p-4 border border-[#DDD7C8] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block text-xs text-[#6B6A63]">
                Signed (Gov)
                <input
                  type="date"
                  value={dates.date_signed_by_gov}
                  onChange={(e) => setDates({ ...dates, date_signed_by_gov: e.target.value })}
                  className="mt-1 block w-full border border-[#DDD7C8] p-1.5 rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
                />
              </label>
              <label className="block text-xs text-[#6B6A63]">
                Approved
                <input
                  type="date"
                  value={dates.date_approved}
                  onChange={(e) => setDates({ ...dates, date_approved: e.target.value })}
                  className="mt-1 block w-full border border-[#DDD7C8] p-1.5 rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
                />
              </label>
              <label className="block text-xs text-[#6B6A63]">
                Transmitted
                <input
                  type="date"
                  value={dates.date_transmitted}
                  onChange={(e) => setDates({ ...dates, date_transmitted: e.target.value })}
                  className="mt-1 block w-full border border-[#DDD7C8] p-1.5 rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
                />
              </label>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setIsEditing(false)} className="text-xs text-[#6B6A63] hover:underline">
                Cancel
              </button>
              <button
                onClick={handleSaveDates}
                disabled={saving}
                className="bg-[#0C2D5C] text-white text-sm font-medium py-2 px-4 rounded hover:bg-[#082044] disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving..." : "Save Dates"}
              </button>
            </div>
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-[#6B6A63]">No dates recorded yet.</p>
        ) : (
          <ol className="flex flex-wrap gap-x-6 gap-y-4">
            {timeline.map((step, i) => (
              <li key={step.label} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FFB400] ring-4 ring-[#FFB400]/25" />
                  <div>
                    <p className="text-sm font-medium text-[#1B2A44]">{step.label}</p>
                    <p className="text-xs text-[#6B6A63]">{formatDate(step.date)}</p>
                  </div>
                </div>
                {i < timeline.length - 1 && (
                  <span className="hidden md:inline-block w-6 h-0.5 bg-[#FFB400]/50 ml-4" />
                )}
              </li>
            ))}
          </ol>
        )}

        <DocHistory doc={doc} />
      </div>

      <div className="space-y-3 text-sm">
        <DetailRow label="Sector / Division" value={doc.sector_division} />
        <DetailRow label="Drafted by" value={doc.drafted_by} />
        <DetailRow label="Email address" value={doc.email_address} multiline />
        <AttachmentRow value={doc.attachments} />
        <DetailRow label="Remarks" value={doc.remarks} multiline />
      </div>
    </div>
  );
}

function AttachmentRow({ value }: { value: string | null }) {
  const parsed = parseAttachment(value);
  if (!parsed) return null;
  return (
    <div>
      <p className="text-xs text-[#6B6A63] mb-0.5">Attachments</p>
      {parsed.url ? (
        <a
          href={parsed.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0C2D5C] hover:underline"
        >
          {parsed.label}
        </a>
      ) : (
        <p className="text-[#1B2A44]">{parsed.label}</p>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-[#6B6A63] mb-0.5">{label}</p>
      <p className={`text-[#1B2A44] ${multiline ? "whitespace-pre-line" : ""}`}>{value}</p>
    </div>
  );
}