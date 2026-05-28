"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/app-shell";
import { initialSources, readSourcesFromStorage, type SourceItem } from "../../../lib/sources";

type LiveSource = SourceItem & {
  endpoint: string;
  baseFps: number;
  baseCount: number;
};

function getLiveSources(): LiveSource[] {
  const storedSources = readSourcesFromStorage() ?? initialSources;

  return storedSources.map((source) => {
    const baseCount = source.name === "Gate Utama" ? 12 : source.name === "Warehouse North" ? 8 : 6;
    const baseFps = source.frameRate?.startsWith("24") ? 24 : source.frameRate?.startsWith("30") ? 30 : 25;

    return {
      ...source,
      endpoint: source.url,
      baseFps,
      baseCount,
    };
  });
}

export default function LiveViewPage() {
  const searchParams = useSearchParams();
  const sourceIdParam = searchParams.get("sourceId");
  const [searchQuery, setSearchQuery] = useState("");
  const [sources, setSources] = useState<LiveSource[]>(() => getLiveSources());
  const [selectedSourceId, setSelectedSourceId] = useState(() => {
    if (sourceIdParam) {
      const paramId = parseInt(sourceIdParam, 10);
      const sources = getLiveSources();
      if (sources.some((s) => s.id === paramId)) {
        return paramId;
      }
    }
    return getLiveSources()[0]?.id ?? 0;
  });

  useEffect(() => {
    const syncSources = () => setSources(getLiveSources());

    syncSources();

    const handleStorageChange = () => syncSources();
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const filteredSources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return sources;
    }

    return sources.filter((source) => {
      return (
        source.name.toLowerCase().includes(query) ||
        (source.type || "").toLowerCase().includes(query) ||
        source.endpoint.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const selectedSource = useMemo(() => {
    return filteredSources.find((source) => source.id === selectedSourceId) ?? filteredSources[0] ?? sources[0];
  }, [filteredSources, selectedSourceId]);

  useEffect(() => {
    if (filteredSources.length === 0) {
      return;
    }

    if (!filteredSources.some((source) => source.id === selectedSourceId)) {
      setSelectedSourceId(filteredSources[0].id);
    }
  }, [filteredSources, selectedSourceId]);

  const hasMatches = filteredSources.length > 0;

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
              onChange={(event) => setSelectedSourceId(parseInt(event.target.value, 10))}
              className="h-10 flex-1 rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white outline-none"
            >
              {hasMatches ? (
                filteredSources.map((source) => (
                  <option key={source.id} value={source.id} className="text-black">
                    {source.name}
                  </option>
                ))
              ) : (
                <option value={selectedSource.id} className="text-black">
                  {selectedSource.name}
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
                  {selectedSource.name}
                </Link>
                <span> · {selectedSource.endpoint}</span>
              </p>
            </div>

            <span className="rounded-full border border-[#e2c15d]/50 bg-[#e2c15d]/15 px-3 py-1 text-xs font-medium tracking-[0.2em] text-white">
              LIVE
            </span>
          </div>

          <div className="relative min-h-104 w-full flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#213d2e]">
            <Image
              src="/surveillance.svg"
              alt="CCTV camera placeholder"
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority
            />

            <div className="absolute left-4 top-4 rounded-sm border border-white/10 bg-black/35 px-3 py-2 text-xs text-white shadow-sm backdrop-blur-sm">
              <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
                <span>Timestamp : YYYY-MM-DD HH:MM:SS</span>
                <span>fps : XX</span>
                <span className="col-span-2">Live Count : XXX</span>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 rounded-sm border border-white/10 bg-black/30 px-3 py-2 text-xs text-white shadow-sm backdrop-blur-sm">
              <p className="font-medium">{selectedSource.type}</p>
              <p>{selectedSource.resolution}</p>
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
