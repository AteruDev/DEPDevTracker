import {
  DocRow,
  statusTone,
  STATUS_LABEL,
  staleSeverity,
  daysSinceActivity,
} from "./documentTracker";

export type SortKey =
  | "document_no"
  | "category"
  | "subject"
  | "recipients"
  | "status"
  | "attention"
  | "transmitted";

export type SortDir = "asc" | "desc";
export type SortState = { key: SortKey; dir: SortDir } | null;

// The direction you most likely want first when you click a column:
// text columns A-Z, but "Attention" worst-first and "Transmitted" newest-first.
export const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  document_no: "asc",
  category: "asc",
  subject: "asc",
  recipients: "asc",
  status: "asc",
  attention: "desc",
  transmitted: "desc",
};

// Click cycle: default direction -> opposite direction -> back to normal order.
export function nextSort(current: SortState, key: SortKey): SortState {
  if (!current || current.key !== key) return { key, dir: DEFAULT_SORT_DIR[key] };
  if (current.dir === DEFAULT_SORT_DIR[key]) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return null;
}

function sortValue(doc: DocRow, key: SortKey): string | number | null {
  switch (key) {
    case "document_no":
      return doc.document_no?.trim() || null;
    case "category":
      return doc.category?.trim() || null;
    case "subject":
      return doc.email_subject?.trim() || null;
    case "recipients":
      return doc.recipients?.trim() || null;
    case "status": {
      const tone = statusTone(doc.status);
      return tone === "none" ? null : STATUS_LABEL[tone];
    }
    case "attention":
      // Only documents that actually show an attention badge have a value.
      return staleSeverity(doc) === "none" ? null : daysSinceActivity(doc);
    case "transmitted":
      return doc.date_transmitted || null;
  }
}

// Blank values always sink to the bottom, in either direction, so sorting by
// "Transmitted" doesn't bury the real dates under a wall of dashes.
export function sortDocuments(docs: DocRow[], sort: SortState): DocRow[] {
  if (!sort) return docs;
  const sign = sort.dir === "asc" ? 1 : -1;

  return [...docs].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * sign;
    return (
      String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * sign
    );
  });
}