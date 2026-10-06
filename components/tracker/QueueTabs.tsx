"use client";

import React from "react";

export type QueueTabView = { key: string; label: string; count: number };

export default function QueueTabs({
  tabs,
  active,
  onChange,
  summary,
}: {
  tabs: QueueTabView[];
  active: string;
  onChange: (key: string) => void;
  summary?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(t.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                on
                  ? "bg-[#0C2D5C] text-white shadow-md"
                  : "bg-white text-[#26357F] border border-[#C9D6EE] hover:border-[#26357F]"
              }`}
            >
              {t.label}
              <span
                className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                  on ? "bg-[#FFB400] text-[#0C2D5C]" : "bg-[#E4ECFA] text-[#26357F]"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
      {summary && <p className="mt-3 text-sm text-[#5B6478]">{summary}</p>}
    </div>
  );
}
