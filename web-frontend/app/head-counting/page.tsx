"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppShell from "../../components/app-shell";
import { useAuth } from "../../contexts/auth-context";
import DateRangePicker from "../../components/date-range-picker";
import TimeRangePicker from "../../components/time-range-picker";

type SnapshotRecord = {
  id: string;
  date: string;
  timestamp: string;
  source_name: string;
  head_count_at_time: number;
  image_path: string;
};

export default function HeadCountingPage() {
  const [sources, setSources] = useState<string[]>([]);
  const [records, setRecords] = useState<SnapshotRecord[]>([]);
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

  async function fetchRecords() {
    try {
      const response = await fetch(`/api/snapshots`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        var recordData = await response.json();
        if(recordData.snapshots!= null){
          recordData = recordData.snapshots.map((record: any) => {
            const date = new Date(record.created_at);
            
            return {
              ...record,
              date: date.getDate().toString().padStart(2, '0') + "/" + (date.getMonth() + 1).toString().padStart(2, '0') + "/" + date.getFullYear().toString(),
              timestamp: date.getHours().toString() + ":" + date.getMinutes().toString() + ":" + date.getSeconds().toString() + "." + date.getMilliseconds().toString(),
            };
          });
          setRecords(recordData);
          setSources([...new Set<string>(recordData.map((record : SnapshotRecord) => record.source_name))]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get snapshots');
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
    // fetchSources();
  }, [token, router]);

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchSearch =
        !searchQuery ||
        record.source_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.head_count_at_time.toString().includes(searchQuery);

      const recordDate = new Date(record.date);
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;

      const matchDate =
        (!fromDate || recordDate >= fromDate) && (!toDate || recordDate <= toDate);

      const matchSource = !selectedSource || record.source_name === selectedSource;

      // Time filtering
      let matchTime = true;
      if (timeFrom || timeTo) {
        const [fromHours, fromMins] = timeFrom
          ? timeFrom.match(/(\d+):(\d+)/)?.slice(1, 3).map(Number) || [0, 0]
          : [0, 0];
        const [toHours, toMins] = timeTo
          ? timeTo.match(/(\d+):(\d+)/)?.slice(1, 3).map(Number) || [23, 59]
          : [23, 59];

        const [recordHours, recordMins] = record.timestamp.split(":").slice(0, 2).map(Number);

        const fromTotalMins = (fromHours % 12) * 60 + fromMins + (timeFrom?.includes("PM") && fromHours !== 12 ? 12 * 60 : 0);
        const toTotalMins = (toHours % 12) * 60 + toMins + (timeTo?.includes("PM") && toHours !== 12 ? 12 * 60 : 0);
        const recordTotalMins = recordHours * 60 + recordMins;

        matchTime = recordTotalMins >= fromTotalMins && recordTotalMins <= toTotalMins;
      }

      return matchSearch && matchDate && matchSource && matchTime;
    });
  }, [searchQuery, dateFrom, dateTo, timeFrom, timeTo, selectedSource, records]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((left, right) => {
      const leftValue = new Date(`${left.date}T${left.timestamp}`).getTime();
      const rightValue = new Date(`${right.date}T${right.timestamp}`).getTime();

      return sortOrder === "asc" ? leftValue - rightValue : rightValue - leftValue;
    });
  }, [filteredRecords, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, timeFrom, timeTo, selectedSource, sortOrder]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedRecords.slice(startIndex, endIndex);
  }, [sortedRecords, currentPage]);

  const formatDisplayDate = (dateValue: string) => {
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) {
      return dateValue;
    }
    return `${day}/${month}/${year}`;
  };

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

            <div className="flex-1 min-w-72">
              <DateRangePicker
                startDate={dateFrom}
                endDate={dateTo}
                onStartDateChange={setDateFrom}
                onEndDateChange={setDateTo}
              />
            </div>

            <div className="flex-1 min-w-72">
              <TimeRangePicker
                startTime={timeFrom}
                endTime={timeTo}
                onStartTimeChange={setTimeFrom}
                onEndTimeChange={setTimeTo}
              />
            </div>

            <select
              value={selectedSource}
              onChange={(event) => setSelectedSource(event.target.value)}
              className="h-10 rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-3 text-sm text-white outline-none focus:border-[#e2c15d]"
            >
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleReset({ preventDefault: () => {} } as any)}
              aria-label="Reset filters"
              title="Reset filters"
              className="flex h-10 w-12 items-center justify-center rounded-sm border border-[#e2c15d]/60 bg-[#e2c15d]/20 text-white transition hover:bg-[#e2c15d]/30"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setSortOrder((current) => (current === "asc" ? "desc" : "asc"))}
              aria-label={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
              title={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
              className="flex h-10 w-12 items-center justify-center rounded-sm border border-[#e2c15d]/60 bg-[#e2c15d]/20 text-white transition hover:bg-[#e2c15d]/30"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
                className={`h-6 w-6 transition-transform ${sortOrder === "asc" ? "rotate-0" : "rotate-180"}`}
                aria-hidden="true"
              >
                <path d="M6 20V4" />
                <path d="M6 4L3 7" />
                <path d="M6 4L9 7" />
                <path d="M11 8H21" />
                <path d="M11 12H19" />
                <path d="M11 16H17" />
                <path d="M11 20H15" />
              </svg>
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
                {sortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-[#2f8e4c]/40 px-3 py-8 text-center text-white/50">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record, index) => (
                    <tr key={record.id} className="bg-[#145e35]/40 text-white/90 hover:bg-[#145e35]/60">
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{index + 1}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{formatDisplayDate(record.date)}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{record.timestamp}</td>
                      <td className="border border-[#2f8e4c]/40 px-3 py-3">{sources ? sources.find(s => s === record.source_name) : "Source not found"}</td>
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

          {/* Pagination */}
          {sortedRecords.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-[#2f8e4c]/40 bg-[#0f4b2b]/40 p-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-sm border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`rounded-sm px-3 py-2 text-sm transition ${
                        currentPage === page
                          ? "bg-[#2f8e4c] text-white border border-[#2f8e4c]"
                          : "border border-white/30 bg-white/10 text-white/80 hover:bg-white/20"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-sm border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>Page</span>
                <select
                  value={currentPage}
                  onChange={(event) => setCurrentPage(Number(event.target.value))}
                  aria-label="Select page"
                  className="h-9 rounded-sm border border-white/30 bg-white/10 px-2 text-sm text-white outline-none transition hover:bg-white/20 focus:border-[#e2c15d]"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <option key={page} value={page} className="text-black">
                      {page}
                    </option>
                  ))}
                </select>
                <span>of <span className="font-semibold text-white">{totalPages}</span></span>
              </div>
            </div>
          )}
      </section>
    </AppShell>
  );
}
