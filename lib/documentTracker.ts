import { supabase } from "./supabase";

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
  deleted_at: string | null;
};

export type StatusTone = "sent" | "cancelled" | "returned" | "pending" | "none";

// ---------------------------------------------------------------------------
// Formatting + status helpers
// ---------------------------------------------------------------------------

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(dateString: string | null) {
  if (!dateString) return null;
  const d = new Date(dateString + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function statusTone(status: string | null): StatusTone {
  if (!status || !status.trim()) return "none";
  const s = status.toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("return") || s.includes("revision")) return "returned";
  if (s.includes("sent")) return "sent";
  return "pending";
}

export const STATUS_STYLES: Record<StatusTone, string> = {
  sent: "bg-[#D6F0DF] text-[#0B6B3A]",
  cancelled: "bg-[#FAD9DC] text-[#9B1C28]",
  returned: "bg-[#FFE0CC] text-[#B4410A]",
  pending: "bg-[#DCE6FB] text-[#26357F]",
  none: "bg-[#ECEEF3] text-[#5B6478]",
};

export const STATUS_LABEL: Record<StatusTone, string> = {
  sent: "Sent",
  cancelled: "Cancelled",
  returned: "Returned",
  pending: "In process",
  none: "No status",
};

// A document is "closed" once it's sent or cancelled — it doesn't need a
// staleness warning even if nothing has happened in a while.
export function isClosed(doc: DocRow): boolean {
  if (doc.date_transmitted) return true; // out the door — nothing left to chase
  const tone = statusTone(doc.status);
  return tone === "sent" || tone === "cancelled";
}

// The most recent date recorded on the document, across every stage —
// whichever happened last. Falls back to created_at if no stage dates exist.
export function lastActivityDate(doc: DocRow): string | null {
  const dates = [
    doc.date_transmitted,
    doc.date_approved,
    doc.date_signed_by_gov,
    doc.date_approved_by_rd,
    doc.date_reviewed,
    doc.date_drafted,
  ].filter((d): d is string => !!d);

  if (dates.length === 0) return doc.created_at ? doc.created_at.slice(0, 10) : null;
  return dates.sort().reverse()[0];
}

// True calendar-day difference between a stored date and "today," independent
// of what time of day it currently is. Using raw millisecond math here would
// make the count drift depending on when in the day you check it.
function calendarDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(then.getTime())) return null;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenMidnight = new Date(then.getFullYear(), then.getMonth(), then.getDate());

  const diffMs = todayMidnight.getTime() - thenMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function daysSinceActivity(doc: DocRow): number | null {
  const last = lastActivityDate(doc);
  return calendarDaysSince(last);
}

export const STALE_THRESHOLD_DAYS = 5;

export type StaleSeverity = "none" | "watch" | "warning" | "critical";

// Tiers: 5-7 days = watch, 8-14 = warning, 15+ = critical.
// Sent/cancelled documents never need attention regardless of age.
export function staleSeverity(doc: DocRow): StaleSeverity {
  if (isClosed(doc)) return "none";
  const days = daysSinceActivity(doc);
  if (days === null) return "none";
  if (days >= 15) return "critical";
  if (days >= 8) return "warning";
  if (days >= STALE_THRESHOLD_DAYS) return "watch";
  return "none";
}

export const STALE_STYLES: Record<StaleSeverity, string> = {
  none: "",
  watch: "bg-[#FFF0B8] text-[#8A6100]",
  warning: "bg-[#FFD9A8] text-[#B35300]",
  critical: "bg-[#FAD0D4] text-[#9B1C28]",
};

export const STALE_LABEL: Record<StaleSeverity, string> = {
  none: "—",
  watch: "Watch",
  warning: "Needs attention",
  critical: "Critical",
};

// Stale = no activity in 5+ days AND the document isn't already done
// (sent/cancelled documents don't need any further action).
export function isStale(doc: DocRow): boolean {
  return staleSeverity(doc) !== "none";
}

// ---------------------------------------------------------------------------
// Approval undo window (ARD/RD get a few days to reverse an approval)
// ---------------------------------------------------------------------------

export const APPROVAL_UNDO_GRACE_DAYS = 3;

