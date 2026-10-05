"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "../../lib/auth";

export default function TrackerHeader({
  title,
  eyebrow,
  allowManage,
  onNewDocument,
  onScanDocument,
  scanning,
}: {
  title: string;
  eyebrow?: string;
  allowManage?: boolean;
  onNewDocument?: () => void;
  onScanDocument?: (file: File) => void;
  scanning?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onScanDocument) onScanDocument(file);
    e.target.value = ""; // allow re-selecting the same file later
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="shadow-lg mb-8">
      <div className="h-2 bg-[linear-gradient(90deg,#FFB400_0%,#FFB400_25%,#26357F_25%,#26357F_50%,#0B6B3A_50%,#0B6B3A_75%,#9B1C28_75%,#9B1C28_100%)]" />
      <div className="bg-gradient-to-r from-[#0C2D5C] via-[#173B82] to-[#26357F]">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img src="/logo.png" alt="RDC Logo" className="w-16 h-16 object-contain bg-white rounded-full p-1 shadow-lg ring-2 ring-[#FFB400]" />
            <div>
              <h1 className="font-display text-2xl font-bold text-white leading-tight">
                Regional Development Council · NIR
              </h1>
              <p className="text-sm font-medium text-[#C9D6EE] mt-1">
                {title}
                {eyebrow && <span className="text-[#7F93BD] font-normal mx-1">|</span>} {eyebrow}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {allowManage && (
              <div className="flex items-center gap-3">
                {onScanDocument && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanning}
                      className="text-sm font-medium py-2 px-5 rounded-full border border-white/60 text-white hover:bg-white/15 disabled:opacity-60 transition-all"
                    >
                      {scanning ? "Scanning…" : "📄 Scan Document"}
                    </button>
                  </>
                )}
                <button
                  onClick={onNewDocument}
                  className="bg-[#FFB400] text-[#0C2D5C] text-sm font-bold py-2 px-5 rounded-full hover:bg-[#FFC933] shadow-md transition-all"
                >
                  + New Document
                </button>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="group inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 border border-white/25 rounded-full py-2 pl-4 pr-3.5 backdrop-blur-sm transition-all hover:bg-[#9B1C28] hover:border-[#9B1C28] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#FFB400]/70"
            >
              Sign out
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}