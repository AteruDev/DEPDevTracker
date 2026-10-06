"use client";

import React from "react";
import { StatusTone } from "../../lib/documentTracker";

function SortIcon({ dir }: { dir: "asc" | "desc" | null }) {
  return (
    <svg width="9" height="12" viewBox="0 0 9 12" aria-hidden="true" className="shrink-0">
      <path d="M4.5 0L9 5H0z" fill={dir === "asc" ? "#FFB400" : "currentColor"} opacity={dir === "asc" ? 1 : 0.35} />
      <path d="M4.5 12L0 7h9z" fill={dir === "desc" ? "#FFB400" : "currentColor"} opacity={dir === "desc" ? 1 : 0.35} />
    </svg>
  );
}

export function Th({
  children,
  className = "",
  sortDir,
  onSort,
}: {
  children: React.ReactNode;
  className?: string;
  /** Current sort direction of this column, or null when it isn't the sorted one. */
  sortDir?: "asc" | "desc" | null;
  /** When provided, the header becomes a sort button. */
  onSort?: () => void;
}) {
  const ariaSort = onSort
    ? sortDir === "asc"
      ? "ascending"
      : sortDir === "desc"
      ? "descending"
      : "none"
    : undefined;

  return (
    <th
      aria-sort={ariaSort}
      className={`px-3 py-4 font-semibold text-white text-xs uppercase tracking-[0.08em] whitespace-nowrap ${className}`}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex items-center gap-1.5 uppercase tracking-[0.08em] font-semibold rounded hover:text-[#FFB400] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB400] transition-colors"
        >
          {children}
          <SortIcon dir={sortDir ?? null} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Td({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`px-3 py-3.5 ${className}`} title={title}>
      {children}
    </td>
  );
}

// Stat cards are spaced by the flex gap, so dividers are no longer needed.
export function Divider() {
  return null;
}

export function StatItem({
  label,
  value,
  tone,
  colorClass,
  onClick,
  active,
}: {
  label: string;
  value: number;
  tone?: StatusTone | "warning";
  /** Explicit Tailwind text-color class (e.g. "text-[#4A5FA0]"), overrides `tone`. */
  colorClass?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const toneColor =
    tone === "sent"
      ? "text-[#0B6B3A]"
      : tone === "cancelled"
      ? "text-[#B3202C]"
      : tone === "pending"
      ? "text-[#B87900]"
      : tone === "warning"
      ? "text-[#D97706]"
      : "text-[#26357F]";

  const color = colorClass || toneColor;

  // The card's accent is the text colour itself (border-current / bg-current),
  // so every stat gets a matching colour bar and tinted hover/active state.
  const content = (
    <div
      className={`${color} flex flex-col items-start min-w-[120px] rounded-xl border-l-4 border-current px-4 py-2.5 shadow-sm transition-all ${
        active
          ? "bg-[color-mix(in_srgb,currentColor_12%,white)] ring-2 ring-current shadow-md"
          : "bg-white hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      <span className="font-display text-3xl font-bold leading-none">{value}</span>
      <span className={`mt-1 text-xs ${active ? "font-semibold text-[#1B2A44]" : "font-medium text-[#5B6478]"}`}>
        {label}
      </span>
    </div>
  );

  if (!onClick) return content;

  return (
    <button onClick={onClick} className="cursor-pointer text-left">
      {content}
    </button>
  );
}

export function Field({
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
      <span className="text-xs font-semibold text-[#3A4A78] mb-1.5 block">
        {label} {required && <span className="text-[#9B1C28]"> *</span>}
      </span>
      {children}
    </label>
  );
}