"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DocumentTrackerView from "../../components/DocumentTrackerView";
import RequireRole from "../../components/auth/RequireRole";
import {
  Category,
  DocRow,
  fetchCategories,
  addCategory,
  removeCategory,
  fetchSectors,
  addSector,
  removeSector,
  fetchDrafters,
  addDrafter,
  removeDrafter,
  fetchStatuses,
  addStatus,
  removeStatus,
  fetchArchivedDocuments,
  restoreDocument,
  formatDate,
} from "../../lib/documentTracker";

export default function SecretariatPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors, setSectors] = useState<Category[]>([]);
  const [drafters, setDrafters] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Category[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archived, setArchived] = useState<DocRow[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [newCategory, setNewCategory] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newDrafter, setNewDrafter] = useState("");
  const [newStatus, setNewStatus] = useState("");
  
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadAllSettings();
  }, []);

  async function loadAllSettings() {
    try { setCategories(await fetchCategories()); } catch { setCategories([]); }
    try { setSectors(await fetchSectors()); } catch { setSectors([]); }
    try { setDrafters(await fetchDrafters()); } catch { setDrafters([]); }
    try { setStatuses(await fetchStatuses()); } catch { setStatuses([]); }
  }

  async function loadArchived() {
    setArchiveLoading(true);
    try {
      setArchived(await fetchArchivedDocuments());
    } catch {
      setArchived([]);
    }
    setArchiveLoading(false);
  }

  function toggleArchive() {
    const next = !showArchive;
    setShowArchive(next);
    if (next) loadArchived();
  }

  async function handleRestore(doc: DocRow) {
    const error = await restoreDocument(doc);
    if (error) {
      alert("Couldn't restore that document: " + error.message);
      return;
    }
    await loadArchived();
    setRefreshKey((k) => k + 1); // force the main register to re-fetch
  }

  async function handleAdd(type: "category" | "sector" | "drafter" | "status", e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    
    if (type === "category" && newCategory.trim()) {
      await addCategory(newCategory.trim());
      setNewCategory("");
    } else if (type === "sector" && newSector.trim()) {
      await addSector(newSector.trim());
      setNewSector("");
    } else if (type === "drafter" && newDrafter.trim()) {
      await addDrafter(newDrafter.trim());
      setNewDrafter("");
    } else if (type === "status" && newStatus.trim()) {
      await addStatus(newStatus.trim());
      setNewStatus("");
    }
    
    await loadAllSettings();
    setBusy(false);
  }

  async function handleRemove(type: "category" | "sector" | "drafter" | "status", id: number) {
    setBusy(true);
    if (type === "category") await removeCategory(id);
    if (type === "sector") await removeSector(id);
    if (type === "drafter") await removeDrafter(id);
    if (type === "status") await removeStatus(id);
    await loadAllSettings();
    setBusy(false);
  }

  const categoryNames = categories.length > 0 ? categories.map((c) => c.name) : ["Letter", "Memo", "Resolution", "Other"];
  const sectorNames = sectors.map((s) => s.name);
  const drafterNames = drafters.map((d) => d.name);
  const statusNames = statuses.length > 0 ? statuses.map((s) => s.name) : ["Drafted", "Pending Review", "Returned", "Sent", "Cancelled"];

  return (
    <RequireRole allow={["secretariat"]}>
      <DocumentTrackerView
        key={refreshKey}
        title="Document Tracker"
        eyebrow="Regional Development Council · Negros Island Region — Secretariat"
        statsMode="full"
        allowManage
        categoryOptions={categoryNames}
        sectorOptions={sectorNames}
        drafterOptions={drafterNames}
        statusOptions={statusNames}
      emptyQueueMessage="No documents recorded yet. Add the first one to start the register."
      headerExtra={
        <div className="mb-6">
          {/* View switcher (no login yet) */}
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2.5 bg-white border border-[#FFB400] rounded-full shadow-sm">
            <span className="text-xs font-bold text-[#B87900] uppercase tracking-wider">Switch view:</span>
            <Link href="/ard" className="text-sm font-semibold text-[#26357F] bg-[#E4ECFA] hover:bg-[#FFB400]/40 rounded-full px-3 py-1 transition-colors">
              Go to ARD View
            </Link>
            <Link href="/rd" className="text-sm font-semibold text-[#26357F] bg-[#E4ECFA] hover:bg-[#FFB400]/40 rounded-full px-3 py-1 transition-colors">
              Go to RD View
            </Link>
          </div>
          <br />

          <button
            onClick={() => setShowSettings((s) => !s)}
            className="text-sm font-medium text-[#0C2D5C] bg-white border border-[#C9D6EE] rounded-full px-4 py-1.5 shadow-sm hover:bg-[#E4ECFA] transition-colors"
          >
            {showSettings ? "Hide settings" : "Manage dropdown options"}
          </button>
          <span className="mx-1" />
          <button onClick={toggleArchive} className="text-sm font-medium text-[#0C2D5C] bg-white border border-[#C9D6EE] rounded-full px-4 py-1.5 shadow-sm hover:bg-[#E4ECFA] transition-colors">
            {showArchive ? "Hide archive" : "View archived documents"}
          </button>

          {showArchive && (
            <div className="mt-3 bg-white border border-[#DDE5F4] border-t-4 border-t-[#0B6B3A] rounded-2xl shadow-md p-5 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wider text-[#26357F] mb-3">
                Archived documents — hidden from the main register, restorable anytime.
              </p>
              {archiveLoading ? (
                <p className="text-sm text-[#6B6A63]">Loading…</p>
              ) : archived.length === 0 ? (
                <p className="text-sm text-[#6B6A63]">Nothing archived right now.</p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {archived.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between text-sm border-b border-[#EEF1F8] pb-2"
                    >
                      <div>
                        <p className="font-medium text-[#14213D]">{doc.document_no}</p>
                        <p className="text-xs text-[#6B6A63] truncate max-w-md">
                          {doc.email_subject} — archived {formatDate(doc.deleted_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestore(doc)}
                        className="text-xs font-medium text-[#0C2D5C] hover:underline shrink-0 ml-4"
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showSettings && (
            <div className="mt-3 bg-white border border-[#DDE5F4] border-t-4 border-t-[#26357F] rounded-2xl shadow-md p-5 max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-8">
              
              {/* Category Settings */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#26357F] mb-3">Categories</p>
                <ul className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                  {categories.map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-sm text-[#14213D]">
                      {c.name}
                      <button disabled={busy} onClick={() => handleRemove("category", c.id)} className="text-xs text-[#7A1219] hover:underline disabled:opacity-50">Remove</button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={(e) => handleAdd("category", e)} className="flex gap-2">
                  <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category..." className="flex-1 w-full bg-white border border-[#C9D6EE] px-3 py-1.5 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50" />
                  <button disabled={busy || !newCategory.trim()} className="bg-[#0B6B3A] text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#08522C] disabled:opacity-60 transition-colors">Add</button>
                </form>
              </div>

              {/* Sector Settings */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#26357F] mb-3">Sectors / Divisions</p>
                <ul className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                  {sectors.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm text-[#14213D]">
                      {s.name}
                      <button disabled={busy} onClick={() => handleRemove("sector", s.id)} className="text-xs text-[#7A1219] hover:underline disabled:opacity-50">Remove</button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={(e) => handleAdd("sector", e)} className="flex gap-2">
                  <input value={newSector} onChange={(e) => setNewSector(e.target.value)} placeholder="New sector..." className="flex-1 w-full bg-white border border-[#C9D6EE] px-3 py-1.5 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50" />
                  <button disabled={busy || !newSector.trim()} className="bg-[#0B6B3A] text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#08522C] disabled:opacity-60 transition-colors">Add</button>
                </form>
              </div>

              {/* Drafter Settings */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#26357F] mb-3">Drafters</p>
                <ul className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                  {drafters.map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-sm text-[#14213D]">
                      {d.name}
                      <button disabled={busy} onClick={() => handleRemove("drafter", d.id)} className="text-xs text-[#7A1219] hover:underline disabled:opacity-50">Remove</button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={(e) => handleAdd("drafter", e)} className="flex gap-2">
                  <input value={newDrafter} onChange={(e) => setNewDrafter(e.target.value)} placeholder="New drafter..." className="flex-1 w-full bg-white border border-[#C9D6EE] px-3 py-1.5 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50" />
                  <button disabled={busy || !newDrafter.trim()} className="bg-[#0B6B3A] text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#08522C] disabled:opacity-60 transition-colors">Add</button>
                </form>
              </div>

              {/* Status Settings */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#26357F] mb-3">Statuses</p>
                <ul className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                  {statuses.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm text-[#14213D]">
                      {s.name}
                      <button disabled={busy} onClick={() => handleRemove("status", s.id)} className="text-xs text-[#7A1219] hover:underline disabled:opacity-50">Remove</button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={(e) => handleAdd("status", e)} className="flex gap-2">
                  <input value={newStatus} onChange={(e) => setNewStatus(e.target.value)} placeholder="New status..." className="flex-1 w-full bg-white border border-[#C9D6EE] px-3 py-1.5 text-sm rounded-lg shadow-sm focus:outline-none focus:border-[#26357F] focus:ring-2 focus:ring-[#FFB400]/50" />
                  <button disabled={busy || !newStatus.trim()} className="bg-[#0B6B3A] text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#08522C] disabled:opacity-60 transition-colors">Add</button>
                </form>
              </div>

            </div>
          )}
        </div>
      }
      />
    </RequireRole>
  );
}