import type { AuditLogRow } from "./documentTracker";

// Turns raw audit-log rows (one row per changed field) into readable history
// entries: "Reviewed by ARD", "Returned for revision", "Details edited", etc.
// Kept free of database imports so it is easy to test on its own.

export type HistoryChange = { field: string; from: string; to: string };

export type HistoryEntry = {
  key: string;
  headline: string;
  actor: string | null;
  at: string; // ISO timestamp of the newest row in the group
  changes: HistoryChange[];
  note: string | null; // e.g. the reason a document was returned, or an approver's note
  noteKind: "return" | "note" | null;
  daysSincePrevious: number | null; // calendar days since the step before this one
};

const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  document_no: "Document no.",
  category: "Category",
  drafted_by: "Drafted by",
  sector_division: "Sector / division",
  email_subject: "Subject",
  recipients: "Recipients",
  email_address: "Email address",
  remarks: "Remarks",
  attachments: "Attachments",
  date_drafted: "Date drafted",
  date_reviewed: "ARD review date",
  date_approved_by_rd: "RD approval date",
  date_signed_by_gov: "Gov signature date",
  date_approved: "Final approval date",
  date_transmitted: "Transmitted date",
};

const ACTION_HEADLINE: Record<string, string> = {
  created: "Document created",
  archived: "Archived",
  restored: "Restored from archive",
  reviewed: "Reviewed by ARD",
  approved: "Approved by RD",
  undo_review: "ARD review undone",
  undo_approval: "RD approval undone",
  returned: "Returned for revision",
  details_edited: "Details edited",
  dates_edited: "Dates edited",
  field_updated: "Field updated",
};

// For these actions the headline already says everything, so listing
// "ARD review date: — → 2026-10-03" underneath would just be noise.
const HEADLINE_ONLY = new Set(["reviewed", "approved", "undo_review", "undo_approval"]);

// Rows written by one save are inserted a few milliseconds apart; anything
// from the same person doing the same action within this window is one event.
const GROUP_WINDOW_MS = 5000;

function titleCase(action: string) {
  const text = action.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function fieldLabel(field: string | null | undefined) {
  if (!field) return "Field";
  return FIELD_LABEL[field] ?? titleCase(field);
}

function formatValue(field: string | null | undefined, value: string | null | undefined) {
  if (value == null || value === "") return "empty";
  if (field && field.startsWith("date_") && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + "T00:00:00");
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    }
  }
  return value;
}

function calendarDaysBetween(laterIso: string, earlierIso: string): number {
  const a = new Date(laterIso);
  const b = new Date(earlierIso);
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((aMid - bMid) / (1000 * 60 * 60 * 24));
}

// `rows` must be newest-first (the order fetchDocumentHistory returns).
export function buildHistory(rows: AuditLogRow[]): HistoryEntry[] {
  type Group = { action: string; actor: string | null; rows: AuditLogRow[] };
  const groups: Group[] = [];

  for (const row of rows) {
    const last = groups[groups.length - 1];
    const sameEvent =
      last &&
      last.action === row.action &&
      (last.actor ?? null) === (row.actor ?? null) &&
      Math.abs(
        new Date(last.rows[last.rows.length - 1].created_at).getTime() -
          new Date(row.created_at).getTime()
      ) <= GROUP_WINDOW_MS;

    if (sameEvent) last.rows.push(row);
    else groups.push({ action: row.action, actor: row.actor ?? null, rows: [row] });
  }

  return groups.map((g, i) => {
    const newest = g.rows[0];
    const older = groups[i + 1];

    const changes: HistoryChange[] = [];
    let note: string | null = null;
    let noteKind: "return" | "note" | null = null;

    // Oldest-first inside a group so lines read in the order they were saved.
    for (const r of [...g.rows].reverse()) {
      if (!r.field || r.field === "deleted_at") continue;
      // Optional note an ARD/RD attached while reviewing or approving.
      if (r.field === "note") {
        note = r.new_value ?? null;
        noteKind = "note";
        continue;
      }
      if (g.action === "returned" && r.field === "remarks") {
        note = r.new_value ?? null;
        noteKind = "return";
        continue;
      }
      if (g.action === "returned" && r.field === "status") continue;
      if (HEADLINE_ONLY.has(g.action)) continue;
      changes.push({
        field: fieldLabel(r.field),
        from: formatValue(r.field, r.old_value),
        to: formatValue(r.field, r.new_value),
      });
    }

    return {
      key: `${newest.id}`,
      headline: ACTION_HEADLINE[g.action] ?? titleCase(g.action),
      actor: g.actor,
      at: newest.created_at,
      changes,
      note,
      noteKind,
      daysSincePrevious: older ? calendarDaysBetween(newest.created_at, older.rows[0].created_at) : null,
    };
  });
}