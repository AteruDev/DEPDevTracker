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
    <div className="bg-white border-t-4 border-[#0C2D5C] shadow-sm mb-8">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img src="/logo.png" alt="RDC Logo" className="w-16 h-16 object-contain" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-[#D4A339] uppercase mb-0.5">
                Department of Economy, Planning, and Development
              </p>
              <h1 className="font-display text-2xl font-bold text-[#0C2D5C] leading-tight">
                Regional Development Council · NIR
              </h1>
              <p className="text-sm font-medium text-[#4A5568] mt-1">
                {title}
                {eyebrow && <span className="text-[#A0AEC0] font-normal mx-1">|</span>} {eyebrow}
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
                      className="text-sm font-medium py-2 px-5 rounded border border-[#0C2D5C] text-[#0C2D5C] hover:bg-[#EAF0F9] disabled:opacity-60 transition-all"
                    >
                      {scanning ? "Scanning…" : "📄 Scan Document"}
                    </button>
                  </>
                )}
                <button
                  onClick={onNewDocument}
                  className="bg-[#0C2D5C] text-white text-sm font-medium py-2 px-5 rounded hover:bg-[#082044] shadow-sm transition-all"
                >
                  + New Document
                </button>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="text-sm text-[#6B6A63] hover:text-[#14213D] hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}