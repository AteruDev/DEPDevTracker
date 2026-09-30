"use client";

import React from "react";
import { StatusTone } from "../../lib/documentTracker";

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium text-[#6B6A63] text-xs ${className}`}>{children}</th>;
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

export function Divider() {
  return <div className="h-4 w-px bg-[#DDD7C8]" />;
}

export function StatItem({
  label,
  value,
  tone,
  onClick,
  active,
}: {
  label: string;
  value: number;
  tone?: StatusTone | "warning";
  onClick?: () => void;
  active?: boolean;
}) {
  const color =
    tone === "sent"
      ? "text-[#3C6E4A]"
      : tone === "cancelled"
      ? "text-[#7A1219]"
      : tone === "pending"
      ? "text-[#A6741B]"
      : tone === "warning"
      ? "text-[#A6741B]"
      : "text-[#1B2A44]";

  const content = (
    <div className="flex items-baseline gap-2">
      <span className={`font-display text-2xl font-semibold ${color}`}>{value}</span>
      <span className={active ? "text-[#1B2A44] font-medium" : "text-[#6B6A63]"}>{label}</span>
    </div>
  );

  if (!onClick) return content;

if (!onClick) return content;

  return (
    <button
      onClick={onClick}
      // Add cursor-pointer right here vvvvvvvvvvvvvv
      className={`pb-1 border-b-2 cursor-pointer transition-colors hover:opacity-80 ${
        active ? "border-[#1B2A44]" : "border-transparent"
      }`}
    >
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