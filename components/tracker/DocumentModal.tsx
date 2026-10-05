"use client";

import React from "react";
import { Field } from "./ui";
import { parseAttachment } from "../../lib/documentTracker";

export type DocForm = {
  document_no: string;
  category: string;
  status: string;
  drafted_by: string;
  sector_division: string;
  email_subject: string;
  recipients: string;
  email_address: string;
  remarks: string;
  attachments: string;
};

// Pre-selected "Drafted by" for new documents. Change this name to change the default.
export const DEFAULT_DRAFTER = "GKRS";

export const EMPTY_DOC_FORM: DocForm = {
  document_no: "",
  category: "Letter",
  status: "Drafted",
  drafted_by: DEFAULT_DRAFTER,
  sector_division: "",
  email_subject: "",
  recipients: "",
  email_address: "",
  remarks: "",
  attachments: "",
};

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className={`w-1.5 h-4 rounded-full ${color}`} />
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#26357F]">{children}</h3>
    </div>
  );
}

export default function DocumentModal({
  title,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSubmit,
  categoryOptions,
  sectorOptions,
  drafterOptions,
  statusOptions,
  note,
}: {
  title?: string;
  form: DocForm;
  setForm: React.Dispatch<React.SetStateAction<DocForm>>;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  categoryOptions: string[];
  sectorOptions: string[];
  drafterOptions: string[];
  statusOptions: string[];
  note?: string;
}) {
  function update<K extends keyof DocForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Attachments are links only (e.g. SharePoint / Google Drive) — no files are
  // uploaded or stored by this app.
  const attachment = parseAttachment(form.attachments);

  // Make sure the dropdown always contains the form's current value, so it never
  // silently displays a different (first) option than what will be saved.
  const withCurrent = (opts: string[], current: string) =>
    !current || opts.includes(current) ? opts : [current, ...opts];
  const categories = withCurrent(categoryOptions, form.category);
  const statuses = withCurrent(statusOptions, form.status);
  const drafters = withCurrent(drafterOptions, form.drafted_by);

  return (
    <div className="fixed inset-0 bg-[#0C2D5C]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-1.5 shrink-0 bg-[linear-gradient(90deg,#FFB400_0%,#FFB400_25%,#26357F_25%,#26357F_50%,#0B6B3A_50%,#0B6B3A_75%,#9B1C28_75%,#9B1C28_100%)]" />
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0C2D5C] via-[#173B82] to-[#26357F]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[#FFC933] uppercase">
              RDC · NIR Document Tracker
            </p>
            <h2 className="font-display text-lg font-bold text-white leading-tight">
              {title || "New Outgoing Document"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 text-white text-xl leading-none hover:bg-white/25 transition-colors"
          >
            ×
          </button>
        </div>

        {note && (
          <p className="mx-6 mt-4 text-xs text-[#8A6100] bg-[#FFF3CF] border-l-4 border-[#FFB400] rounded-lg px-3 py-2">{note}</p>
        )}

        <form onSubmit={onSubmit} className="px-6 pt-5 pb-0 space-y-4 font-body overflow-y-auto bg-[#FBFCFE]">
          <SectionTitle color="bg-[#FFB400]">Document</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Document No." required>
              <input
                value={form.document_no}
                onChange={(e) => update("document_no", e.target.value)}
                placeholder="RDC-NIR-2026-09-155"
                className="input"
              />
            </Field>

            <Field label="Category">
              <select value={form.category} onChange={(e) => update("category", e.target.value)} className="input">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select value={form.status} onChange={(e) => update("status", e.target.value)} className="input">
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Subject" required>
            <textarea
              value={form.email_subject}
              onChange={(e) => update("email_subject", e.target.value)}
              rows={3}
              className="input"
            />
          </Field>

          <SectionTitle color="bg-[#26357F]">Drafting</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Drafted by">
              {drafterOptions.length > 0 ? (
                <select value={form.drafted_by} onChange={(e) => update("drafted_by", e.target.value)} className="input">
                  <option value="">Select a drafter...</option>
                  {drafters.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.drafted_by}
                  onChange={(e) => update("drafted_by", e.target.value)}
                  className="input"
                  placeholder="Type name..."
                />
              )}
            </Field>

            <Field label="Sector / Division">
              {sectorOptions.length > 0 ? (
                <select
                  value={form.sector_division}
                  onChange={(e) => update("sector_division", e.target.value)}
                  className="input"
                >
                  <option value="">Select a sector...</option>
                  {sectorOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.sector_division}
                  onChange={(e) => update("sector_division", e.target.value)}
                  className="input"
                  placeholder="Type sector..."
                />
              )}
            </Field>
          </div>

          <SectionTitle color="bg-[#0B6B3A]">Recipient &amp; files</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Recipient/s">
              <textarea
                value={form.recipients}
                onChange={(e) => update("recipients", e.target.value)}
                rows={4}
                placeholder={"One recipient per line"}
                className="input"
              />
              <p className="mt-1 text-xs text-[#6B6A63]">Add as many as you need — press Enter for a new line.</p>
            </Field>

            <Field label="Email address/es">
              <textarea
                value={form.email_address}
                onChange={(e) => update("email_address", e.target.value)}
                rows={4}
                placeholder={"One email per line"}
                className="input"
              />
              <p className="mt-1 text-xs text-[#6B6A63]">Separate multiple emails with a new line or comma.</p>
            </Field>
          </div>

          <Field label="Attachment link">
            <input
              value={form.attachments}
              onChange={(e) => update("attachments", e.target.value)}
              placeholder="Paste a SharePoint / Google Drive link"
              inputMode="url"
              autoComplete="off"
              className="input"
            />
            {!form.attachments.trim() ? (
              <p className="mt-1 text-xs text-[#6B6A63]">
                Link to the file in your organization&apos;s drive. Make sure sharing is limited to DEPDev accounts.
              </p>
            ) : attachment?.url ? (
              <p className="mt-1 text-xs text-[#0B6B3A]">
                ✓ Link detected ·{" "}
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  Open to check it
                </a>
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#B87900]">
                This isn&apos;t a web link, so it won&apos;t be clickable. Paste the full link starting with https://
              </p>
            )}
          </Field>

          <Field label="Remarks">
            <textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} rows={3} className="input" />
          </Field>

          {error && (
            <p className="text-sm text-[#9B1C28] bg-[#FDECEE] border border-[#F5C2C7] rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="sticky bottom-0 -mx-6 mt-2 px-6 py-4 flex justify-end gap-3 bg-white/95 backdrop-blur border-t border-[#DDE5F4]">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-[#5B6478] px-5 py-2 rounded-full hover:bg-[#E4ECFA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0B6B3A] text-white text-sm font-semibold py-2 px-6 rounded-full shadow-sm hover:bg-[#08522C] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save document"}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          resize: vertical;
          background: #f8fafe;
          border: 1px solid #c9d6ee;
          border-radius: 0.6rem;
          padding: 0.55rem 0.8rem;
          font-size: 0.875rem;
          color: #1b2a44;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .input::placeholder {
          color: #9aa5bc;
        }
        .input:hover {
          border-color: #9fb3dc;
        }
        .input:focus {
          background: white;
          border-color: #26357f;
          box-shadow: 0 0 0 3px rgba(255, 180, 0, 0.35);
        }
      `}</style>
    </div>
  );
}