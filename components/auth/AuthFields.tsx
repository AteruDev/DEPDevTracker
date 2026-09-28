"use client";

import React, { useId, useState } from "react";

const inputClass =
  "block h-12 w-full rounded border border-[#C5CAD3] bg-white px-3.5 text-[15px] text-[#14213D] " +
  "placeholder:text-[#9AA1AD] outline-none transition-[border-color,box-shadow] " +
  "focus:border-[#0C2D5C] focus:shadow-[0_0_0_3px_rgba(12,45,92,0.16)] " +
  "aria-invalid:border-[#7A1219] aria-invalid:focus:shadow-[0_0_0_3px_rgba(122,18,25,0.16)]";

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#14213D]";

type BaseInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

export function TextField({
  label,
  invalid,
  ...props
}: { label: string; invalid?: boolean } & BaseInputProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} aria-invalid={invalid || undefined} className={inputClass} {...props} />
    </div>
  );
}

export function PasswordField({
  label,
  invalid,
  hint,
  ...props
}: {
  label: string;
  invalid?: boolean;
  hint?: React.ReactNode;
} & Omit<BaseInputProps, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={invalid || undefined}
          className={`${inputClass} pr-16`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 rounded-r px-4 text-[13px] font-medium text-[#0C2D5C] hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0C2D5C]"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint}
    </div>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}

export function PrimaryButton({
  loading,
  loadingLabel,
  children,
  ...props
}: {
  loading?: boolean;
  loadingLabel: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="h-12 w-full rounded bg-[#0C2D5C] text-[15px] font-medium text-white transition-colors hover:bg-[#082044] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0C2D5C] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2.5">
          <Spinner />
          {loadingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function TextButton({
  children,
  ...props
}: { children: React.ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  return (
    <button
      type="button"
      {...props}
      className="rounded text-sm font-medium text-[#0C2D5C] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0C2D5C]"
    >
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded border-l-4 border-[#7A1219] bg-[#F8ECEC] px-3.5 py-3 text-sm leading-relaxed text-[#5E0E14]"
    >
      {children}
    </p>
  );
}

export function SuccessNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded border-l-4 border-[#3C6E4A] bg-[#E9F1EB] px-3.5 py-3 text-sm leading-relaxed text-[#1F4A2D]"
    >
      {children}
    </p>
  );
}
