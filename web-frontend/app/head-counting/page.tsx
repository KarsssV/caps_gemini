"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppShell from "../../components/app-shell";
import { useAuth } from "../../contexts/auth-context";

type SourceItem = {
  id: string;
  name: string;
};

type SnapshotRecords = {
  id: string;
  date: string;
  timestamp: string;
  source_id: string;
  head_count_at_time: number;
  image_path: string;
};

// const initialRecords: CountingRecord[] = [
//   {
//     id: 1,
//     date: "2024-04-08",
//     timestamp: "09:15:32",
//     source: "Gate Utama",
//     headCount: 12,
//     picture: "/surveillance.svg",
//   },
//   {
//     id: 2,
//     date: "2024-04-08",
//     timestamp: "10:42:18",
//     source: "Warehouse North",
//     headCount: 8,
//     picture: "/surveillance.svg",
//   },
//   {
//     id: 3,
//     date: "2024-04-08",
//     timestamp: "14:28:45",
//     source: "Gate Utama",
//     headCount: 15,
//     picture: "/surveillance.svg",
//   },
// ];

// const sources = [
//   { value: "", label: "All Sources" },
//   { value: "Gate Utama", label: "Gate Utama" },
//   { value: "Warehouse North", label: "Warehouse North" },
// ];

export default function HeadCountingPage() {
  const [sources, setSources] = useState<SourceItem[]>();
  const [records, setRecords] = useState<SnapshotRecords[]>();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [loading, setLoading] = useState(true);
  const {user, token} = useAuth();
  const [err, setError] = useState("");
  const router = useRouter();

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
      } else {
        router.push("/");
      }
    } catch (error) {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecords() {
    try {
      const response = await fetch(`http://localhost:8080/api/snapshots`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        var recordData = await response.json();
        recordData = recordData.snapshots.map((record: any) => {
          const date = new Date(record.created_at);
          
          return {
            ...record,
            date: date.getDate().toString().padStart(2, '0') + "/" + (date.getMonth() + 1).toString().padStart(2, '0') + "/" + date.getFullYear().toString(),
            timestamp: date.getHours().toString() + ":" + date.getMinutes().toString() + ":" + date.getSeconds().toString() + "." + date.getMilliseconds().toString(),
          };
        });
        setRecords(recordData);
        console.log(recordData);
      }
    } catch (error) {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    
    fetchRecords();
    fetchSources();
  }, [token, router]);

  const filteredRecords = useMemo(() => {
    if (!Array.isArray(records)) {
      return []; 
    }
    return records.filter((record) => {
      const matchSearch =
        !searchQuery ||
        record.source_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.head_count_at_time.toString().includes(searchQuery);

      const recordDate = new Date(record.date);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;

      const matchDate =
        (!fromDate || recordDate >= fromDate) && (!toDate || recordDate <= toDate);

      const matchSource = !selectedSource || record.source_id === selectedSource;

      return matchSearch && matchDate && matchSource;
    });
  }, [searchQuery, dateFrom, dateTo, selectedSource, records]);

  function handleReset(_event: FormEvent<HTMLFormElement>) {
    _event.preventDefault();
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setTimeFrom("");
    setTimeTo("");
    setSelectedSource("");
  }

  return (
    <AppShell title="Head Counting Data" variant="dashboard">
      <section className="h-full rounded-sm border border-[#2f8e4c]/70 bg-[linear-gradient(140deg,#145e35_0%,#1d7a43_65%,#1f6b3c_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-6">
        <div className="rounded-lg border border-[#2f8e4c]/50 bg-[#0f4b2b]/80 p-4">
          <div className="mb-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search"
                  className="h-10 w-full rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white placeholder:text-white/50 outline-none focus:border-[#e2c15d] focus:bg-[#0f4b2b]/80"
                />
              </div>

              <select
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-10 rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white outline-none focus:border-[#e2c15d]"
              >
                <option value="">Date Range</option>
                <option value="2024-04-01">2024-04-01</option>
                <option value="2024-04-08">2024-04-08</option>
              </select>

              <select
                value={timeFrom}
                onChange={(event) => setTimeFrom(event.target.value)}
                className="h-10 rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white outline-none focus:border-[#e2c15d]"
              >
                <option value="">Time Range</option>
                <option value="00:00">00:00</option>
                <option value="12:00">12:00</option>
              </select>

              <select
                value={selectedSource}
                onChange={(event) => setSelectedSource(event.target.value)}
                className="h-10 rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white outline-none focus:border-[#e2c15d]"
              >
                {sources ? sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                )) : ""}
              </select>

              <button
                type="button"
                onClick={() => handleReset({ preventDefault: () => {} } as any)}
                className="h-10 rounded-sm border border-white/30 bg-white/10 px-4 text-sm text-white/80 transition hover:bg-white/20"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#2f8e4c]/40 bg-[#0f4b2b]/40">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#0f4b2b] text-white/85">
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">No</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Date</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Timestamp</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Source</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Head Count</th>
                  <th className="border border-[#2f8e4c]/40 px-3 py-2 text-left">Picture</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-[#2f8e4c]/40 px-3 py-8 text-center text-white/50">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, index) => (
                    <tr key={record.id} className="bg-[#145e35]/40 text-white/90 hover:bg-[#145e35]/60">
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{index + 1}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{record.date}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{record.timestamp}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{sources ? sources.find(s => s.id === record.source_id)?.name : "Source not found"}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3 font-semibold">{record.head_count_at_time}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">
                        <div className="relative h-12 w-20 overflow-hidden rounded-sm bg-[#0f4b2b] border border-white/20">
                          <Image
                            src={record.image_path}
                            alt="Snapshot"
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
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
    </AppShell>
  );
}
