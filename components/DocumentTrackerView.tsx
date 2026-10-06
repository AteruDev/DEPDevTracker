"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Source_Serif_4, IBM_Plex_Sans } from "next/font/google";
import {
  DocRow,
  fetchDocuments as fetchDocumentsFromDb,
  insertDocument,
  updateDocument,
  today as todayIso,
  archiveDocument,
  isStale,
  staleSeverity,
  daysSinceActivity,
  hasAttachment,
  pipelineStage,
  PipelineStage,
  PIPELINE_STAGE_LABEL,
} from "../lib/documentTracker";
import { supabase } from "../lib/supabase";
import { exportDocumentsToExcel } from "../lib/exportToExcel";
import TrackerHeader from "./tracker/TrackerHeader";
import TrackerToolbar, { ToolbarFilters } from "./tracker/TrackerToolbar";
import TrackerTable from "./tracker/TrackerTable";
import TrackerPagination from "./tracker/TrackerPagination";
import QueueTabs from "./tracker/QueueTabs";
import StatGroups from "./tracker/StatGroups";
import DocumentModal, { DocForm, EMPTY_DOC_FORM, DEFAULT_DRAFTER } from "./tracker/DocumentModal";
import { SortState, SortKey, nextSort, sortDocuments } from "../lib/documentSort";

const displayFont = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

// A named slice of the queue (ARD/RD pages). Tabs show live counts; the page
// only loads documents that belong to at least one tab.
export type QueueTab = {
  key: string;
  label: string;
  filter: (doc: DocRow) => boolean;
  emptyMessage?: string;
  /** Longest-waiting first, plus a "N waiting · longest wait" summary line. */
  oldestFirst?: boolean;
  /** Shows checkboxes and a bulk button on this tab. */
  bulk?: { label: string; field: "date_reviewed" | "date_approved_by_rd"; action: "reviewed" | "approved" };
};

export type DocumentTrackerViewProps = {
  title?: string;
  eyebrow?: string;
  statsMode?: "full" | "count";
  allowManage?: boolean;
  categoryOptions?: string[];
  sectorOptions?: string[];
  drafterOptions?: string[];
  statusOptions?: string[];
  queueFilter?: (doc: DocRow) => boolean;
  queueTabs?: QueueTab[];
  emptyQueueMessage?: string;
  headerExtra?: React.ReactNode;
  renderActions?: (doc: DocRow, refresh: () => void) => React.ReactNode;
};

const EMPTY_FILTERS: ToolbarFilters = {
  search: "",
  category: "All",
  status: "All",
  sector: "All",
  drafter: "All",
  staleOnly: false,
  missingAttachmentOnly: false,
};

