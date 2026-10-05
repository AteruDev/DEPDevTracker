"use client";

import React from "react";
import {
  DocRow,
  formatDate,
  statusTone,
  STATUS_STYLES,
  STATUS_LABEL,
  staleSeverity,
  STALE_STYLES,
  STALE_LABEL,
  daysSinceActivity,
} from "../../lib/documentTracker";
import { Th, Td } from "./ui";
import DocDetail from "./DocDetail";

// Documents added in the last 24 hours get a small "New" tag.
function isRecentlyAdded(doc: DocRow): boolean {
  if (!doc.created_at) return false;
  const t = new Date(doc.created_at).getTime();
  return !Number.isNaN(t) && Date.now() - t < 24 * 60 * 60 * 1000;
}

export default function TrackerTable({
  documents,
  loading,
  highlightId,
  expandedId,
  setExpandedId,
  emptyMessage,
  hasActiveFilters,
  onResetFilters,
  allowManage,
  renderActions,
  onEditDetails,
  onArchive,
  onRefresh,
}: {
  documents: DocRow[];
  loading: boolean;
  highlightId?: number | null;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  emptyMessage: string;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  allowManage?: boolean;
  renderActions?: (doc: DocRow, refresh: () => void) => React.ReactNode;
  onEditDetails?: (doc: DocRow) => void;
  onArchive?: (doc: DocRow) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#DDE5F4] overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-[#E4ECFA] border-b-2 border-[#FFB400] text-left">
            <Th>Doc. No.</Th>
            <Th>Category</Th>
            <Th>Subject</Th>
            <Th>Recipient/s</Th>
            <Th>Status</Th>
            <Th>Attention</Th>
            <Th>Transmitted</Th>
            <Th className="text-right pr-4">Details</Th>
          </tr>
        </thead>
        <tbody>
          {!loading && documents.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[#6B6A63]">
                <p className="font-medium text-[#1B2A44] mb-1">{emptyMessage}</p>
                {hasActiveFilters && (
                  <button onClick={onResetFilters} className="text-[#0C2D5C] hover:underline">
                    Reset filters
                  </button>
                )}
              </td>
            </tr>
          )}

          {!loading &&
            documents.map((doc) => {
              const tone = statusTone(doc.status);
              const isOpen = expandedId === doc.id;
              const severity = staleSeverity(doc);
              const days = daysSinceActivity(doc);

              return (
                <React.Fragment key={doc.id}>
                  <tr
                    id={`doc-row-${doc.id}`}
                    onClick={() => setExpandedId(isOpen ? null : doc.id)}
                    className={`border-b border-[#EEF1F8] even:bg-[#F8FAFE] hover:bg-[#FFF3CF] cursor-pointer transition-colors ${
                      doc.id === highlightId ? "row-new" : ""
                    }`}
                  >
                    <Td
                      className={`font-medium whitespace-nowrap ${
                        doc.id === highlightId ? "border-l-4 border-[#FFB400]" : ""
                      }`}
                    >
                      {doc.document_no}
                      {isRecentlyAdded(doc) && (
                        <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide bg-[#FFB400] text-[#0C2D5C] rounded-full px-2 py-0.5">
                          New
                        </span>
                      )}
                    </Td>
                    <Td className="text-[#5B5F66] whitespace-nowrap">{doc.category || "—"}</Td>
                    <Td className="max-w-[280px] truncate" title={doc.email_subject || ""}>
                      {doc.email_subject}
                    </Td>
                    <Td className="text-[#5B5F66] max-w-[160px] truncate">
                      {doc.recipients || "—"}
                    </Td>
                    <Td>
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[tone]}`}
                      >
                        {tone === "none" ? doc.status ?? STATUS_LABEL.none : STATUS_LABEL[tone]}
                      </span>
                    </Td>
                    <Td>
                      {severity === "none" ? (
                        <span className="text-[#B8B5A9]">—</span>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${STALE_STYLES[severity]}`}
                        >
                          {STALE_LABEL[severity]} · {days}d
                        </span>
                      )}
                    </Td>
                    <Td className="text-[#5B5F66] whitespace-nowrap">
                      {formatDate(doc.date_transmitted) || "—"}
                    </Td>
                    <Td className="text-right pr-4">
                      <span className="text-[#26357F] bg-[#E4ECFA] rounded-full px-3 py-1 text-xs font-semibold">
                        {isOpen ? "Hide" : "View"}
                      </span>
                    </Td>
                  </tr>

                  {isOpen && (
                    <tr className="border-b border-[#EEF1F8] bg-[#F1F6FE]">
                      <td colSpan={8} className="px-6 py-6">
                        <DocDetail
                          doc={doc}
                          renderActions={renderActions}
                          onRefresh={onRefresh}
                          allowManage={allowManage}
                          onEditDetails={onEditDetails}
                          onArchive={onArchive}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}