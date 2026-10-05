import {
  DocRow,
  statusTone,
  pipelineStage,
  PIPELINE_STAGE_LABEL,
  staleSeverity,
  STALE_LABEL,
  daysSinceActivity,
  parseAttachment,
} from "./documentTracker";

const NAVY = "FF0C2D5C";
const GOLD = "FFFFB400";
const ZEBRA = "FFF3F7FE";
const BORDER = "FFD5DEF0";

// Status colours mirror the pills shown in the web table.
const STATUS_FILL: Record<string, { bg: string; fg: string }> = {
  sent: { bg: "FFD6F0DF", fg: "FF0B6B3A" },
  cancelled: { bg: "FFFAD9DC", fg: "FF9B1C28" },
  returned: { bg: "FFFFE0CC", fg: "FFB4410A" },
  pending: { bg: "FFDCE6FB", fg: "FF26357F" },
  none: { bg: "FFECEEF3", fg: "FF5B6478" },
};

// "2026-10-05" -> a real Excel date (so it can be sorted / filtered by date).
function toDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

type Col = { header: string; width: number; wrap?: boolean; date?: boolean; center?: boolean };

const COLUMNS: Col[] = [
  { header: "Doc. No.", width: 18 },
  { header: "Category", width: 14 },
  { header: "Subject", width: 48, wrap: true },
  { header: "Recipient/s", width: 28, wrap: true },
  { header: "Email Address", width: 30, wrap: true },
  { header: "Status", width: 14, center: true },
  { header: "Current Stage", width: 22 },
  { header: "Attention", width: 20, center: true },
  { header: "Sector / Division", width: 22, wrap: true },
  { header: "Drafted By", width: 20 },
  { header: "Date Drafted", width: 14, date: true, center: true },
  { header: "ARD Reviewed", width: 14, date: true, center: true },
  { header: "RD Approved", width: 14, date: true, center: true },
  { header: "Gov. Signed", width: 14, date: true, center: true },
  { header: "Final Approval", width: 14, date: true, center: true },
  { header: "Transmitted", width: 14, date: true, center: true },
  { header: "Attachment", width: 26, wrap: true },
  { header: "Remarks", width: 40, wrap: true },
];

export async function exportDocumentsToExcel(documents: DocRow[], note?: string) {
  // Loaded on demand so the (large) library isn't part of the initial page load.
  const ExcelJS = (await import("exceljs")).default;

  const wb = new ExcelJS.Workbook();
  wb.creator = "RDC NIR Document Tracker";
  wb.created = new Date();
  const ws = wb.addWorksheet("Document Tracker", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = COLUMNS.map((c) => ({ width: c.width }));
  const last = COLUMNS.length;

  // ---- Title block ---------------------------------------------------------
  ws.mergeCells(1, 1, 1, last);
  const title = ws.getCell(1, 1);
  title.value = "Regional Development Council · Negros Island Region";
  title.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  title.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, last);
  const sub = ws.getCell(2, 1);
  sub.value = "Document Tracker — Outgoing Documents Register";
  sub.font = { name: "Calibri", size: 11, bold: true, color: { argb: NAVY } };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CF" } };
  sub.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(2).height = 20;

  ws.mergeCells(3, 1, 3, last);
  const meta = ws.getCell(3, 1);
  const stamp = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  meta.value = `Exported ${stamp}  ·  ${documents.length} document${documents.length === 1 ? "" : "s"}${note ? "  ·  " + note : ""}`;
  meta.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF5B6478" } };
  meta.alignment = { vertical: "middle", indent: 1 };

  // Thin four-colour accent line (gold / navy / green / crimson), like the logo.
  const accent = ["FFFFB400", "FF26357F", "FF0B6B3A", "FF9B1C28"];
  const perColor = Math.ceil(last / 4);
  for (let c = 1; c <= last; c++) {
    ws.getCell(4, c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: accent[Math.min(3, Math.floor((c - 1) / perColor))] },
    };
  }
  ws.getRow(4).height = 5;

  // ---- Header row ----------------------------------------------------------
  const headerRow = ws.getRow(5);
  COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: c.center ? "center" : "left", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: GOLD } } };
  });
  headerRow.height = 26;

  // ---- Data rows -----------------------------------------------------------
  documents.forEach((doc, idx) => {
    const tone = statusTone(doc.status);
    const severity = staleSeverity(doc);
    const days = daysSinceActivity(doc);
    const attachment = parseAttachment(doc.attachments);

    const values: (string | Date | null)[] = [
      doc.document_no,
      doc.category,
      doc.email_subject,
      doc.recipients,
      doc.email_address,
      doc.status,
      PIPELINE_STAGE_LABEL[pipelineStage(doc)],
      severity === "none" ? "" : `${STALE_LABEL[severity]} · ${days}d`,
      doc.sector_division,
      doc.drafted_by,
      toDate(doc.date_drafted),
      toDate(doc.date_reviewed),
      toDate(doc.date_approved_by_rd),
      toDate(doc.date_signed_by_gov),
      toDate(doc.date_approved),
      toDate(doc.date_transmitted),
      attachment ? attachment.label : "",
      doc.remarks,
    ];

    const row = ws.addRow(values);
    row.height = 32;

    COLUMNS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.font = { name: "Calibri", size: 10.5, color: { argb: "FF1B2A44" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: c.center ? "center" : "left",
        wrapText: !!c.wrap,
      };
      if (c.date) cell.numFmt = "dd mmm yyyy";
      if (idx % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      cell.border = {
        bottom: { style: "thin", color: { argb: BORDER } },
        left: i === 0 ? undefined : { style: "hair", color: { argb: BORDER } },
      };
    });

    // Doc number in bold
    row.getCell(1).font = { name: "Calibri", size: 10.5, bold: true, color: { argb: NAVY } };

    // Colour-coded status
    const sc = STATUS_FILL[tone] ?? STATUS_FILL.none;
    const statusCell = row.getCell(6);
    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc.bg } };
    statusCell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: sc.fg } };

    // Attention highlighting
    if (severity !== "none") {
      const att = row.getCell(8);
      const bg = severity === "critical" ? "FFFAD0D4" : severity === "warning" ? "FFFFD9A8" : "FFFFF0B8";
      const fg = severity === "critical" ? "FF9B1C28" : severity === "warning" ? "FFB35300" : "FF8A6100";
      att.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      att.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: fg } };
    }

    // Clickable attachment link
    if (attachment?.url) {
      row.getCell(17).value = { text: attachment.label, hyperlink: attachment.url };
      row.getCell(17).font = { name: "Calibri", size: 10.5, underline: true, color: { argb: "FF26357F" } };
    }
  });

  // Filter buttons on the header row
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: last } };

  // Repeat the header row on every printed page
  ws.pageSetup.printTitlesRow = "5:5";

  // ---- Download ------------------------------------------------------------
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Document-Tracker_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}