export default function DocumentTrackerView({
  title = "Document Tracker",
  eyebrow,
  statsMode = "full",
  allowManage = false,
  categoryOptions = ["Letter", "Memo", "Resolution", "Other"],
  sectorOptions = [],
  drafterOptions = [],
  statusOptions = ["Drafted", "Pending Review", "Returned", "Sent", "Cancelled"],
  queueFilter,
  queueTabs,
  emptyQueueMessage = "No documents recorded yet.",
  headerExtra,
  renderActions,
}: DocumentTrackerViewProps) {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [filters, setFilters] = useState<ToolbarFilters>(EMPTY_FILTERS);

  // Quick filter driven by clicking a number in the stat strip — filters by
  // where a document actually sits in the approval pipeline right now.
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");

  // Narrows "Needs attention" down to the worst offenders (15+ days idle).
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Column sorting (click a table header). null = the default newest-first order.
  const [sort, setSort] = useState<SortState>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocRow | null>(null);
  const [form, setForm] = useState<DocForm>(EMPTY_DOC_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedFromFile, setScannedFromFile] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // Queue tabs (ARD/RD) + bulk selection.
  const [activeTab, setActiveTab] = useState<string>(queueTabs?.[0]?.key ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const activeTabDef = queueTabs?.find((t) => t.key === activeTab) ?? queueTabs?.[0];

  // Default status for new documents: "In process" if it exists in the status list,
  // otherwise the closest open-ended status (never Cancelled / Returned / Sent).
  const defaultStatus = useMemo(
    () =>
      statusOptions.find((st) => /in[\s-]?process/i.test(st)) ??
      statusOptions.find((st) => /draft|pending/i.test(st)) ??
      statusOptions.find((st) => !/cancel|return|sent/i.test(st)) ??
      "In process",
    [statusOptions]
  );

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run once on mount
  }, []);

  async function fetchDocuments() {
    setLoading(true);
    const data = await fetchDocumentsFromDb();
    const list = queueTabs
      ? data.filter((d) => queueTabs.some((t) => t.filter(d)))
      : queueFilter
      ? data.filter(queueFilter)
      : data;
    setDocuments(list);
    setLoading(false);
    return list;
  }

  // After a new document is saved: scroll to it and keep it highlighted for a few
  // seconds so the secretariat can double-check it.
  useEffect(() => {
    if (highlightId == null || loading) return;
    document
      .getElementById(`doc-row-${highlightId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightId(null), 8000);
    return () => clearTimeout(t);
  }, [highlightId, loading]);

  async function handleScanDocument(file: File) {
    setScanning(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        alert("Your session has expired. Please sign in again.");
        return;
      }

      const res = await fetch("/api/extract-document", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });
      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Couldn't read that document. You can still enter it manually.");
        return;
      }

      const e = json.extracted || {};
      setForm({
        document_no: e.document_no || "",
        category: e.category || "Letter",
        status: defaultStatus,
        drafted_by: e.drafted_by || DEFAULT_DRAFTER,
        sector_division: e.sector_division || "",
        email_subject: e.email_subject || "",
        recipients: e.recipients || "",
        email_address: e.email_address || "",
        remarks: e.remarks || "",
        attachments: "",
      });
      setEditingId(null);
      setEditingDoc(null);
      setScannedFromFile(true);
      setShowModal(true);
    } catch {
      alert("Something went wrong scanning that file. You can still enter it manually.");
    } finally {
      setScanning(false);
    }
  }

  async function handleArchive(doc: DocRow) {
    if (
      !confirm(
        `Archive ${doc.document_no}? It will be hidden from the register but can be restored later from the archive.`
      )
    )
      return;
    const error = await archiveDocument(doc);
    if (error) {
      alert("Couldn't archive that document: " + error.message);
      return;
    }
    fetchDocuments();
  }

  function handleOpenEditModal(doc: DocRow) {
    setForm({
      document_no: doc.document_no || "",
      category: doc.category || "Letter",
      status: doc.status || defaultStatus,
      drafted_by: doc.drafted_by || "",
      sector_division: doc.sector_division || "",
      email_subject: doc.email_subject || "",
      recipients: doc.recipients || "",
      email_address: doc.email_address || "",
      remarks: doc.remarks || "",
      attachments: doc.attachments || "",
    });
    setEditingId(doc.id);
    setEditingDoc(doc);
    setScannedFromFile(false);
    setShowModal(true);
  }

  async function handleSubmitDocument(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.document_no.trim() || !form.email_subject.trim()) {
      setFormError("Document No. and Subject are required.");
      return;
    }

    setSaving(true);

    const payload = {
      document_no: form.document_no.trim(),
      category: form.category,
      status: form.status,
      drafted_by: form.drafted_by.trim() || null,
      sector_division: form.sector_division.trim() || null,
      email_subject: form.email_subject.trim(),
      recipients: form.recipients.trim() || null,
      email_address: form.email_address.trim() || null,
      remarks: form.remarks.trim() || null,
      attachments: form.attachments.trim() || null,
    };

    let error;
    if (editingId) {
      error = await updateDocument(editingId, payload, editingDoc, "details_edited");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      error = await insertDocument({ ...payload, date_drafted: today });
    }

    setSaving(false);

    if (error) {
      // Postgres unique-violation code — almost always means the document
      // number was already used, which is by far the most common mistake here.
      if ((error as { code?: string }).code === "23505") {
        setFormError(
          `Document No. "${payload.document_no}" is already in use. Please double-check the number and try again.`
        );
      } else {
        setFormError(error.message);
      }
      return;
    }

    const wasNew = !editingId;
    setForm(EMPTY_DOC_FORM);
    setEditingId(null);
    setEditingDoc(null);
    setShowModal(false);

    const fresh = await fetchDocuments();
    if (wasNew) {
      // Document numbers are unique, so this finds the document we just saved.
      const added = fresh.find((d) => d.document_no === payload.document_no);
      if (added) {
        resetFilters(); // make sure an active filter can't hide it
        setPage(1); // newest documents are on the first page
        setExpandedId(added.id);
        setHighlightId(added.id);
      }
    }
  }

  const tabDocs = useMemo(
    () => (activeTabDef ? documents.filter(activeTabDef.filter) : documents),
    [documents, activeTabDef]
  );

  const tabViews = useMemo(
    () =>
      (queueTabs ?? []).map((t) => ({
        key: t.key,
        label: t.label,
        count: documents.filter(t.filter).length,
      })),
    [queueTabs, documents]
  );

  const queueSummary = useMemo(() => {
    if (!activeTabDef?.oldestFirst) return null;
    if (tabDocs.length === 0) return "Nothing waiting — you're all caught up.";
    const longest = Math.max(...tabDocs.map((d) => daysSinceActivity(d) ?? 0));
    return (
      <>
        <span className="font-semibold text-[#26357F]">{tabDocs.length}</span> waiting
        {longest >= 1 && (
          <>
            {" "}
            · longest wait{" "}
            <span className="font-semibold text-[#A6741B]">
              {longest} day{longest === 1 ? "" : "s"}
            </span>
          </>
        )}
      </>
    );
  }, [activeTabDef, tabDocs]);

  const sectorOpts = useMemo(
    () =>
      sectorOptions.length > 0
        ? sectorOptions
        : Array.from(
            new Set(documents.map((d) => d.sector_division).filter((x): x is string => !!x))
          ).sort(),
    [sectorOptions, documents]
  );

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const matches = tabDocs.filter((d) => {
      if (filters.category !== "All" && d.category !== filters.category) return false;
      if (filters.status !== "All" && d.status?.toLowerCase() !== filters.status.toLowerCase()) return false;
      if (filters.sector !== "All" && d.sector_division !== filters.sector) return false;
      if (filters.drafter !== "All" && d.drafted_by !== filters.drafter) return false;
      if (filters.staleOnly && !isStale(d)) return false;
      if (criticalOnly && staleSeverity(d) !== "critical") return false;
      if (filters.missingAttachmentOnly && hasAttachment(d)) return false;
      if (stageFilter !== "all" && pipelineStage(d) !== stageFilter) return false;

      if (!q) return true;
      const haystack = [d.document_no, d.email_subject, d.recipients, d.drafted_by]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    // A column the user clicked always wins over any automatic ordering.
    if (sort) return sortDocuments(matches, sort);

    // Approver queues: longest-waiting first, so the oldest is always on top.
    if (activeTabDef?.oldestFirst) {
      return [...matches].sort(
        (a, b) => (daysSinceActivity(b) ?? 0) - (daysSinceActivity(a) ?? 0)
      );
    }

    // When looking at what needs chasing, put the longest-idle documents first
    // so the most urgent one is always at the top of the list.
    if (filters.staleOnly || criticalOnly) {
      return [...matches].sort(
        (a, b) => (daysSinceActivity(b) ?? 0) - (daysSinceActivity(a) ?? 0)
      );
    }
    return matches;
  }, [tabDocs, activeTabDef, filters, stageFilter, criticalOnly, sort]);

  // After an approve/return the document leaves the tab; open the next one in
  // line automatically so the approver can work straight down the queue.
  // Only reacts to the list of documents changing, not to typing in filters.
  const visibleIds = filtered.map((d) => d.id);
  const [nav, setNav] = useState<{ docs: DocRow[]; ids: number[] }>({ docs: [], ids: [] });
  if (nav.docs !== documents || nav.ids.join(",") !== visibleIds.join(",")) {
    if (
      queueTabs &&
      nav.docs !== documents &&
      expandedId != null &&
      visibleIds.length > 0 &&
      !visibleIds.includes(expandedId)
    ) {
      const idx = nav.ids.indexOf(expandedId);
      setExpandedId(visibleIds[Math.min(Math.max(idx, 0), visibleIds.length - 1)]);
    }
    setNav({ docs: documents, ids: visibleIds });
  }

  useEffect(() => {
    if (!queueTabs || expandedId == null) return;
    document
      .getElementById(`doc-row-${expandedId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll only when the open row changes
  }, [expandedId]);

  const stats = useMemo(() => {
    const byStage: Record<PipelineStage, number> = {
      cancelled: 0,
      returned: 0,
      awaiting_review: 0,
      awaiting_rd_approval: 0,
      awaiting_signature: 0,
      awaiting_final_approval: 0,
      ready_to_transmit: 0,
      transmitted: 0,
    };
    documents.forEach((d) => {
      byStage[pipelineStage(d)]++;
    });
    const stale = documents.filter(isStale).length;
    const critical = documents.filter((d) => staleSeverity(d) === "critical").length;
    const missingAttachment = documents.filter((d) => !hasAttachment(d)).length;
    return { total: documents.length, stale, critical, missingAttachment, ...byStage };
  }, [documents]);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.category !== "All" ||
    filters.status !== "All" ||
    filters.sector !== "All" ||
    filters.drafter !== "All" ||
    filters.staleOnly ||
    filters.missingAttachmentOnly ||
    criticalOnly ||
    stageFilter !== "all";

  // ---- Pagination (done in the browser; the export still includes every filtered row)
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const pageKey = JSON.stringify([filters, stageFilter, criticalOnly, sort, pageSize, activeTab]);
  const [prevPageKey, setPrevPageKey] = useState(pageKey);
  if (prevPageKey !== pageKey) {
    // Any filter / page-size change sends you back to page 1.
    setPrevPageKey(pageKey);
    setPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedDocuments = filtered.slice(pageStart, pageStart + pageSize);

  const selectedCount = filtered.filter((d) => selectedIds.has(d.id)).length;

  function toggleSelect(id: number) {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      const allOn = pagedDocuments.every((d) => next.has(d.id));
      pagedDocuments.forEach((d) => (allOn ? next.delete(d.id) : next.add(d.id)));
      return next;
    });
  }

  function changeTab(key: string) {
    setActiveTab(key);
    setExpandedId(null);
    setSelectedIds(new Set());
  }

  async function runBulk() {
    const bulk = activeTabDef?.bulk;
    if (!bulk) return;
    const targets = filtered.filter((d) => selectedIds.has(d.id));
    if (targets.length === 0) return;
    const list = targets.map((d) => `• ${d.document_no}`).join("\n");
    if (
      !confirm(
        `${bulk.label} ${targets.length} document${targets.length === 1 ? "" : "s"}?\n\n${list}`
      )
    )
      return;

    setBulkBusy(true);
    const failed: string[] = [];
    for (const d of targets) {
      const error = await updateDocument(
        d.id,
        { [bulk.field]: todayIso() } as Partial<DocRow>,
        d,
        bulk.action
      );
      if (error) failed.push(d.document_no ?? String(d.id));
    }
    setBulkBusy(false);
    setSelectedIds(new Set());
    await fetchDocuments();
    if (failed.length > 0) alert(`Couldn't update: ${failed.join(", ")}`);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportDocumentsToExcel(
        filtered,
        hasActiveFilters ? `Filtered view (${filtered.length} of ${documents.length})` : undefined
      );
    } catch (err) {
      console.error(err);
      alert("Couldn't create the Excel file. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setStageFilter("all");
    setCriticalOnly(false);
  }

  return (
    <main className={`min-h-screen bg-gradient-to-br from-[#E6EFFC] via-[#FFF7E3] to-[#E5F3EA] bg-fixed text-[#1B2A44] ${displayFont.variable} ${bodyFont.variable}`}>
      <style jsx global>{`
        .font-display {
          font-family: var(--font-display), Georgia, serif;
        }
        .font-body {
          font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
        }
        @keyframes rowFlash {
          0%,
          100% {
            background-color: #fff3cf;
          }
          50% {
            background-color: #ffdf85;
          }
        }
        .row-new {
          animation: rowFlash 1.4s ease-in-out 5;
          background-color: #fff3cf;
        }
      `}</style>

      <TrackerHeader
        title={title}
        eyebrow={eyebrow}
        allowManage={allowManage}
        onNewDocument={() => {
          setForm({ ...EMPTY_DOC_FORM, status: defaultStatus });
          setEditingId(null);
          setEditingDoc(null);
          setScannedFromFile(false);
          setShowModal(true);
        }}
        onScanDocument={handleScanDocument}
        scanning={scanning}
      />

      <div className="max-w-7xl mx-auto px-6 pb-12 font-body">
        {headerExtra}

        {queueTabs && (
          <QueueTabs
            tabs={tabViews}
            active={activeTabDef?.key ?? ""}
            onChange={changeTab}
            summary={queueSummary}
          />
        )}

        {statsMode === "full" && (
          <StatGroups
            stats={stats}
            stageFilter={stageFilter}
            onStage={(st) => setStageFilter((cur) => (cur === st ? "all" : st))}
            allActive={
              stageFilter === "all" &&
              !filters.staleOnly &&
              !criticalOnly &&
              !filters.missingAttachmentOnly
            }
            onAll={() => {
              setStageFilter("all");
              setCriticalOnly(false);
              setFilters((f) => ({ ...f, staleOnly: false, missingAttachmentOnly: false }));
            }}
            staleOnly={filters.staleOnly}
            onStale={() => setFilters((f) => ({ ...f, staleOnly: !f.staleOnly }))}
            criticalOnly={criticalOnly}
            onCritical={() => setCriticalOnly((c) => !c)}
            missingOnly={filters.missingAttachmentOnly}
            onMissing={() =>
              setFilters((f) => ({ ...f, missingAttachmentOnly: !f.missingAttachmentOnly }))
            }
          />
        )}

        <TrackerToolbar
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          categoryOptions={categoryOptions}
          statusOptions={statusOptions}
          sectorOptions={sectorOpts}
          drafterOptions={drafterOptions}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />

        {activeTabDef?.bulk && selectedCount > 0 && (
          <div className="sticky top-3 z-20 mb-3 flex items-center justify-between gap-3 bg-[#0C2D5C] text-white rounded-xl shadow-lg px-4 py-3">
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-white/80 hover:text-white"
              >
                Clear
              </button>
              <button
                onClick={runBulk}
                disabled={bulkBusy}
                className="bg-[#FFB400] text-[#0C2D5C] text-sm font-bold py-1.5 px-4 rounded-full hover:bg-[#FFC933] disabled:opacity-60 transition-colors"
              >
                {bulkBusy ? "Saving…" : `${activeTabDef.bulk.label} (${selectedCount})`}
              </button>
            </div>
          </div>
        )}

        {allowManage && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#5B6478]">
              {hasActiveFilters ? (
                <>
                  <span className="font-semibold text-[#26357F]">{filtered.length}</span> of {documents.length} documents match your filters
                </>
              ) : (
                <>
                  <span className="font-semibold text-[#26357F]">{documents.length}</span> documents
                </>
              )}
            </p>
            <button
              onClick={handleExport}
              disabled={exporting || loading || filtered.length === 0}
              className="inline-flex items-center gap-2 bg-[#0B6B3A] text-white text-sm font-semibold py-2 px-4 rounded-full shadow-sm hover:bg-[#08522C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <path d="M7 10l5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
              {exporting ? "Preparing…" : "Export to Excel"}
            </button>
          </div>
        )}

        <div id="doc-table" className="scroll-mt-6">
        <TrackerTable
          documents={pagedDocuments}
          loading={loading}
          highlightId={highlightId}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          emptyMessage={activeTabDef?.emptyMessage ?? emptyQueueMessage}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          allowManage={allowManage}
          renderActions={renderActions}
          onEditDetails={handleOpenEditModal}
          onArchive={handleArchive}
          onRefresh={fetchDocuments}
          sort={sort}
          onSort={(key: SortKey) => setSort((cur) => nextSort(cur, key))}
          selectedIds={activeTabDef?.bulk ? selectedIds : undefined}
          onToggleSelect={activeTabDef?.bulk ? toggleSelect : undefined}
          onToggleAll={activeTabDef?.bulk ? toggleSelectAllOnPage : undefined}
        />
        </div>

        {filtered.length > 0 && (
          <TrackerPagination
            page={currentPage}
            pageSize={pageSize}
            total={filtered.length}
            onPage={(p) => {
              setPage(p);
              document.getElementById("doc-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onPageSize={setPageSize}
          />
        )}

        <footer className="mt-12 flex flex-col items-center text-center">
          <div className="h-1 w-16 rounded-full mb-4 bg-[linear-gradient(90deg,#FFB400_0%,#FFB400_25%,#26357F_25%,#26357F_50%,#0B6B3A_50%,#0B6B3A_75%,#9B1C28_75%,#9B1C28_100%)]" />
          <blockquote className="font-display italic text-base md:text-lg text-[#26357F] max-w-xl">
            &ldquo;Great things are done by a series of small things brought together.&rdquo;
          </blockquote>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-[#B87900]">
            &mdash; Vincent van Gogh
          </p>
        </footer>
      </div>

      {showModal && (
        <DocumentModal
          title={
            editingId
              ? "Edit Document Details"
              : scannedFromFile
              ? "Review Scanned Document"
              : "New Outgoing Document"
          }
          note={
            scannedFromFile
              ? "These fields were filled in automatically from the uploaded file — please double-check them before saving."
              : undefined
          }
          form={form}
          setForm={setForm}
          saving={saving}
          error={formError}
          categoryOptions={categoryOptions}
          sectorOptions={sectorOptions}
          drafterOptions={drafterOptions}
          statusOptions={statusOptions}
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
            setEditingDoc(null);
            setFormError(null);
          }}
          onSubmit={handleSubmitDocument}
        />
      )}
    </main>
  );
}