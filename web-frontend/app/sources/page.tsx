"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "../../components/app-shell";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/auth-context";
import {
  type SourceItem,
  type SourceType,
  readSourcesFromStorage,
  writeSourcesToStorage,
} from "../../lib/sources";

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("create");
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<SourceType>("RTSP");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const {user, token} = useAuth();
  const [err, setError] = useState("");
  const [sourceId, setSourceId] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

  async function fetchSources() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_BE_CORE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/sources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const sourcesData = await response.json();
        setSources(sourcesData ? sourcesData.sources : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sources');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    
    fetchSources();
  }, [token, router]);
  
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
    if(!sources){
      return null;
    }
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
    setType("RTSP");
    setUrl("");
    setSourceId("");
  }
  
  function setFormData(name: string, type: SourceType, url: string) {
    setName(name);
    setType(type);
    setUrl(url);
  }

  function handleDeleteClick(id: string, sourceName: string) {
    setDeleteConfirmation({ id, name: sourceName });
  }

  function confirmDelete() {
    if (deleteConfirmation) {
      handleDelete(deleteConfirmation.id);
      setSources((currentSources) => currentSources.filter((source) => source.id !== deleteConfirmation.id));
      setDeleteConfirmation(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (!user) {
      router.push("/login");
      return;
    }
    const userId = user?.id

    if(modalType == "create"){
      try {
        const apiUrl = process.env.NEXT_PUBLIC_BE_CORE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/sources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({name, type, url, user_id: userId}),
        });

        if(response.status === 400){
          setError('Missing or invalid parameters');
        } else if(response.status === 503){
          setError('AI service unavailable');
        } else if(response.status === 500){
          setError('Source update failed in server');
        } else if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Source update failed');
        }
      } catch (err) {
        // setError(err instanceof Error ? err.message : 'Registration failed');
        return;
      } finally {
        setLoading(false);
      }
    } else if(modalType == "update"){
      try{  
        const apiUrl = process.env.NEXT_PUBLIC_BE_CORE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/sources/${sourceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({name, type, url, user_id: userId}),
        });

        if(response.status === 400){
          setError('Missing or invalid parameters');
        } else if(response.status === 503){
          setError('AI service unavailable');
        } else if(response.status === 500){
          setError('Source update failed in server');
        } else if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Source update failed');
        }
      } catch (err) {
        // setError(err instanceof Error ? err.message : 'Update failed');
        return;
      } finally {
        setLoading(false);
      }
    }
    setIsModalOpen(false);
    resetForm();
    fetchSources();
  }

  async function handleDelete(sourceId: string) {
    if (!token || !user) {
      router.push("/login");
      return;
    }
    
    const userId = user?.id
    try{
      const apiUrl = process.env.NEXT_PUBLIC_BE_CORE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/sources/${sourceId}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({user_id: userId})
      });

      if (response.ok) {
        fetchSources();
      } else if (response.status === 401) {
        setError("Please login to delete sources");
        alert("Please login to delete sources");
        router.push("/login");
      } else {
        alert("Error deleting source");
      }
    } catch (error) {
      alert("Error deleting source");
    }
    setSourceId("");
  };

  return (
    <AppShell title="Sources" variant="dashboard">
      <section className="h-full rounded-sm border border-[#2f8e4c]/70 bg-[linear-gradient(140deg,#145e35_0%,#1d7a43_65%,#1f6b3c_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-6">
        <div className="rounded-lg border border-[#2f8e4c]/50 bg-[#0f4b2b]/80 p-4">
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
              onClick={() => {setIsModalOpen(true); setModalType("create");}}
              className="h-10 rounded-sm border border-[#e2c15d]/60 bg-[#e2c15d]/25 px-4 text-sm font-medium text-white transition hover:bg-[#e2c15d]/40"
            >
              Add Source
            </button>
          </div>

          <div className="overflow-x-auto">
          {err && (
            <div className="mb-4 flex items-center gap-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {err}
              <button onClick={() => setError("")} className="ml-auto opacity-60 hover:opacity-100">✕</button>
            </div>
          )}
            <table className="w-full min-w-215 border-collapse text-sm">
              <thead>
                <tr className="bg-[#0f4b2b] text-white/85">
                  <th className="border border-[#2f8e4c]/40 px-2 py-2 text-left">No</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Source Name</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Type</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Frame Rate</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Resolution</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Status</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                { !filteredSources || filteredSources?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-[#2f8e4c]/40 px-3 py-8 text-center text-white/50">
                      No sources found.
                    </td>
                  </tr>
                ) : (
                  filteredSources?.map((source, index) => (
                    <tr key={source.id} className="bg-[#145e35]/40 text-white/90">
                      <td className="border border-[#2f8e4c]/40 px-2 py-3">{index + 1}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{source.name}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{source.type}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{source.fps_target}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{source.resolution}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            source.status === true ? "bg-lime-500 text-white" : "bg-red-500 text-white"
                          }`}
                        >
                          {source.status === true ? "Active" : "Offline"}
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
                          <button type="button"
                            className="rounded border border-white/30 px-2 py-1 text-white/80 hover:bg-white/10"
                            onClick={() => { setModalType("update"); setSourceId(source.id); setFormData(source.name, source.type, source.url); setIsModalOpen(true);}}
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
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-sm border border-[#2f8e4c]/60 bg-[#0f4b2b] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-semibold text-white/95">{modalType == "create" ? "Add" : "Update"} Source</h2>

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
                  <option value="RTSP">RTSP</option>
                  <option value="Webcam">Webcam</option>
                  <option value="Youtube">Youtube</option>
                  <option value="MP4">MP4</option>
                </select>
              </label>

              <label className="block text-sm text-white/85">
                URL / Path
                <input
                  required
                  type="text"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="rtsp://... / https://... /"
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
                  Save Source
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