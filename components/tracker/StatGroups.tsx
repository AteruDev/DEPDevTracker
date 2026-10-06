"use client";

import React from "react";
import { PipelineStage } from "../../lib/documentTracker";

export type StatsShape = Record<PipelineStage, number> & {
  total: number;
  stale: number;
  critical: number;
  missingAttachment: number;
};

type CardProps = {
  label: string;
  value: number;
  color: string; // Tailwind text-color class, also drives the accent bar
  active?: boolean;
  onClick: () => void;
  big?: boolean;
};

function Card({ label, value, color, active, onClick, big }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${color} text-left rounded-xl border-l-4 border-current shadow-sm transition-all cursor-pointer ${
        big ? "min-w-[116px] px-3.5 py-2.5" : "min-w-[92px] px-3 py-2"
      } ${
        active
          ? "bg-[color-mix(in_srgb,currentColor_12%,white)] ring-2 ring-current shadow-md"
          : "bg-white hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      <span className={`font-display font-bold leading-none block ${big ? "text-3xl" : "text-xl"}`}>
        {value}
      </span>
      <span
        className={`mt-1 block ${big ? "text-[13px]" : "text-xs"} ${
          active ? "font-semibold text-[#1B2A44]" : "font-medium text-[#5B6478]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

const GROUP_TONE = {
  need: { panel: "bg-[#FBE8B8] border-[#E6C673]", label: "text-[#8A5A00]" },
  wait: { panel: "bg-[#E1E8F5] border-[#C3D0E8]", label: "text-[#26357F]" },
  done: { panel: "bg-[#DCEBDD] border-[#B7D3BB]", label: "text-[#0B6B3A]" },
} as const;

function Group({
  label,
  tone,
  children,
}: {
  label: string;
  tone: keyof typeof GROUP_TONE;
  children: React.ReactNode;
}) {
  const t = GROUP_TONE[tone];
  return (
    <div className={`grow rounded-xl border p-3 ${t.panel}`}>
      <p className={`mb-2 text-[11px] font-bold uppercase tracking-[0.1em] ${t.label}`}>{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-[#0C2D5C] text-white"
          : "bg-white text-[#26357F] border border-[#C9D6EE] hover:border-[#26357F]"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 ${active ? "bg-[#FFB400] text-[#0C2D5C]" : "bg-[#E4ECFA]"}`}>
        {value}
      </span>
    </button>
  );
}

export default function StatGroups({
  stats,
  stageFilter,
  onStage,
  allActive,
  onAll,
  staleOnly,
  onStale,
  criticalOnly,
  onCritical,
  missingOnly,
  onMissing,
}: {
  stats: StatsShape;
  stageFilter: PipelineStage | "all";
  onStage: (s: PipelineStage) => void;
  allActive: boolean;
  onAll: () => void;
  staleOnly: boolean;
  onStale: () => void;
  criticalOnly: boolean;
  onCritical: () => void;
  missingOnly: boolean;
  onMissing: () => void;
}) {
  return (
    <section className="mb-6">
      <div className="flex flex-wrap items-stretch gap-3">
        <Group label="Needs you" tone="need">
          <Card big label="Returned" value={stats.returned} color="text-[#B3202C]"
            active={stageFilter === "returned"} onClick={() => onStage("returned")} />
          <Card big label="Ready to transmit" value={stats.ready_to_transmit} color="text-[#C2410C]"
            active={stageFilter === "ready_to_transmit"} onClick={() => onStage("ready_to_transmit")} />
          <Card big label="Needs final approval" value={stats.awaiting_final_approval} color="text-[#B85C1F]"
            active={stageFilter === "awaiting_final_approval"} onClick={() => onStage("awaiting_final_approval")} />
          <Card big label="Missing link" value={stats.missingAttachment} color="text-[#5B4B8A]"
            active={missingOnly} onClick={onMissing} />
        </Group>

        <Group label="Waiting on others" tone="wait">
          <Card label="ARD review" value={stats.awaiting_review} color="text-[#4A5FA0]"
            active={stageFilter === "awaiting_review"} onClick={() => onStage("awaiting_review")} />
          <Card label="RD approval" value={stats.awaiting_rd_approval} color="text-[#1C7A6E]"
            active={stageFilter === "awaiting_rd_approval"} onClick={() => onStage("awaiting_rd_approval")} />
          <Card label="Gov signature" value={stats.awaiting_signature} color="text-[#B87900]"
            active={stageFilter === "awaiting_signature"} onClick={() => onStage("awaiting_signature")} />
        </Group>

        <Group label="Closed" tone="done">
          <Card label="Transmitted" value={stats.transmitted} color="text-[#0B6B3A]"
            active={stageFilter === "transmitted"} onClick={() => onStage("transmitted")} />
          <Card label="Cancelled" value={stats.cancelled} color="text-[#6B7490]"
            active={stageFilter === "cancelled"} onClick={() => onStage("cancelled")} />
        </Group>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip label="All records" value={stats.total} active={allActive} onClick={onAll} />
        <Chip label="Idle 5+ days" value={stats.stale} active={staleOnly} onClick={onStale} />
        <Chip label="Idle 15+ days" value={stats.critical} active={criticalOnly} onClick={onCritical} />
      </div>
    </section>
  );
}