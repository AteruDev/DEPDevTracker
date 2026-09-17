"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Source_Serif_4, IBM_Plex_Sans } from "next/font/google";
import { supabase } from "../lib/supabase";

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocRow = {
  id: number;
  document_no: string | null;
  category: string | null;
  drafted_by: string | null;
  sector_division: string | null;
  email_subject: string | null;
  recipients: string | null;
  email_address: string | null;
  date_drafted: string | null;
  date_reviewed: string | null;
  date_approved_by_rd: string | null;
  date_signed_by_gov: string | null;
  date_approved: string | null;
  date_transmitted: string | null;
  status: string | null;
  remarks: string | null;
  attachments: string | null;
  created_at: string | null;
};

type NewDocForm = {
  document_no: string;
  category: string;
  status: string;
  drafted_by: string;
  sector_division: string;
  email_subject: string;
  recipients: string;
  email_address: string;
  remarks: string;
};

const EMPTY_FORM: NewDocForm = {
  document_no: "",
  category: "Letter",
  status: "Drafted",
  drafted_by: "",
  sector_division: "",
  email_subject: "",
  recipients: "",
  email_address: "",
  remarks: "",
};

// ---------------------------------------------------------------------------
// Props & Helpers
// ---------------------------------------------------------------------------

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

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  const d = new Date(dateString + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

type StatusTone = "sent" | "cancelled" | "pending" | "none";
function statusTone(status: string | null): StatusTone {
  if (!status || !status.trim()) return "none";
  const s = status.toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("sent")) return "sent";
  return "pending";
}

const STATUS_STYLES: Record<StatusTone, string> = {
  sent: "bg-[#E7EFE9] text-[#3C6E4A]",
  cancelled: "bg-[#F3E6E6] text-[#8B3232]",
  pending: "bg-[#FBF0DC] text-[#A6741B]",
  none: "bg-[#EDECE6] text-[#6B6A63]",
};

const STATUS_LABEL: Record<StatusTone, string> = {
  sent: "Sent",
  cancelled: "Cancelled",
  pending: "In process",
  none: "No status",
};

