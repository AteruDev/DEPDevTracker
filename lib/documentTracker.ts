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
  sent: "bg-[#E7EFE9] text-[#3C6E4A]",
  cancelled: "bg-[#F3E6E6] text-[#8B3232]",
  returned: "bg-[#F3E6E6] text-[#8B3232]",
  pending: "bg-[#FBF0DC] text-[#A6741B]",
  none: "bg-[#EDECE6] text-[#6B6A63]",
};

export const STATUS_LABEL: Record<StatusTone, string> = {
  sent: "Sent",
  cancelled: "Cancelled",
  returned: "Returned",
  pending: "In process",
  none: "No status",
};

export function buildTimeline(doc: DocRow) {
  const steps: { label: string; date: string | null }[] = [
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
  return data || [];
}

export async function insertDocument(patch: Partial<DocRow>) {
  const { error } = await supabase.from("document_tracker").insert([patch]);
  return error;
}

export async function updateDocument(id: number, patch: Partial<DocRow>) {
  const { error } = await supabase.from("document_tracker").update(patch).eq("id", id);
  return error;
}

export async function deleteDocument(id: number) {
  const { error } = await supabase.from("document_tracker").delete().eq("id", id);
  return error;
}

// ---------------------------------------------------------------------------
// Categories (Secretariat-managed picklist)
// ---------------------------------------------------------------------------

export type Category = { id: number; name: string };

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories") // <-- CHANGE THIS
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data || [];
}

export async function addCategory(name: string) {
  const { error } = await supabase.from("categories").insert([{ name }]); // <-- CHANGE THIS
  return error;
}

export async function removeCategory(id: number) {
  const { error } = await supabase.from("categories").delete().eq("id", id); // <-- CHANGE THIS
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