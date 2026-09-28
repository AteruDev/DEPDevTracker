"use client";

import React from "react";
import { Field } from "./ui";

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
};

export const EMPTY_DOC_FORM: DocForm = {
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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-[#F7F5EF] max-w-lg w-full border border-[#DDD7C8] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD7C8]">
          <h2 className="font-display text-lg font-semibold text-[#1B2A44]">
            {title || "New Outgoing Document"}
          </h2>
          <button onClick={onClose} className="text-[#6B6A63] hover:text-[#1B2A44] text-xl leading-none">
            ×
          </button>
        </div>

        {note && (
          <p className="mx-6 mt-4 text-xs text-[#A6741B] bg-[#FBF0DC] px-3 py-2">{note}</p>
        )}

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4 font-body">
          <Field label="Document No." required>
            <input
              value={form.document_no}
              onChange={(e) => update("document_no", e.target.value)}
              placeholder="RDC-NIR-2026-09-155"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select value={form.category} onChange={(e) => update("category", e.target.value)} className="input">
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select value={form.status} onChange={(e) => update("status", e.target.value)} className="input">
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Subject" required>
            <textarea
              value={form.email_subject}
              onChange={(e) => update("email_subject", e.target.value)}
              rows={2}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Drafted by">
              {drafterOptions.length > 0 ? (
                <select value={form.drafted_by} onChange={(e) => update("drafted_by", e.target.value)} className="input">
                  <option value="">Select a drafter...</option>
                  {drafterOptions.map((d) => (
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

          <Field label="Recipient/s">
            <input value={form.recipients} onChange={(e) => update("recipients", e.target.value)} className="input" />
          </Field>

          <Field label="Email address">
            <input
              value={form.email_address}
              onChange={(e) => update("email_address", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Remarks">
            <textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} rows={2} className="input" />
          </Field>

          {error && <p className="text-sm text-[#7A1219]">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#6B6A63] px-4 py-2 hover:text-[#1B2A44]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0C2D5C] text-white text-sm font-medium py-2 px-4 hover:bg-[#082044] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save document"}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          background: white;
          border: 1px solid #ddd7c8;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #0C2D5C;
        }
      `}</style>
    </div>
  );
}
