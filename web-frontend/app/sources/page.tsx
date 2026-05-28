"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "../../components/app-shell";
import {
  initialSources,
  type SourceItem,
  type SourceType,
  readSourcesFromStorage,
  writeSourcesToStorage,
} from "../../lib/sources";

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[]>(initialSources);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<SourceType>("CCTV");
  const [url, setUrl] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    const storedSources = readSourcesFromStorage();
    if (storedSources) {
      setSources(storedSources);
    }
  }, []);

  useEffect(() => {
    writeSourcesToStorage(sources);
  }, [sources]);

  const filteredSources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sources;
    }

    return sources.filter((source) => {
      return (
        source.name.toLowerCase().includes(query) ||
        source.type.toLowerCase().includes(query) ||
        source.url.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, sources]);

  function resetForm() {
    setName("");
    setType("CCTV");
    setUrl("");
    setEditingId(null);
  }

  function handleEditClick(source: SourceItem) {
    setEditingId(source.id);
    setName(source.name);
    setType(source.type);
    setUrl(source.url);
    setIsModalOpen(true);
  }

  function handleDeleteClick(id: number, sourceName: string) {
    setDeleteConfirmation({ id, name: sourceName });
  }

  function confirmDelete() {
    if (deleteConfirmation) {
      setSources((currentSources) => currentSources.filter((source) => source.id !== deleteConfirmation.id));
      setDeleteConfirmation(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingId !== null) {
      // Edit mode: update existing source
      setSources((currentSources) =>
        currentSources.map((source) =>
          source.id === editingId
            ? { ...source, name: name.trim(), type, url: url.trim() }
            : source
        )
      );
    } else {
      // Add mode: create new source
      const nextId = sources.length ? Math.max(...sources.map((item) => item.id)) + 1 : 1;
      setSources((currentSources) => [
        ...currentSources,
        {
          id: nextId,
          name: name.trim(),
          type,
          url: url.trim(),
          frameRate: "30 FPS",
          resolution: "1920x1080",
          status: "Active",
        },
      ]);
    }

    setIsModalOpen(false);
    resetForm();
  }

  return (
    <AppShell title="Sources" variant="dashboard">
      <section className="h-full rounded-sm border border-[#2f8e4c]/70 bg-[linear-gradient(140deg,#145e35_0%,#1d7a43_65%,#1f6b3c_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white placeholder:text-white/50 outline-none focus:border-[#e2c15d] focus:bg-[#0f4b2b]/80"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-10 rounded-sm border border-[#e2c15d]/60 bg-[#e2c15d]/25 px-4 text-sm font-medium text-white transition hover:bg-[#e2c15d]/40"
          >
            Add Source
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#2f8e4c]/40 bg-[#0f4b2b]/40">
          <table className="w-full min-w-215 border-collapse text-sm">
              <thead>
                <tr className="bg-[#0f4b2b] text-white/85">
                  <th className="border border-[#2f8e4c]/40 px-2 py-2 text-center">No</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-center">Source Name</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-center">Type</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-center">Frame Rate</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-center">Resolution</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-center">Status</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-[#2f8e4c]/40 px-3 py-8 text-center text-white/50">
                      No sources found.
                    </td>
                  </tr>
                ) : (
                  filteredSources.map((source, index) => (
                    <tr key={source.id} className="bg-[#145e35]/40 text-white/90">
                      <td className="border border-[#2f8e4c]/40 px-2 py-3 text-center">{index + 1}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3 text-center">{source.name}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3 text-center">{source.type}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3 text-center">{source.frameRate}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3 text-center">{source.resolution}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            source.status === "Active" ? "bg-[#1f6b3c] text-white" : "bg-[#8c3138] text-[#ffe9eb]"
                          }`}
                        >
                          {source.status}
                        </span>
                      </td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <Link
                            href={`/head-counting/live-view?sourceId=${source.id}`}
                            className="rounded border border-white/30 px-2 py-1 text-white/80 hover:bg-white/10"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleEditClick(source)}
                            className="rounded border border-white/30 px-2 py-1 text-white/80 hover:bg-white/10"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(source.id, source.name)}
                            className="rounded border border-white/30 px-2 py-1 text-white/80 hover:bg-white/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-sm border border-[#2f8e4c]/60 bg-[#0f4b2b] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-semibold text-white/95">{editingId !== null ? "Edit Source" : "Add Source"}</h2>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-white/85">
                Name
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: CCTV Area Parkir"
                  className="mt-1 h-10 w-full rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-white placeholder:text-white/40 outline-none focus:border-[#e2c15d] focus:bg-[#0f4b2b]/80"
                />
              </label>

              <label className="block text-sm text-white/85">
                Type
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as SourceType)}
                  className="mt-1 h-10 w-full rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-white outline-none focus:border-[#e2c15d] focus:bg-[#0f4b2b]/80"
                >
                  <option value="CCTV">CCTV</option>
                  {/* YouTube dan File dinonaktifkan sementara, hanya RTSP yang didukung */}
                  {/* <option value="YouTube">YouTube</option> */}
                  {/* <option value="File">File</option> */}
                </select>
              </label>

              <label className="block text-sm text-white/85">
                RTSP URL
                <input
                  required
                  type="text"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="rtsp://username:password@192.168.x.x:554/stream"
                  className="mt-1 h-10 w-full rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-white placeholder:text-white/40 outline-none focus:border-[#e2c15d] focus:bg-[#0f4b2b]/80"
                />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="h-10 rounded-sm border border-white/30 px-4 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-sm border border-[#e2c15d]/70 bg-[#e2c15d]/25 px-4 text-sm font-medium text-white transition hover:bg-[#e2c15d]/40"
                >
                  {editingId !== null ? "Save Changes" : "Save Source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-sm border border-[#2f8e4c]/60 bg-[#0f4b2b] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-semibold text-white/95">Delete Source?</h2>
            <p className="mt-3 text-sm text-white/75">
              Are you sure you want to delete "<span className="font-medium text-white">{deleteConfirmation.name}</span>"? This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="h-10 rounded-sm border border-white/30 px-4 text-sm text-white/80 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-10 rounded-sm border border-red-600/70 bg-red-600/25 px-4 text-sm font-medium text-red-300 transition hover:bg-red-600/40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}