"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import AppShell from "../../../components/app-shell";
import { useRouter } from "next/navigation";
import { readSourcesFromStorage, type SourceItem } from "../../../lib/sources";
import { useAuth } from "../../../contexts/auth-context";
import ImageWithFallback from "../../../components/image-with-fallback-src";

type HeadCountLog = {
  id: number;
  source_name: string;
  head_count: number;
  current_fps: string;
  timestamp: string;
};

export default function LiveViewPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const router = useRouter();
  const {token} = useAuth();
  const [log, setLog] = useState<HeadCountLog>();
  const [err, setError] = useState("");
  const [status, setStatus] = useState<'Connecting' | 'Open' | 'Closed'>('Connecting');
  const selectedSourceNameRef = useRef<string | null>(null);
  
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/ws');

    socket.onopen = () => {
      setStatus('Open');
    };

    socket.onmessage = (event) => {
      try {
        const newLog: HeadCountLog = JSON.parse(event.data);
        
        if (newLog.source_name === selectedSourceNameRef.current) {
          setLog(newLog);
          console.log("New Log Received:", newLog);
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    socket.onclose = () => {
      setStatus('Closed');
    };

    return () => {
      if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  async function fetchSources() {
    try {
      const response = await fetch(`http://localhost:8080/api/sources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const sourcesData = await response.json();
        setSources(sourcesData.sources);
        setSelectedSourceId(sourcesData.sources[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get live view');
    } finally {
    }
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    
    fetchSources();
  }, [token, router]);

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

  const selectedSource = useMemo(() => {   
    if (!filteredSources || filteredSources.length === 0) {
      return null;
    }
    return filteredSources.find((source) => source.id === selectedSourceId) ?? filteredSources[0] ?? sources[0];
  }, [filteredSources, selectedSourceId]);

  useEffect(() => {
    selectedSourceNameRef.current = selectedSource?.name || null;
  }, [selectedSource]);

  const hasMatches = filteredSources ? filteredSources.length > 0 : false;

  return (
    <AppShell title="Live View" variant="dashboard">
      <div className="flex min-h-[calc(100vh-6.5rem)] flex-col rounded-sm border border-[#2f8e4c]/70 bg-[linear-gradient(140deg,#145e35_0%,#1d7a43_65%,#1f6b3c_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex h-10 w-full max-w-md items-center gap-2 rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white shadow-sm outline-none md:w-md">
            <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-white/30 bg-white/10 text-[10px] text-white/70">
              ✕
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
            />
          </label>

          <label className="flex w-full max-w-xs items-center gap-3 md:w-72 md:justify-end">
            <span className="text-sm text-white/80">Source</span>
            <select
              value={selectedSourceId}
              onChange={(event) => setSelectedSourceId(event.target.value)}
              className="h-10 flex-1 rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white outline-none"
            >
              {hasMatches && selectedSource ? (
                filteredSources.map((source) => (
                  <option key={source.id} value={source.id} className="text-black">
                    {source.name}
                  </option>
                ))
              ) : (
                <option value={selectedSource?.id} className="text-black">
                  {selectedSource?.name}
                </option>
              )}
            </select>
          </label>
        </div>

        <section className="mt-4 flex flex-1 min-h-0 flex-col rounded-2xl bg-[#114a2b] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.25)] md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-medium text-white/96 md:text-3xl">Camera Feed</h3>
              <p className="mt-1 text-sm text-white/70">
                <Link href="/sources" className="font-medium text-white underline decoration-white/40 underline-offset-4 hover:text-white/90">
                  {selectedSource ? selectedSource?.name : "No source selected"}
                </Link>
                <span> · {selectedSource?.url}</span>
              </p>
            </div>

            <span className="rounded-full border border-[#e2c15d]/50 bg-[#e2c15d]/15 px-3 py-1 text-xs font-medium tracking-[0.2em] text-white">
              LIVE
            </span>
          </div>

          <div className="relative min-h-104 w-full flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#213d2e]">
            <ImageWithFallback
              src={ selectedSource ? `http://localhost:8000/camera/stream/${selectedSource.id}` : '/surveillance.svg'}
              alt=""
              fallbackSrc="/surveillance.svg"
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
            <div className="absolute left-4 top-4 rounded-sm border border-white/10 bg-black/35 px-3 py-2 text-xs text-white shadow-sm backdrop-blur-sm">
              <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
                <span>Frame : {log?.timestamp || "---"}</span>
                <span>FPS : {log?.current_fps || "0.0"}</span>
                <span className="col-span-2">Live Count : {log?.head_count ?? "0"}</span>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 rounded-sm border border-white/10 bg-black/30 px-3 py-2 text-xs text-white shadow-sm backdrop-blur-sm">
              <p className="font-medium">{selectedSource?.type}</p>
              <p>{selectedSource?.resolution}</p>
            </div>

            <div className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium tracking-[0.2em] text-white">
              STREAMING
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
