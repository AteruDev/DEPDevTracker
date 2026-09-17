"use client";

import React, { useState } from "react";
import {
  DocRow,
  insertDocument,
  updateDocument,
  today,
} from "../lib/documentTracker";

type FormState = {
  document_no: string;
  category: string;
  drafted_by: string;
  sector_division: string;
  email_subject: string;
  recipients: string;
  email_address: string;
  remarks: string;
  status: string;
};

function toFormState(doc: DocRow | null): FormState {
  return {
    document_no: doc?.document_no ?? "",
    category: doc?.category ?? "Letter",
    drafted_by: doc?.drafted_by ?? "",
    sector_division: doc?.sector_division ?? "",
    email_subject: doc?.email_subject ?? "",
    recipients: doc?.recipients ?? "",
    email_address: doc?.email_address ?? "",
    remarks: doc?.remarks ?? "",
    status: doc?.status ?? "Drafted",
  };
}

export default function DocumentFormModal({
  doc,
  categories,
  onClose,
  onSaved,
}: {
  doc: DocRow | null; // null = create mode, otherwise edit mode
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(toFormState(doc));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = doc !== null;

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.document_no.trim() || !form.email_subject.trim()) {
      setError("Document No. and Subject are required.");
      return;
    }

    setSaving(true);

    const patch: Partial<DocRow> = {
      document_no: form.document_no.trim(),
      category: form.category,
      drafted_by: form.drafted_by.trim() || null,
      sector_division: form.sector_division.trim() || null,
      email_subject: form.email_subject.trim(),
      recipients: form.recipients.trim() || null,
      email_address: form.email_address.trim() || null,
      remarks: form.remarks.trim() || null,
      status: form.status.trim() || null,
    };

    const err = isEdit
      ? await updateDocument(doc!.id, patch)
      : await insertDocument({ ...patch, date_drafted: today() });

    setSaving(false);

    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-[#F7F6F2] max-w-lg w-full border border-[#DDD7C8] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD7C8]">
          <h2 className="font-display text-lg font-semibold text-[#14213D]">
            {isEdit ? "Edit Document" : "New Outgoing Document"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6B6A63] hover:text-[#14213D] text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 font-body">
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
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="input"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <input
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="input"
              />
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
              <input
                value={form.drafted_by}
                onChange={(e) => update("drafted_by", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Sector / Division">
              <input
                value={form.sector_division}
                onChange={(e) => update("sector_division", e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Recipient/s">
            <input
              value={form.recipients}
              onChange={(e) => update("recipients", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Email address">
            <input
              value={form.email_address}
              onChange={(e) => update("email_address", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Remarks">
            <textarea
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              rows={2}
              className="input"
            />
          </Field>

          {error && <p className="text-sm text-[#8B3232]">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#6B6A63] px-4 py-2 hover:text-[#14213D]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0A2C6B] text-white text-sm font-medium py-2 px-4 hover:bg-[#08214F] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Save document"}
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
          border-color: #0a2c6b;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-[#6B6A63] mb-1 block">
        {label}
        {required && <span className="text-[#8B3232]"> *</span>}
      </span>
      {children}
    </label>
  );
}
