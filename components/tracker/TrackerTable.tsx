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
import { SortKey, SortState } from "../../lib/documentSort";

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
  sort,
  onSort,
  selectedIds,
  onToggleSelect,
  onToggleAll,
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
  sort?: SortState;
  onSort?: (key: SortKey) => void;
  /** When provided, a checkbox column is shown for bulk actions. */
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleAll?: () => void;
}) {
  const selectable = !!selectedIds && !!onToggleSelect;
  const colCount = selectable ? 8 : 7;
  const allSelected =
    selectable && documents.length > 0 && documents.every((d) => selectedIds!.has(d.id));

  const sortProps = (key: SortKey) =>
    onSort ? { sortDir: sort?.key === key ? sort.dir : null, onSort: () => onSort(key) } : {};

  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#DDE5F4] overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0C2D5C] border-b-4 border-[#FFB400] text-left">
            {selectable && (
              <th className="pl-4 pr-1 py-4 w-8">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={() => onToggleAll && onToggleAll()}
                  className="w-4 h-4 accent-[#FFB400] cursor-pointer"
                />
              </th>
            )}
            <Th {...sortProps("document_no")}>Doc. No.</Th>
            <Th {...sortProps("subject")}>Subject</Th>
            <Th {...sortProps("recipients")} className="hidden min-[1120px]:table-cell">Recipient/s</Th>
            <Th {...sortProps("status")}>Status</Th>
            <Th {...sortProps("attention")}>Attention</Th>
            <Th {...sortProps("transmitted")} className="hidden min-[960px]:table-cell">Transmitted</Th>
            <Th className="text-right pr-4">Details</Th>
          </tr>
        </thead>
        <tbody>
          {!loading && documents.length === 0 && (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center text-[#6B6A63]">
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
                    className={`border-b border-[#EEF1F8] bg-white even:bg-[#F3F7FD] hover:bg-[#FFF3CF] cursor-pointer transition-colors ${
                      doc.id === highlightId ? "row-new" : ""
                    }`}
                  >
                    {selectable && (
                      <td className="pl-4 pr-1 py-3.5 w-8" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${doc.document_no}`}
                          checked={selectedIds!.has(doc.id)}
                          onChange={() => onToggleSelect!(doc.id)}
                          className="w-4 h-4 accent-[#26357F] cursor-pointer"
                        />
                      </td>
                    )}
                    <Td
                      className={`font-semibold text-[#26357F] whitespace-nowrap ${
                        doc.id === highlightId ? "border-l-4 border-[#FFB400]" : ""
                      }`}
                    >
                      <div>
                        {doc.document_no}
                        {isRecentlyAdded(doc) && (
                          <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide bg-[#FFB400] text-[#0C2D5C] rounded-full px-2 py-0.5">
                            New
                          </span>
                        )}
                      </div>
                      {doc.category && (
                        <div className="text-xs font-normal text-[#6B7490]">{doc.category}</div>
                      )}
                    </Td>
                    <Td className="w-full min-w-[220px] font-medium text-[#1B2A44]" title={doc.email_subject || ""}>
                      <div className="line-clamp-2">{doc.email_subject}</div>
                    </Td>
                    <Td className="hidden min-[1120px]:table-cell text-[#5B5F66] max-w-[160px] truncate">
                      {doc.recipients || "—"}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[tone]}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                        {tone === "none" ? doc.status ?? STATUS_LABEL.none : STATUS_LABEL[tone]}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {severity === "none" ? (
                        <span className="text-[#B8B5A9]">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-full ${STALE_STYLES[severity]}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                          {STALE_LABEL[severity]} · {days}d
                        </span>
                      )}
                    </Td>
                    <Td className="hidden min-[960px]:table-cell text-[#5B5F66] whitespace-nowrap">
                      {formatDate(doc.date_transmitted) || "—"}
                    </Td>
                    <Td className="text-right pr-4">
                      <span className="text-[#26357F] bg-[#E4ECFA] hover:bg-[#26357F] hover:text-white rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors">
                        {isOpen ? "Hide" : "View"}
                      </span>
                    </Td>
                  </tr>

                  {isOpen && (
                    <tr className="border-b border-[#EEF1F8] bg-[#F1F6FE]">
                      <td colSpan={colCount} className="px-6 py-6">
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