function buildTimeline(doc: DocRow) {
  const steps = [
    { label: "Drafted", date: doc.date_drafted },
    { label: "Reviewed (ARD)", date: doc.date_reviewed },
    { label: "Approved (RD)", date: doc.date_approved_by_rd },
    { label: "Signed (Gov)", date: doc.date_signed_by_gov },
    { label: "Approved", date: doc.date_approved },
    { label: "Transmitted", date: doc.date_transmitted },
  ];
  return steps.filter((s) => s.date);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

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

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
const [statusFilter, setStatusFilter] = useState<string>("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<NewDocForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_tracker")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const filtered = queueFilter ? data.filter(queueFilter) : data;
      setDocuments(filtered);
    }
    setLoading(false);
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
    setShowModal(true);
  }

  async function handleAddDocument(e: React.FormEvent) {
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
      // Update existing record
      const { error: updateError } = await supabase
        .from("document_tracker")
        .update(payload)
        .eq("id", editingId);
      error = updateError;
    } else {
      // Insert new record
      const today = new Date().toISOString().slice(0, 10);
      const { error: insertError } = await supabase
        .from("document_tracker")
        .insert([{ ...payload, date_drafted: today }]);
      error = insertError;
    }

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(false);
    fetchDocuments();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (categoryFilter !== "All" && d.category !== categoryFilter) return false;
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [d.document_no, d.email_subject, d.recipients, d.drafted_by]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [documents, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = documents.length;
    const sent = documents.filter((d) => statusTone(d.status) === "sent").length;
    const cancelled = documents.filter((d) => statusTone(d.status) === "cancelled").length;
    const pending = total - sent - cancelled;
    return { total, sent, pending, cancelled };
  }, [documents]);

  const hasActiveFilters = search.trim() !== "" || categoryFilter !== "All" || statusFilter !== "All";

  function resetFilters() {
    setSearch("");
    setCategoryFilter("All");
    setStatusFilter("All");
  }

  return (
    <main className={`min-h-screen bg-[#F4F4F4] text-[#1B2A44] ${displayFont.variable} ${bodyFont.variable}`}>
      <style jsx global>{`
        .font-display { font-family: var(--font-display), Georgia, serif; }
        .font-body { font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif; }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 py-10 font-body">
        <header className="mb-8">
          <p className="text-xs tracking-wide text-[#6B6A63] mb-1">{eyebrow}</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="font-display text-3xl font-semibold text-[#1B2A44]">{title}</h1>
            {allowManage && (
              <button
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setEditingId(null);
                  setShowModal(true);
                }}
                className="bg-[#2A4B7C] text-white text-sm font-medium py-2 px-4 hover:bg-[#20395F] transition-colors"
              >
                + New Document
              </button>
            )}
          </div>
          <div className="h-[2px] bg-[#9C7A2E] mt-4" />
        </header>

        {headerExtra}

        {statsMode === "full" && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mb-8 text-sm">
            <StatItem label="Total records" value={stats.total} />
            <Divider />
            <StatItem label="Sent" value={stats.sent} tone="sent" />
            <Divider />
            <StatItem label="In process" value={stats.pending} tone="pending" />
            <Divider />
            <StatItem label="Cancelled" value={stats.cancelled} tone="cancelled" />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9A988F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by doc no., subject, or recipient" className="w-full bg-white border border-[#DDD7C8] pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#2A4B7C]" />
          </div>

          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)} 
            className="bg-white border border-[#DDD7C8] py-2 px-3 text-sm focus:outline-none focus:border-[#2A4B7C]"
          >
            <option value="All">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="bg-white border border-[#DDD7C8] py-2 px-3 text-sm focus:outline-none focus:border-[#2A4B7C]"
          >
            <option value="All">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-sm text-[#2A4B7C] hover:underline">Reset filters</button>
          )}
        </div>

        {/* Register table */}
        <div className="bg-white border border-[#DDD7C8] overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#DDD7C8] text-left">
                <Th>Doc. No.</Th>
                <Th>Category</Th>
                <Th>Subject</Th>
                <Th>Recipient/s</Th>
                <Th>Status</Th>
                <Th>Transmitted</Th>
                <Th className="text-right pr-4">Details</Th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#6B6A63]">
                    <p className="font-medium text-[#1B2A44] mb-1">{emptyQueueMessage}</p>
                    {hasActiveFilters && (
                      <button onClick={resetFilters} className="text-[#2A4B7C] hover:underline">Reset filters</button>
                    )}
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((doc) => {
                  const tone = statusTone(doc.status);
                  const isOpen = expandedId === doc.id;
                  return (
                    <React.Fragment key={doc.id}>
                      <tr onClick={() => setExpandedId(isOpen ? null : doc.id)} className="border-b border-[#EDECE6] hover:bg-[#FAF9F5] cursor-pointer transition-colors">
                        <Td className="font-medium whitespace-nowrap">{doc.document_no}</Td>
                        <Td className="text-[#5B5F66] whitespace-nowrap">{doc.category || "—"}</Td>
                        <Td className="max-w-[280px] truncate" title={doc.email_subject || ""}>{doc.email_subject}</Td>
                        <Td className="text-[#5B5F66] max-w-[160px] truncate">{doc.recipients || "—"}</Td>
                        <Td>
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[tone]}`}>
                            {tone === "none" ? doc.status ?? STATUS_LABEL.none : STATUS_LABEL[tone]}
                          </span>
                        </Td>
                        <Td className="text-[#5B5F66] whitespace-nowrap">{formatDate(doc.date_transmitted) || "—"}</Td>
                        <Td className="text-right pr-4">
                          <span className="text-[#2A4B7C] text-xs font-medium">{isOpen ? "Hide" : "View"}</span>
                        </Td>
                      </tr>

                      {isOpen && (
                        <tr className="border-b border-[#EDECE6] bg-[#FAF9F5]">
                          <td colSpan={7} className="px-6 py-6">
                            <DocDetail 
                              doc={doc} 
                              renderActions={renderActions} 
                              onRefresh={fetchDocuments} 
                              allowManage={allowManage} 
                              onEditDetails={handleOpenEditModal}
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
      </div>

      {showModal && (
        <NewDocumentModal
          title={editingId ? "Edit Document Details" : "New Outgoing Document"}
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
            setFormError(null); 
          }}
          onSubmit={handleAddDocument}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium text-[#6B6A63] text-xs ${className}`}>{children}</th>;
}

function Td({ 
  children, 
  className = "", 
  title 
}: { 
  children: React.ReactNode; 
  className?: string;
  title?: string;
}) {
  return (
    <td className={`px-4 py-3.5 ${className}`} title={title}>
      {children}
    </td>
  );
}
function Divider() { return <div className="h-4 w-px bg-[#DDD7C8]" />; }

function StatItem({ label, value, tone }: { label: string; value: number; tone?: StatusTone }) {
  const color = tone === "sent" ? "text-[#3C6E4A]" : tone === "cancelled" ? "text-[#8B3232]" : tone === "pending" ? "text-[#A6741B]" : "text-[#1B2A44]";
  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-display text-2xl font-semibold ${color}`}>{value}</span>
      <span className="text-[#6B6A63]">{label}</span>
    </div>
  );
}

function DocDetail({
  doc,
  renderActions,
  onRefresh,
  allowManage,
  onEditDetails,
}: {
  doc: DocRow;
  renderActions?: any;
  onRefresh: () => void;
  allowManage?: boolean;
  onEditDetails?: (doc: DocRow) => void;
}) {
  const timeline = buildTimeline(doc);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dates, setDates] = useState({
    date_signed_by_gov: doc.date_signed_by_gov || "",
    date_approved: doc.date_approved || "",
    date_transmitted: doc.date_transmitted || "",
  });

  async function handleSaveDates() {
    setSaving(true);
    const { error } = await supabase
      .from("document_tracker")
      .update({
        date_signed_by_gov: dates.date_signed_by_gov || null,
        date_approved: dates.date_approved || null,
        date_transmitted: dates.date_transmitted || null,
      })
      .eq("id", doc.id);

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
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-[#6B6A63]">Approval timeline</p>
          
          {/* RD & ARD One-Click Actions */}
          {renderActions && renderActions(doc, onRefresh)}

          {allowManage && !isEditing && (
            <div className="flex gap-4">
              <button
                onClick={() => onEditDetails && onEditDetails(doc)}
                className="text-xs font-medium text-[#2A4B7C] hover:underline"
              >
                Edit Details
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-medium text-[#2A4B7C] hover:underline"
              >
                Edit Dates
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="bg-white p-4 border border-[#DDD7C8] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block text-xs text-[#6B6A63]">
                Signed (Gov)
                <input
                  type="date"
                  value={dates.date_signed_by_gov}
                  onChange={(e) => setDates({ ...dates, date_signed_by_gov: e.target.value })}
                  className="mt-1 block w-full border border-[#DDD7C8] p-1.5 focus:outline-none focus:border-[#2A4B7C]"
                />
              </label>
              <label className="block text-xs text-[#6B6A63]">
                Approved
                <input
                  type="date"
                  value={dates.date_approved}
                  onChange={(e) => setDates({ ...dates, date_approved: e.target.value })}
                  className="mt-1 block w-full border border-[#DDD7C8] p-1.5 focus:outline-none focus:border-[#2A4B7C]"
                />
              </label>
              <label className="block text-xs text-[#6B6A63]">
                Transmitted
                <input
                  type="date"
                  value={dates.date_transmitted}
                  onChange={(e) => setDates({ ...dates, date_transmitted: e.target.value })}
                  className="mt-1 block w-full border border-[#DDD7C8] p-1.5 focus:outline-none focus:border-[#2A4B7C]"
                />
              </label>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-[#6B6A63] hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDates}
                disabled={saving}
                className="bg-[#2A4B7C] text-white text-xs px-3 py-1.5 hover:bg-[#20395F] disabled:opacity-60 transition-colors"
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
                  <span className="w-2 h-2 rounded-full bg-[#9C7A2E]" />
                  <div>
                    <p className="text-sm font-medium text-[#1B2A44]">{step.label}</p>
                    <p className="text-xs text-[#6B6A63]">{formatDate(step.date)}</p>
                  </div>
                </div>
                {i < timeline.length - 1 && (
                  <span className="hidden md:inline-block w-6 h-px bg-[#DDD7C8] ml-4" />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <DetailRow label="Sector / Division" value={doc.sector_division} />
        <DetailRow label="Drafted by" value={doc.drafted_by} />
        <DetailRow label="Email address" value={doc.email_address} multiline />
        <DetailRow label="Attachments" value={doc.attachments} />
        <DetailRow label="Remarks" value={doc.remarks} multiline />
      </div>
    </div>
  );
}

function DetailRow({ label, value, multiline = false }: { label: string; value: string | null; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-[#6B6A63] mb-0.5">{label}</p>
      <p className={`text-[#1B2A44] ${multiline ? "whitespace-pre-line" : ""}`}>{value}</p>
    </div>
  );
}

function NewDocumentModal({
  title, form, setForm, saving, error, onClose, onSubmit,
  categoryOptions, sectorOptions, drafterOptions, statusOptions
}: {
  title?: string; form: NewDocForm; setForm: React.Dispatch<React.SetStateAction<NewDocForm>>;
  saving: boolean; error: string | null; onClose: () => void; onSubmit: (e: React.FormEvent) => void;
  categoryOptions: string[]; sectorOptions: string[]; drafterOptions: string[]; statusOptions: string[];
}) {
  function update<K extends keyof NewDocForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-[#F7F5EF] max-w-lg w-full border border-[#DDD7C8] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD7C8]">
          <h2 className="font-display text-lg font-semibold text-[#1B2A44]">{title || "New Outgoing Document"}</h2>
          <button onClick={onClose} className="text-[#6B6A63] hover:text-[#1B2A44] text-xl leading-none">×</button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4 font-body">
          <Field label="Document No." required>
            <input value={form.document_no} onChange={(e) => update("document_no", e.target.value)} placeholder="RDC-NIR-2026-09-155" className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select value={form.category} onChange={(e) => update("category", e.target.value)} className="input">
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            
            <Field label="Status">
              <select value={form.status} onChange={(e) => update("status", e.target.value)} className="input">
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Subject" required>
            <textarea value={form.email_subject} onChange={(e) => update("email_subject", e.target.value)} rows={2} className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Drafted by">
              {drafterOptions.length > 0 ? (
                <select value={form.drafted_by} onChange={(e) => update("drafted_by", e.target.value)} className="input">
                  <option value="">Select a drafter...</option>
                  {drafterOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input value={form.drafted_by} onChange={(e) => update("drafted_by", e.target.value)} className="input" placeholder="Type name..." />
              )}
            </Field>

            <Field label="Sector / Division">
              {sectorOptions.length > 0 ? (
                <select value={form.sector_division} onChange={(e) => update("sector_division", e.target.value)} className="input">
                  <option value="">Select a sector...</option>
                  {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={form.sector_division} onChange={(e) => update("sector_division", e.target.value)} className="input" placeholder="Type sector..." />
              )}
            </Field>
          </div>

          <Field label="Recipient/s">
            <input value={form.recipients} onChange={(e) => update("recipients", e.target.value)} className="input" />
          </Field>

          <Field label="Email address">
            <input value={form.email_address} onChange={(e) => update("email_address", e.target.value)} className="input" />
          </Field>

          <Field label="Remarks">
            <textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} rows={2} className="input" />
          </Field>

          {error && <p className="text-sm text-[#8B3232]">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-sm text-[#6B6A63] px-4 py-2 hover:text-[#1B2A44]">Cancel</button>
            <button type="submit" disabled={saving} className="bg-[#2A4B7C] text-white text-sm font-medium py-2 px-4 hover:bg-[#20395F] disabled:opacity-60 transition-colors">
              {saving ? "Saving…" : "Save document"}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .input { width: 100%; background: white; border: 1px solid #DDD7C8; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #2A4B7C; }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[#6B6A63] mb-1 block">
        {label} {required && <span className="text-[#8B3232]"> *</span>}
      </span>
      {children}
    </label>
  );
}