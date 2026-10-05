"use client";

import React from "react";
import { StatusTone } from "../../lib/documentTracker";

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3.5 font-semibold text-[#0C2D5C] text-[11px] uppercase tracking-wider ${className}`}>
      {children}
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
    <td className={`px-4 py-3.5 ${className}`} title={title}>
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
      <span className="text-xs text-[#6B6A63] mb-1 block">
        {label} {required && <span className="text-[#7A1219]"> *</span>}
      </span>
      {children}
    </label>
  );
}
