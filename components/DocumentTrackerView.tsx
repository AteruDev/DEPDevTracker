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
  pipelineStage,
  PipelineStage,
  PIPELINE_STAGE_LABEL,
} from "../lib/documentTracker";
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
    return { total: documents.length, stale, ...byStage };
  }, [documents]);

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.category !== "All" ||
    filters.status !== "All" ||
    filters.sector !== "All" ||
    filters.drafter !== "All" ||
    filters.staleOnly ||
    stageFilter !== "all";

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setStageFilter("all");
  }

  return (
    <main className={`min-h-screen bg-[#F8F9FA] text-[#1B2A44] ${displayFont.variable} ${bodyFont.variable}`}>
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

        {statsMode === "full" && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8 text-sm">
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
              tone="pending"
              active={stageFilter === "awaiting_review"}
              onClick={() => setStageFilter((s) => (s === "awaiting_review" ? "all" : "awaiting_review"))}
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.awaiting_rd_approval}
              value={stats.awaiting_rd_approval}
              tone="pending"
              active={stageFilter === "awaiting_rd_approval"}
              onClick={() =>
                setStageFilter((s) => (s === "awaiting_rd_approval" ? "all" : "awaiting_rd_approval"))
              }
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.awaiting_signature}
              value={stats.awaiting_signature}
              tone="pending"
              active={stageFilter === "awaiting_signature"}
              onClick={() =>
                setStageFilter((s) => (s === "awaiting_signature" ? "all" : "awaiting_signature"))
              }
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.awaiting_final_approval}
              value={stats.awaiting_final_approval}
              tone="pending"
              active={stageFilter === "awaiting_final_approval"}
              onClick={() =>
                setStageFilter((s) => (s === "awaiting_final_approval" ? "all" : "awaiting_final_approval"))
              }
            />
            <Divider />
            <StatItem
              label={PIPELINE_STAGE_LABEL.ready_to_transmit}
              value={stats.ready_to_transmit}
              tone="pending"
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