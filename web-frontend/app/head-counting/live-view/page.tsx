"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "../../../components/app-shell";
import { useRouter } from "next/navigation";
import { readSourcesFromStorage, type SourceItem } from "../../../lib/sources";
import { useAuth } from "../../../contexts/auth-context";

type HeadCountLog = {
  id: number;
  source_name: string;
  head_count: number;
  current_fps: string;
  timestamp: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const initialSourceItem: SourceItem = {id: "0", name: "No Source Chosen", type: "Other", url: "", fps_target: "", resolution: "...", status: false}

export default function LiveViewPage() {
  const searchParams = useSearchParams();
  const sourceIdParam = searchParams.get("sourceId");
  const [searchQuery, setSearchQuery] = useState("");
  const [sources, setSources] = useState<SourceItem[]>([initialSourceItem]);
  const [selectedSourceId, setSelectedSourceId] = useState("0");
  const router = useRouter();
  const {token} = useAuth();
  const [log, setLog] = useState<HeadCountLog>();
  const [err, setError] = useState("");
  const [streamErr, setStreamError] = useState(false);
  const [status, setStatus] = useState<'Connecting' | 'Open' | 'Closed'>('Connecting');
  const selectedSourceNameRef = useRef<string | null>(null);
  const streamErrRef = useRef(false);
  const selectedSourceIdRef = useRef(selectedSourceId);
  const tokenRef = useRef(token);
  
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      setStatus('Open');
    };

    socket.onmessage = (event) => {
      try {
        const newLog: HeadCountLog = JSON.parse(event.data);
        
        if (newLog.source_name === selectedSourceNameRef.current) {
          setLog(newLog);

          if (streamErrRef.current === true) {
            console.log("Stream recovered! Updating source status...");
            setStreamError(false);
            UpdateSource(true); 
          }
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
      const response = await fetch(`/api/sources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const sourcesData = await response.json();
        setSources([initialSourceItem, ...sourcesData.sources]);
        setSelectedSourceId("0");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get live view');
    } finally {
    }
  }

  const UpdateSource = async (targetStatus: boolean) => {
    if (selectedSourceIdRef.current !== "0" && tokenRef.current) {
      try {
        const response = await fetch(`/api/sources/status/${selectedSourceIdRef.current}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenRef.current}`,
          },
          body: JSON.stringify({ status: targetStatus }),
        });
        
        if (!response.ok) throw new Error('Failed to update source');
        console.log(`Source ${selectedSourceIdRef.current} status updated to: ${targetStatus}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Update failed');
      }
    }
  };

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
    return filteredSources.find((s) => s.id === selectedSourceId) || filteredSources[0] || sources[0];
  }, [filteredSources, selectedSourceId]);

  useEffect(() => {
    selectedSourceNameRef.current = selectedSource?.name || null;
    streamErrRef.current = streamErr;
    selectedSourceIdRef.current = selectedSourceId;
    tokenRef.current = token;
  }, [selectedSource, streamErr, selectedSourceId, token]);

  useEffect(() => {
    if (selectedSourceId && selectedSourceId !== "0") {
      setLog(undefined);
      setStreamError(true);
      UpdateSource(false);
    }
  }, [selectedSourceId]);

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
          </div>

          <div className="relative min-h-104 w-full flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#213d2e]">
            <Image
              alt=""
              onError={() => setStreamError(true)}
              src={ streamErr || !selectedSource ? '/surveillance.svg' : `/camera/stream/${selectedSource.id}` }
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
              { streamErr ? "INACTIVE" : "STREAMING" }
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
