"use client";

import React from "react";

const PAGE_SIZES = [10, 25, 50, 100];

// 1 … 4 5 6 … 20  (always shows first, last, and the neighbours of the current page)
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export default function TrackerPagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  const base = "h-9 min-w-9 px-3 rounded-full text-sm font-medium transition-colors";
  const idle = "bg-white border border-[#C9D6EE] text-[#26357F] hover:bg-[#E4ECFA]";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
      <div className="flex items-center gap-3 text-xs text-[#5B6478]">
        <span>
          Showing <span className="font-semibold text-[#26357F]">{start}–{end}</span> of {total}
        </span>
        <label className="flex items-center gap-1.5">
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="bg-white border border-[#C9D6EE] rounded-lg py-1 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#FFB400]/50"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1.5" aria-label="Pagination">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className={`${base} ${idle} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            ‹ Prev
          </button>

          {pageList(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-[#9AA5BC]">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${base} ${p === page ? "bg-[#26357F] text-white shadow-sm" : idle}`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            className={`${base} ${idle} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Next ›
          </button>
        </nav>
      )}
    </div>
  );
}