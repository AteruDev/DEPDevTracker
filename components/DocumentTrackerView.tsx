"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Source_Serif_4, IBM_Plex_Sans } from "next/font/google";
import {
  DocRow,
  fetchDocuments as fetchDocumentsFromDb,
  insertDocument,
  updateDocument,
  archiveDocument,
  isStale,
  hasAttachment,
  pipelineStage,
  PipelineStage,
  PIPELINE_STAGE_LABEL,
} from "../lib/documentTracker";
import { exportDocumentsToExcel } from "../lib/exportToExcel";
import TrackerHeader from "./tracker/TrackerHeader";
import TrackerToolbar, { ToolbarFilters } from "./tracker/TrackerToolbar";
import TrackerTable from "./tracker/TrackerTable";
import DocumentModal, { DocForm, EMPTY_DOC_FORM } from "./tracker/DocumentModal";
import { StatItem, Divider } from "./tracker/ui";

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

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocRow | null>(null);
  const [form, setForm] = useState<DocForm>(EMPTY_DOC_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedFromFile, setScannedFromFile] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run once on mount
  }, []);

  async function fetchDocuments() {
    setLoading(true);
    const data = await fetchDocumentsFromDb();
    setDocuments(queueFilter ? data.filter(queueFilter) : data);
    setLoading(false);
  }

  async function handleScanDocument(file: File) {
    setScanning(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/extract-document", { method: "POST", body });
      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Couldn't read that document. You can still enter it manually.");
        return;
      }

      const e = json.extracted || {};
      setForm({
        document_no: e.document_no || "",
        category: e.category || "Letter",
        status: "Drafted",
        drafted_by: e.drafted_by || "",
        sector_division: e.sector_division || "",
        email_subject: e.email_subject || "",
        recipients: e.recipients || "",
        email_address: e.email_address || "",
        remarks: e.remarks || "",
        attachments: json.attachmentUrl || "",
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
      status: doc.status || "Drafted",
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

    setForm(EMPTY_DOC_FORM);
    setEditingId(null);
    setEditingDoc(null);
    setShowModal(false);
    fetchDocuments();
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return documents.filter((d) => {
      if (filters.category !== "All" && d.category !== filters.category) return false;
      if (filters.status !== "All" && d.status?.toLowerCase() !== filters.status.toLowerCase()) return false;
      if (filters.sector !== "All" && d.sector_division !== filters.sector) return false;
      if (filters.drafter !== "All" && d.drafted_by !== filters.drafter) return false;
      if (filters.staleOnly && !isStale(d)) return false;
      if (filters.missingAttachmentOnly && hasAttachment(d)) return false;
      if (stageFilter !== "all" && pipelineStage(d) !== stageFilter) return false;

      if (!q) return true;
      const haystack = [d.document_no, d.email_subject, d.recipients, d.drafted_by]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [documents, filters, stageFilter]);

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
    const missingAttachment = documents.filter((d) => !hasAttachment(d)).length;
    return { total: documents.length, stale, missingAttachment, ...byStage };
  }, [documents]);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.category !== "All" ||
    filters.status !== "All" ||
    filters.sector !== "All" ||
    filters.drafter !== "All" ||
    filters.staleOnly ||
    filters.missingAttachmentOnly ||
    stageFilter !== "all";

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
      `}</style>

      <TrackerHeader
        title={title}
        eyebrow={eyebrow}
        allowManage={allowManage}
        onNewDocument={() => {
          setForm(EMPTY_DOC_FORM);
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

        {/* --------------------------------------------------------------------- */}
        {/* Find the block starting "{statsMode === "full" && (" in                */}
        {/* DocumentTrackerView.tsx and replace the whole thing with this.         */}
        {/* Only change from before: colorClass added to 6 of the StatItems.       */}
        {/* --------------------------------------------------------------------- */}

        {statsMode === "full" && (
          <div className="flex flex-wrap items-stretch gap-3 mb-8 text-sm">
            <StatItem
              label="Total records"
              value={stats.total}
              active={stageFilter === "all" && !filters.staleOnly}
              onClick={() => {
                setStageFilter("all");
                setFilters((f) => ({ ...f, staleOnly: false }));
              }}
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.awaiting_review}
              value={stats.awaiting_review}
              colorClass="text-[#4A5FA0]"
              active={stageFilter === "awaiting_review"}
              onClick={() => setStageFilter((s) => (s === "awaiting_review" ? "all" : "awaiting_review"))}
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.awaiting_rd_approval}
              value={stats.awaiting_rd_approval}
              colorClass="text-[#1C7A6E]"
              active={stageFilter === "awaiting_rd_approval"}
              onClick={() =>
                setStageFilter((s) => (s === "awaiting_rd_approval" ? "all" : "awaiting_rd_approval"))
              }
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.awaiting_signature}
              value={stats.awaiting_signature}
              colorClass="text-[#D4A339]"
              active={stageFilter === "awaiting_signature"}
              onClick={() =>
                setStageFilter((s) => (s === "awaiting_signature" ? "all" : "awaiting_signature"))
              }
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.awaiting_final_approval}
              value={stats.awaiting_final_approval}
              colorClass="text-[#B85C1F]"
              active={stageFilter === "awaiting_final_approval"}
              onClick={() =>
                setStageFilter((s) => (s === "awaiting_final_approval" ? "all" : "awaiting_final_approval"))
              }
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.ready_to_transmit}
              value={stats.ready_to_transmit}
              colorClass="text-[#C2410C]"
              active={stageFilter === "ready_to_transmit"}
              onClick={() =>
                setStageFilter((s) => (s === "ready_to_transmit" ? "all" : "ready_to_transmit"))
              }
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.transmitted}
              value={stats.transmitted}
              tone="sent"
              active={stageFilter === "transmitted"}
              onClick={() => setStageFilter((s) => (s === "transmitted" ? "all" : "transmitted"))}
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.returned}
              value={stats.returned}
              tone="cancelled"
              active={stageFilter === "returned"}
              onClick={() => setStageFilter((s) => (s === "returned" ? "all" : "returned"))}
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.cancelled}
              value={stats.cancelled}
              tone="cancelled"
              active={stageFilter === "cancelled"}
              onClick={() => setStageFilter((s) => (s === "cancelled" ? "all" : "cancelled"))}
            />
            <Divider />
            <StatItem
              label="Needs attention"
              value={stats.stale}
              tone="warning"
              active={filters.staleOnly}
              onClick={() => setFilters((f) => ({ ...f, staleOnly: !f.staleOnly }))}
            />
            <Divider />
            <StatItem
              label="Missing attachment"
              value={stats.missingAttachment}
              colorClass="text-[#5B4B8A]"
              active={filters.missingAttachmentOnly}
              onClick={() =>
                setFilters((f) => ({ ...f, missingAttachmentOnly: !f.missingAttachmentOnly }))
              }
            />
          </div>
        )}

        <TrackerToolbar
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          categoryOptions={categoryOptions}
          statusOptions={statusOptions}
          sectorOptions={sectorOptions}
          drafterOptions={drafterOptions}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />

        {allowManage && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#5B6478]">
              Showing <span className="font-semibold text-[#26357F]">{filtered.length}</span> of {documents.length} documents
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

        <TrackerTable
          documents={filtered}
          loading={loading}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          emptyMessage={emptyQueueMessage}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          allowManage={allowManage}
          renderActions={renderActions}
          onEditDetails={handleOpenEditModal}
          onArchive={handleArchive}
          onRefresh={fetchDocuments}
        />
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