export function daysSince(dateStr: string | null): number | null {
  return calendarDaysSince(dateStr);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ARD can undo their review as long as the RD hasn't already acted on it,
// and it's within the grace window.
export function canUndoArdReview(doc: DocRow): boolean {
  if (!doc.date_reviewed) return false;
  if (doc.date_approved_by_rd) return false;
  const days = daysSince(doc.date_reviewed);
  return days !== null && days <= APPROVAL_UNDO_GRACE_DAYS;
}

// RD can undo their approval as long as nothing downstream has happened yet
// (signed, transmitted, or marked sent), and it's within the grace window.
export function canUndoRdApproval(doc: DocRow): boolean {
  if (!doc.date_approved_by_rd) return false;
  if (doc.date_signed_by_gov || doc.date_transmitted) return false;
  if (statusTone(doc.status) === "sent") return false;
  const days = daysSince(doc.date_approved_by_rd);
  return days !== null && days <= APPROVAL_UNDO_GRACE_DAYS;
}

// ---------------------------------------------------------------------------
// Pipeline stage — where a document currently sits in the approval chain.
// Checked from most-advanced backward, because not every document goes
// through the full ARD -> RD -> Gov chain: plenty of simple letters skip
// straight to "date_approved". Checking from the back means a document is
// bucketed by the most advanced milestone it has actually reached, rather
// than assuming everyone takes the same path.
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "cancelled"
  | "returned"
  | "awaiting_review"
  | "awaiting_rd_approval"
  | "awaiting_signature"
  | "awaiting_final_approval"
  | "ready_to_transmit"
  | "transmitted";

export function pipelineStage(doc: DocRow): PipelineStage {
  const tone = statusTone(doc.status);
  if (tone === "cancelled") return "cancelled";
  if (tone === "returned") return "returned";

  if (doc.date_transmitted) return "transmitted";
  if (doc.date_approved) return "ready_to_transmit"; // finally approved — just needs to go out
  if (doc.date_signed_by_gov) return "awaiting_final_approval"; // signed, waiting on final approval
  if (doc.date_approved_by_rd) return "awaiting_signature"; // RD approved, waiting on Gov signature
  if (doc.date_reviewed) return "awaiting_rd_approval"; // ARD reviewed, waiting on RD
  return "awaiting_review"; // nothing yet, waiting on ARD
}

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  cancelled: "Cancelled",
  returned: "Returned",
  awaiting_review: "Needs ARD Review",
  awaiting_rd_approval: "Needs RD Approval",
  awaiting_signature: "Needs Gov Signature",
  awaiting_final_approval: "Needs Final Approval",
  ready_to_transmit: "Ready to Transmit",
  transmitted: "Transmitted",
};

export function buildTimeline(doc: DocRow) {  const steps: { label: string; date: string | null }[] = [
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
// Data access
// ---------------------------------------------------------------------------

export async function fetchDocuments(): Promise<DocRow[]> {
  const { data, error } = await supabase
    .from("document_tracker")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Error fetching documents:",
      error.message || error.details || error.hint || JSON.stringify(error)
    );
    return [];
  }
  return data || [];
}

export async function fetchArchivedDocuments(): Promise<DocRow[]> {
  const { data, error } = await supabase
    .from("document_tracker")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    console.error("Error fetching archived documents:", error);
    return [];
  }
  return data || [];
}

export async function insertDocument(patch: Partial<DocRow>) {
  const { data, error } = await supabase.from("document_tracker").insert([patch]).select().single();
  if (!error && data) {
    await logAudit({
      document_id: data.id,
      document_no: data.document_no,
      action: "created",
    });
  }
  return error;
}

// Updates a document and writes one audit row per field that actually
// changed, so the log reads like a real history rather than one opaque blob.
export async function updateDocument(
  id: number,
  patch: Partial<DocRow>,
  previous?: DocRow | null,
  action: string = "field_updated"
) {
  const { error } = await supabase.from("document_tracker").update(patch).eq("id", id);

  if (!error && previous) {
    const documentNo = previous.document_no;
    const changedFields = Object.keys(patch) as (keyof DocRow)[];
    for (const field of changedFields) {
      const oldValue = previous[field];
      const newValue = (patch as Record<string, unknown>)[field];
      if (oldValue === newValue) continue;
      await logAudit({
        document_id: id,
        document_no: documentNo,
        action,
        field: String(field),
        old_value: oldValue == null ? null : String(oldValue),
        new_value: newValue == null ? null : String(newValue),
      });
    }
  }

  return error;
}

// Soft delete — the record stays in the database, just hidden from the main
// register and excluded from stats/queues, and can be restored later.
export async function archiveDocument(doc: DocRow) {
  const { error } = await supabase
    .from("document_tracker")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", doc.id);

  if (!error) {
    await logAudit({ document_id: doc.id, document_no: doc.document_no, action: "archived" });
  }
  return error;
}

