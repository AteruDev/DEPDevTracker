"use client";

import React from "react";

export type ToolbarFilters = {
  search: string;
  category: string;
  status: string;
  sector: string;
  drafter: string;
  staleOnly: boolean;
  missingAttachmentOnly: boolean;
};

export default function TrackerToolbar({
  filters,
  onChange,
  categoryOptions,
  statusOptions,
  sectorOptions,
  drafterOptions,
  hasActiveFilters,
  onReset,
}: {
  filters: ToolbarFilters;
  onChange: (patch: Partial<ToolbarFilters>) => void;
  categoryOptions: string[];
  statusOptions: string[];
  sectorOptions: string[];
  drafterOptions: string[];
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[220px]">
        <svg
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9A988F]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
          />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search by doc no., subject, or recipient"
          className="w-full bg-white border border-[#C9D6EE] pl-9 pr-3 py-2 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
        />
      </div>

      <select
        value={filters.category}
        onChange={(e) => onChange({ category: e.target.value })}
        className="bg-white border border-[#C9D6EE] py-2 px-3 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
      >
        <option value="All">All categories</option>
        {categoryOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value })}
        className="bg-white border border-[#C9D6EE] py-2 px-3 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
      >
        <option value="All">All statuses</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {sectorOptions.length > 0 && (
        <select
          value={filters.sector}
          onChange={(e) => onChange({ sector: e.target.value })}
          className="bg-white border border-[#C9D6EE] py-2 px-3 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
        >
          <option value="All">All sectors</option>
          {sectorOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {drafterOptions.length > 0 && (
        <select
          value={filters.drafter}
          onChange={(e) => onChange({ drafter: e.target.value })}
          className="bg-white border border-[#C9D6EE] py-2 px-3 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50"
        >
          <option value="All">All drafters</option>
          {drafterOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}

      {hasActiveFilters && (
        <button onClick={onReset} className="text-sm text-[#0C2D5C] hover:underline">
          Reset filters
        </button>
      )}
    </div>
  );
}