export async function restoreDocument(doc: DocRow) {
  const { error } = await supabase
    .from("document_tracker")
    .update({ deleted_at: null })
    .eq("id", doc.id);

  if (!error) {
    await logAudit({ document_id: doc.id, document_no: doc.document_no, action: "restored" });
  }
  return error;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type AuditLogEntry = {
  document_id: number | null;
  document_no: string | null;
  action: string;
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  actor?: string | null;
};

export async function logAudit(entry: AuditLogEntry) {
  const { error } = await supabase.from("document_tracker_audit_log").insert([entry]);
  if (error) console.error("Failed to write audit log entry:", error);
  return error;
}

export type AuditLogRow = AuditLogEntry & { id: number; created_at: string };

export async function fetchAuditLog(documentId?: number): Promise<AuditLogRow[]> {
  let query = supabase
    .from("document_tracker_audit_log")
    .select("*")
    .order("created_at", { ascending: false });

  if (documentId) query = query.eq("document_id", documentId);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching audit log:", error);
    return [];
  }
  return data || [];
}

// ---------------------------------------------------------------------------
// Categories (Secretariat-managed picklist)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Attachments — real files in Supabase Storage, not just a filename string.
// ---------------------------------------------------------------------------

const ATTACHMENTS_BUCKET = "document-attachments";

export async function uploadAttachment(
  file: File,
  documentNo: string
): Promise<{ url: string | null; error: string | null }> {
  const safeDocNo = (documentNo || "untitled").replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${safeDocNo}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// Parses the free-text "attachments" field, which can be a plain filename
// (legacy entries with nothing to click), a bare URL, or "label — url" (the
// format used when backfilling real links, e.g. from the original Excel
// file's hyperlinked Attachments column).
export function parseAttachment(value: string | null): { label: string; url: string | null } | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  const sepIndex = trimmed.indexOf(" — ");
  if (sepIndex !== -1) {
    const label = trimmed.slice(0, sepIndex).trim();
    const url = trimmed.slice(sepIndex + 3).trim();
    if (isAttachmentUrl(url)) return { label: label || "View attached file", url };
  }

  if (isAttachmentUrl(trimmed)) return { label: "View attached file", url: trimmed };

  return { label: trimmed, url: null };
}

export function hasAttachment(doc: DocRow): boolean {
  return !!doc.attachments && doc.attachments.trim() !== "";
}

export function isAttachmentUrl(value: string | null): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

export type Category = { id: number; name: string };

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories") 
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data || [];
}

export async function addCategory(name: string) {
  const { error } = await supabase.from("categories").insert([{ name }]); 
  return error;
}

export async function removeCategory(id: number) {
  const { error } = await supabase.from("categories").delete().eq("id", id); 
  return error;
}


// ---------------------------------------------------------------------------
// Sector / Division Settings
// ---------------------------------------------------------------------------

export async function fetchSectors(): Promise<Category[]> {
  const { data, error } = await supabase.from("sectors").select("*").order("name");
  if (error) console.error("Error fetching sectors:", error);
  return data || [];
}

export async function addSector(name: string) {
  const { error } = await supabase.from("sectors").insert([{ name }]);
  if (error) console.error("Error adding sector:", error);
}

export async function removeSector(id: number) {
  const { error } = await supabase.from("sectors").delete().eq("id", id);
  if (error) console.error("Error removing sector:", error);
}

// ---------------------------------------------------------------------------
// Drafter Settings
// ---------------------------------------------------------------------------

export async function fetchDrafters(): Promise<Category[]> {
  const { data, error } = await supabase.from("drafters").select("*").order("name");
  if (error) console.error("Error fetching drafters:", error);
  return data || [];
}

export async function addDrafter(name: string) {
  const { error } = await supabase.from("drafters").insert([{ name }]);
  if (error) console.error("Error adding drafter:", error);
}

export async function removeDrafter(id: number) {
  const { error } = await supabase.from("drafters").delete().eq("id", id);
  if (error) console.error("Error removing drafter:", error);
}

// ---------------------------------------------------------------------------
// Status Settings
// ---------------------------------------------------------------------------

export async function fetchStatuses(): Promise<Category[]> {
  const { data, error } = await supabase.from("statuses").select("*").order("name");
  if (error) console.error("Error fetching statuses:", error);
  return data || [];
}

export async function addStatus(name: string) {
  const { error } = await supabase.from("statuses").insert([{ name }]);
  if (error) console.error("Error adding status:", error);
}

export async function removeStatus(id: number) {
  const { error } = await supabase.from("statuses").delete().eq("id", id);
  if (error) console.error("Error removing status:", error);
}