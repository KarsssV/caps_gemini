"use client";

import { useEffect, useRef, useState, useMemo, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/app-shell";
import { useAuth } from "../../contexts/auth-context";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, ScatterChart, Scatter, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

type LogEntry = {
  id: string;
  source_name: string;
  head_count: number;
  current_fps: number;
  created_at: string;
  timestamp: string;
};

type HourBucket = { hour: number; count: number };
type DayBucket = { date: string; count: number };
type WeekdayBucket = { weekday: string; weekday_num: number; count: number };
type MonthBucket = { month: string; count: number };
type HeatmapCell = { weekday: number; hour: number; count: number };

type DashboardStats = {
  total_count: number;
  today_count: number;
  week_count: number;
  month_count: number;
  prev_week_count: number;
  prev_month_count: number;
  peak_count: number;
  avg_daily_count: number;
  avg_hourly_count: number;
  week_growth_rate: number;
  month_growth_rate: number;
  hourly_distribution: HourBucket[];
  daily_distribution: DayBucket[];
  weekday_distribution: WeekdayBucket[];
  monthly_distribution: MonthBucket[];
  top10_hours: HourBucket[];
  top10_days: DayBucket[];
  heatmap_day_hour: HeatmapCell[];
  weekend_vs_weekday: { weekday_avg: number; weekend_avg: number };
};

type SourceItem = {
  id: string;
  name: string;
  type: string;
  status: boolean;
  fps_target: number;
  resolution: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

const PALETTE = {
  primary:   "#4ade80",
  secondary: "#34d399",
  accent:    "#fbbf24",
  danger:    "#f87171",
  purple:    "#a78bfa",
  pink:      "#f472b6",
  bg:        "#022c22",
  surface:   "#064e3b",
  border:    "#065f46",
  text:      "#ecfdf5",
  muted:     "#a7f3d0",
};

function fmt(n: number, decimals = 1) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(decimals);
}

function growthColor(rate: number) {
  if (rate > 0) return "#4ade80";
  if (rate < 0) return "#f87171";
  return "#94a3b8";
}

function growthIcon(rate: number) {
  if (rate > 0) return "↑";
  if (rate < 0) return "↓";
  return "→";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color = PALETTE.primary
}: { label: string; value: string | number; sub?: string; color?: string; }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${PALETTE.surface} 0%, ${PALETTE.bg} 100%)`,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 12,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle at top right, ${color}22, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <span style={{ fontSize: 26, fontWeight: 700, color: PALETTE.text, letterSpacing: -0.5 }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: PALETTE.muted, fontWeight: 500 }}>{label}</span>
      {sub && (
        <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>{sub}</span>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: PALETTE.text, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: PALETTE.muted, margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children, span = 1 }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{
      background: PALETTE.surface,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 12,
      padding: "18px 16px",
      gridColumn: span > 1 ? `span ${span}` : undefined,
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: PALETTE.muted, marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: PALETTE.bg, border: `1px solid ${PALETTE.border}`, borderRadius: 8, fontSize: 12 },
  labelStyle: { color: PALETTE.muted },
  itemStyle: { color: PALETTE.text },
};

// Type-safe recharts formatter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtTooltip = (label: string) => (v: any) => [Number(v).toFixed(1), label] as [string, string];

// ─── Heatmap Component ────────────────────────────────────────────────────────

function Heatmap({ cells, maxVal }: { cells: HeatmapCell[]; maxVal: number }) {
  const cellMap = useMemo(() => {
    const m: Record<string, number> = {};
    cells.forEach(c => { m[`${c.weekday}-${c.hour}`] = c.count; });
    return m;
  }, [cells]);

  const getColor = (val: number) => {
    if (!val || maxVal === 0) return PALETTE.surface;
    const intensity = Math.max(0.1, val / maxVal);
    return `rgba(52, 211, 153, ${intensity})`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `48px repeat(24, 1fr)`, gap: 2, minWidth: 600 }}>
        {/* Header row */}
        <div />
        {HOUR_LABELS.map(h => (
          <div key={h} style={{ fontSize: 8, color: PALETTE.muted, textAlign: "center", paddingBottom: 2 }}>
            {h.replace(":00", "")}
          </div>
        ))}
        {/* Data rows */}
        {DAY_NAMES.map((day, di) => (
          <Fragment key={day}>
            <div key={`d-${di}`} style={{ fontSize: 10, color: PALETTE.muted, display: "flex", alignItems: "center" }}>{day}</div>
            {Array.from({ length: 24 }, (_, hi) => {
              const val = cellMap[`${di}-${hi}`] ?? 0;
              return (
                <div
                  key={`${di}-${hi}`}
                  title={`${day} ${HOUR_LABELS[hi]}: avg ${val.toFixed(1)} people`}
                  style={{
                    height: 16,
                    borderRadius: 2,
                    background: getColor(val),
                    cursor: "default",
                    transition: "transform 0.1s",
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: PALETTE.muted }}>Low</span>
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <div key={v} style={{
            width: 24, height: 10, borderRadius: 2,
            background: getColor(v * maxVal),
          }} />
        ))}
        <span style={{ fontSize: 10, color: PALETTE.muted }}>High</span>
      </div>
    </div>
  );
}

// ─── AI Insights Engine ───────────────────────────────────────────────────────

function generateInsights(stats: DashboardStats | null, logs: LogEntry[]): string[] {
  if (!stats || logs.length === 0) return ["Tidak cukup data untuk analisis. Pastikan sistem monitoring aktif."];
  const insights: string[] = [];

  // Peak hour detection
  if (stats.top10_hours?.length > 0) {
    const peak = stats.top10_hours[0];
    insights.push(`Jam tersibuk: ${peak.hour.toString().padStart(2, "0")}:00 dengan rata-rata ${peak.count.toFixed(1)} orang.`);
  }

  // Hourly pattern
  if (stats.hourly_distribution?.length > 2) {
    const sorted = [...stats.hourly_distribution].sort((a, b) => b.count - a.count);
    const morning = sorted.filter(h => h.hour >= 6 && h.hour < 12);
    const afternoon = sorted.filter(h => h.hour >= 12 && h.hour < 18);
    if (morning.length > 0 && afternoon.length > 0) {
      const morningAvg = morning.reduce((s, h) => s + h.count, 0) / morning.length;
      const afternoonAvg = afternoon.reduce((s, h) => s + h.count, 0) / afternoon.length;
      if (morningAvg > afternoonAvg * 1.2) insights.push("Pola keramaian cenderung lebih tinggi di pagi hari dibanding sore hari.");
      else if (afternoonAvg > morningAvg * 1.2) insights.push("Pola keramaian cenderung lebih tinggi di sore hari dibanding pagi hari.");
    }
  }

  // Weekend vs weekday
  const { weekday_avg, weekend_avg } = stats.weekend_vs_weekday || {};
  if (weekday_avg > 0 || weekend_avg > 0) {
    if (weekday_avg > weekend_avg * 1.3) {
      insights.push(`Hari kerja jauh lebih ramai (avg ${weekday_avg.toFixed(1)}) dibanding akhir pekan (avg ${weekend_avg.toFixed(1)}).`);
    } else if (weekend_avg > weekday_avg * 1.3) {
      insights.push(`Akhir pekan lebih ramai (avg ${weekend_avg.toFixed(1)}) dibanding hari kerja (avg ${weekday_avg.toFixed(1)}).`);
    } else {
      insights.push(`Distribusi antara hari kerja dan akhir pekan relatif seimbang.`);
    }
  }

  // Growth trend
  if (stats.month_growth_rate !== 0) {
    const dir = stats.month_growth_rate > 0 ? "meningkat" : "menurun";
    insights.push(`Tren bulan ini ${dir} sebesar ${Math.abs(stats.month_growth_rate).toFixed(1)}% dibanding bulan lalu.`);
  }

  // Anomaly detection from raw logs
  if (logs.length > 10) {
    const counts = logs.map(l => l.head_count);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const std = Math.sqrt(counts.reduce((s, c) => s + (c - mean) ** 2, 0) / counts.length);
    const anomalies = logs.filter(l => Math.abs(l.head_count - mean) > 2 * std);
    if (anomalies.length > 0) {
      insights.push(`Terdeteksi ${anomalies.length} anomali (outlier >2σ dari rata-rata ${mean.toFixed(1)} orang).`);
    } else {
      insights.push(`Tidak ada anomali signifikan terdeteksi. Data relatif stabil.`);
    }
  }

  // Operational recommendation
  if (stats.avg_daily_count > 0) {
    const peak = stats.peak_count;
    const avg = stats.avg_daily_count;
    if (peak > avg * 3) {
      insights.push(`Rekomendasi: Sediakan kapasitas cadangan untuk mengakomodasi lonjakan trafik hingga ${peak} orang (${((peak / avg) * 100).toFixed(0)}% dari rata-rata).`);
    }
  }

  // Lowest activity
  if (stats.hourly_distribution?.length > 0) {
    const lowest = [...stats.hourly_distribution].sort((a, b) => a.count - b.count)[0];
    insights.push(`Aktivitas paling sepi pada jam ${lowest.hour.toString().padStart(2, "0")}:00 (avg ${lowest.count.toFixed(1)} orang), waktu ideal untuk pemeliharaan.`);
  }

  return insights;
}

// ─── Raw Data Table ───────────────────────────────────────────────────────────

function RawDataTable({ logs, sources }: { logs: LogEntry[]; sources: SourceItem[] }) {
  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const PER_PAGE = 15;

  const sourceNames = useMemo(() => [...new Set(logs.map(l => l.source_name))], [logs]);

  const filtered = useMemo(() => {
    let result = logs;
    if (selectedSource) result = result.filter(l => l.source_name === selectedSource);
    if (search) result = result.filter(l =>
      l.source_name.toLowerCase().includes(search.toLowerCase()) ||
      l.head_count.toString().includes(search)
    );
    return [...result].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
  }, [logs, search, selectedSource, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCSV = () => {
    const header = "ID,Source,HeadCount,FPS,Timestamp,CreatedAt\n";
    const rows = filtered.map(l =>
      `${l.id},${l.source_name},${l.head_count},${l.current_fps.toFixed(2)},${l.timestamp},${l.created_at}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "head_count_logs.csv"; a.click();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search..." style={INPUT_STYLE}
        />
        <select value={selectedSource} onChange={e => { setSelectedSource(e.target.value); setPage(1); }} style={INPUT_STYLE}>
          <option value="">All Sources</option>
          {sourceNames.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")} style={BTN_STYLE}>
          {sortDir === "desc" ? "↓ Newest" : "↑ Oldest"}
        </button>
        <button onClick={exportCSV} style={{ ...BTN_STYLE, background: PALETTE.surface, borderColor: PALETTE.primary }}>
          Export CSV
        </button>
        <span style={{ fontSize: 12, color: PALETTE.muted, alignSelf: "center" }}>
          {filtered.length} records
        </span>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${PALETTE.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: PALETTE.bg }}>
              {["#", "Source", "Head Count", "FPS", "Timestamp"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: PALETTE.muted }}>No records found</td></tr>
            ) : paginated.map((log, i) => (
              <tr key={log.id} style={{ background: i % 2 === 0 ? PALETTE.surface : PALETTE.bg, borderBottom: `1px solid ${PALETTE.border}` }}>
                <td style={{ padding: "8px 12px", color: PALETTE.muted }}>{(page - 1) * PER_PAGE + i + 1}</td>
                <td style={{ padding: "8px 12px", color: PALETTE.text }}>{log.source_name}</td>
                <td style={{ padding: "8px 12px", fontWeight: 700, color: PALETTE.primary }}>{log.head_count}</td>
                <td style={{ padding: "8px 12px", color: PALETTE.muted }}>{log.current_fps.toFixed(1)}</td>
                <td style={{ padding: "8px 12px", color: PALETTE.muted, whiteSpace: "nowrap" }}>
                  {new Date(log.timestamp).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center", alignItems: "center" }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={BTN_STYLE}>‹ Prev</button>
          <span style={{ color: PALETTE.muted, fontSize: 12 }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={BTN_STYLE}>Next ›</button>
        </div>
      )}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  background: PALETTE.bg, border: `1px solid ${PALETTE.border}`, borderRadius: 6,
  color: "#e2e8f0", padding: "6px 12px", fontSize: 12, outline: "none",
};
const BTN_STYLE: React.CSSProperties = {
  background: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 6,
  color: "#e2e8f0", padding: "6px 12px", fontSize: 12, cursor: "pointer",
};

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveSource, setLiveSource] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const sourceParam = selectedSource ? `source=${encodeURIComponent(selectedSource)}&` : "";

      const [statsRes, logsRes, sourcesRes] = await Promise.allSettled([
        fetch(`/api/logs/stats?${sourceParam.replace('&', '')}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/logs?${sourceParam}limit=2000`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/sources`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const data = await statsRes.value.json();
        setStats(data);
      }
      if (logsRes.status === "fulfilled" && logsRes.value.ok) {
        const data = await logsRes.value.json();
        setLogs(data.logs ?? []);
      }
      if (sourcesRes.status === "fulfilled" && sourcesRes.value.ok) {
        const data = await sourcesRes.value.json();
        setSources(data.sources ?? []);
      }
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [token, selectedSource]);

  // WebSocket connection
  useEffect(() => {
    if (!token) return;
    const wsUrl = process.env.NEXT_PUBLIC_BE_CORE_WS_URL || "ws://localhost:8080";
    const ws = new WebSocket(`${wsUrl}/ws`);
    wsRef.current = ws;
    setWsStatus("connecting");

    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => setWsStatus("disconnected");
    ws.onerror = () => setWsStatus("disconnected");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LogEntry;
        if (data.head_count !== undefined) {
          setLiveCount(data.head_count);
          setLiveSource(data.source_name);
          setLastUpdate(new Date());
          // Prepend new log to the logs list
          setLogs(prev => [data, ...prev.slice(0, 1999)]);
        }
      } catch {}
    };

    return () => ws.close();
  }, [token]);

  // Auth guard
  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetchAll();
  }, [token, router, fetchAll]);

  // Auto-refresh
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) {
      timerRef.current = setInterval(fetchAll, refreshInterval * 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, refreshInterval, fetchAll]);

  // Computed insights
  const insights = useMemo(() => generateInsights(stats, logs), [stats, logs]);

  // Heatmap max value
  const heatmapMax = useMemo(() =>
    Math.max(...(stats?.heatmap_day_hour?.map(c => c.count) ?? [1]), 1),
    [stats]
  );

  // Per-source comparison from logs
  const perSourceData = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    logs.forEach(l => {
      if (!map[l.source_name]) map[l.source_name] = { count: 0, total: 0 };
      map[l.source_name].count++;
      map[l.source_name].total += l.head_count;
    });
    return Object.entries(map).map(([name, d]) => ({
      name, avg: d.count > 0 ? d.total / d.count : 0, records: d.count
    }));
  }, [logs]);

  // Histogram bins
  const histogramData = useMemo(() => {
    if (logs.length === 0) return [];
    const counts = logs.map(l => l.head_count);
    const min = Math.min(...counts), max = Math.max(...counts);
    const bins = 10;
    const step = Math.max(1, Math.ceil((max - min) / bins));
    const buckets: { range: string; count: number }[] = [];
    for (let i = min; i <= max; i += step) {
      const lo = i, hi = i + step;
      buckets.push({ range: `${lo}-${hi}`, count: counts.filter(c => c >= lo && c < hi).length });
    }
    return buckets;
  }, [logs]);

  // Weekly comparison
  const weeklyCompare = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const thisWeek: Record<string, number> = {};
    const lastWeek: Record<string, number> = {};

    logs.forEach(l => {
      const ts = new Date(l.timestamp);
      const dayName = DAY_NAMES[ts.getDay()];
      if (ts >= startOfThisWeek) {
        thisWeek[dayName] = (thisWeek[dayName] || 0) + 1;
      } else if (ts >= startOfLastWeek) {
        lastWeek[dayName] = (lastWeek[dayName] || 0) + 1;
      }
    });

    return DAY_NAMES.map(d => ({
      day: d, thisWeek: thisWeek[d] || 0, lastWeek: lastWeek[d] || 0
    }));
  }, [logs]);

  const activeSourceCount = sources.filter(s => s.status).length;

  if (loading) {
    return (
      <AppShell title="Dashboard" variant="dashboard">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, border: `3px solid ${PALETTE.border}`, borderTopColor: PALETTE.primary,
              borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px"
            }} />
            <p style={{ color: PALETTE.muted, fontSize: 14 }}>Memuat data dashboard...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard" variant="dashboard">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .dash-section { margin-bottom: 28px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .chart-grid { display: grid; gap: 12px; }
        .chart-grid-2 { grid-template-columns: 1fr 1fr; }
        .chart-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        @media (max-width: 900px) { .chart-grid-2,.chart-grid-3 { grid-template-columns: 1fr; } .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ padding: "0 0 24px", fontFamily: "system-ui, -apple-system, sans-serif", color: PALETTE.text }}>

        {/* ─── Top bar ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: PALETTE.text, margin: 0 }}>Analytics Dashboard</h1>
            <p style={{ fontSize: 12, color: PALETTE.muted, margin: "4px 0 0" }}>
              Monitoring real-time head count
              {lastUpdate && ` · Last update: ${lastUpdate.toLocaleTimeString("id-ID")}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* WS status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: wsStatus === "connected" ? "#4ade80" : wsStatus === "connecting" ? "#f59e0b" : "#f87171",
                animation: wsStatus === "connecting" ? "pulse 1s infinite" : undefined,
              }} />
              <span style={{ color: PALETTE.muted }}>
                {wsStatus === "connected" ? "Live" : wsStatus === "connecting" ? "Connecting..." : "Offline"}
              </span>
            </div>

            {/* Source filter */}
            <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)} style={{ ...INPUT_STYLE, height: 32 }}>
              <option value="">All Sources</option>
              {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>

            {/* Auto-refresh toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: "6px 12px" }}>
              <label style={{ fontSize: 12, color: PALETTE.muted, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ cursor: "pointer" }} />
                Auto-refresh
              </label>
              {autoRefresh && (
                <select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))} style={{ ...INPUT_STYLE, padding: "2px 6px", height: 24 }}>
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={300}>5m</option>
                </select>
              )}
            </div>

            <button onClick={fetchAll} style={{ ...BTN_STYLE, display: "flex", alignItems: "center", gap: 6 }}>
              Refresh
            </button>
          </div>
        </div>

        {/* Live banner */}
        {liveCount !== null && (
          <div style={{
            background: "linear-gradient(90deg, #064e3b, #065f46)",
            border: "1px solid #059669", borderRadius: 10, padding: "10px 16px",
            marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 10, height: 10, background: "#4ade80", borderRadius: "50%", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#a7f3d0" }}>
              LIVE: <span style={{ color: "#4ade80", fontSize: 20 }}>{liveCount}</span> orang terdeteksi
              <span style={{ fontSize: 12, color: "#6ee7b7", marginLeft: 8 }}>di {liveSource}</span>
            </span>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SECTION 1: Executive Metrics
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="dash-section">
          <SectionHeader title="Executive Metrics" subtitle="Ringkasan statistik kunjungan" />
          <div className="kpi-grid">
            <KpiCard label="Total Records" value={fmt(stats?.total_count ?? 0, 0)} color={PALETTE.primary} />
            <KpiCard label="Hari Ini" value={fmt(stats?.today_count ?? 0, 0)} color={PALETTE.secondary} />
            <KpiCard label="Minggu Ini" value={fmt(stats?.week_count ?? 0, 0)}
              sub={stats?.week_growth_rate !== undefined ? `${growthIcon(stats.week_growth_rate)} ${Math.abs(stats.week_growth_rate).toFixed(1)}% vs minggu lalu` : undefined}
              color={growthColor(stats?.week_growth_rate ?? 0)} />
            <KpiCard label="Bulan Ini" value={fmt(stats?.month_count ?? 0, 0)}
              sub={stats?.month_growth_rate !== undefined ? `${growthIcon(stats.month_growth_rate)} ${Math.abs(stats.month_growth_rate).toFixed(1)}% vs bulan lalu` : undefined}
              color={growthColor(stats?.month_growth_rate ?? 0)} />
            <KpiCard label="Peak Count" value={stats?.peak_count ?? 0} color={PALETTE.accent} />
            <KpiCard label="Avg Harian" value={fmt(stats?.avg_daily_count ?? 0)} color={PALETTE.purple} />
            <KpiCard label="Avg Per Jam" value={fmt(stats?.avg_hourly_count ?? 0)} color={PALETTE.pink} />
            <KpiCard label="Active Sources" value={`${activeSourceCount}/${sources.length}`} color={activeSourceCount > 0 ? "#4ade80" : "#f87171"} />
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SECTION 2: Traffic Trends
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="dash-section">
          <SectionHeader title="Traffic Trends" subtitle="Tren historis kunjungan" />
          <div className="chart-grid chart-grid-2">
            <ChartCard title="Rata-rata Jumlah Orang per Jam (dalam sehari)">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats?.hourly_distribution ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETTE.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={PALETTE.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={fmtTooltip("Avg People")} labelFormatter={h => `Hour ${h}:00`} />
                  <Area type="monotone" dataKey="count" stroke={PALETTE.primary} fill="url(#gradH)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Rata-rata Jumlah Orang per Hari (90 hari terakhir)">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats?.daily_distribution ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETTE.secondary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={PALETTE.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: PALETTE.muted }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={fmtTooltip("Avg People")} />
                  <Area type="monotone" dataKey="count" stroke={PALETTE.secondary} fill="url(#gradD)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Rata-rata per Bulan">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats?.monthly_distribution ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={fmtTooltip("Avg People")} />
                  <Bar dataKey="count" fill={PALETTE.purple} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Distribusi per Hari dalam Seminggu">
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={stats?.weekday_distribution ?? []}>
                  <PolarGrid stroke={PALETTE.border} />
                  <PolarAngleAxis dataKey="weekday" tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <Radar dataKey="count" stroke={PALETTE.accent} fill={PALETTE.accent} fillOpacity={0.3} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={fmtTooltip("Avg People")} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SECTION 3: Peak Activity
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="dash-section">
          <SectionHeader title="Peak Activity" subtitle="Jam dan hari tersibuk" />
          <div className="chart-grid chart-grid-2">
            <ChartCard title="Top 10 Jam Tersibuk (rata-rata tertinggi)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats?.top10_hours ?? []} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <YAxis type="category" dataKey="hour" tickFormatter={h => `${h}:00`} tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={fmtTooltip("Avg People")} labelFormatter={h => `Hour ${h}:00`} />
                  <Bar dataKey="count" fill={PALETTE.accent} radius={[0, 4, 4, 0]}>
                    {(stats?.top10_hours ?? []).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#f59e0b" : i === 1 ? "#fb923c" : "#4ade80"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 Hari Tersibuk">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats?.top10_days ?? []} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <YAxis type="category" dataKey="date" tick={{ fontSize: 9, fill: PALETTE.muted }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={fmtTooltip("Avg People")} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(stats?.top10_days ?? []).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#f59e0b" : i === 1 ? "#fb923c" : "#22d3ee"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SECTION 4: Heatmap
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="dash-section">
          <SectionHeader title="Heatmap Aktivitas" subtitle="Kepadatan per hari vs jam" />
          <ChartCard title="Heatmap: Hari dalam Seminggu vs Jam" span={2}>
            {(stats?.heatmap_day_hour?.length ?? 0) === 0 ? (
              <p style={{ color: PALETTE.muted, fontSize: 13, textAlign: "center", padding: 24 }}>
                Belum ada cukup data untuk heatmap.
              </p>
            ) : (
              <Heatmap cells={stats!.heatmap_day_hour} maxVal={heatmapMax} />
            )}
          </ChartCard>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SECTION 5: Analytics & Insights
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="dash-section">
          <SectionHeader title="Analytics & AI Insights" subtitle="Analisis pola dan rekomendasi otomatis" />
          <div className="chart-grid chart-grid-3">
            {/* Histogram */}
            <ChartCard title="Distribusi Head Count (Histogram)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histogramData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="range" tick={{ fontSize: 9, fill: PALETTE.muted }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={PALETTE.purple} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Weekday vs Weekend */}
            <ChartCard title="Hari Kerja vs Akhir Pekan">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { label: "Hari Kerja", avg: stats?.weekend_vs_weekday?.weekday_avg ?? 0 },
                    { label: "Akhir Pekan", avg: stats?.weekend_vs_weekday?.weekend_avg ?? 0 },
                  ]}
                  margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: PALETTE.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={fmtTooltip("Avg People")} />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    <Cell fill={PALETTE.secondary} />
                    <Cell fill={PALETTE.accent} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Per-source comparison */}
            <ChartCard title="Perbandingan Antar Sumber (Kamera)">
              {perSourceData.length === 0 ? (
                <p style={{ color: PALETTE.muted, fontSize: 13, textAlign: "center", padding: 24 }}>Tidak ada data sumber.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={perSourceData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: PALETTE.muted }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: PALETTE.muted }} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={fmtTooltip("Avg People")} />
                    <Bar dataKey="avg" fill={PALETTE.pink} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Minggu ini vs minggu lalu */}
            <ChartCard title="Minggu Ini vs Minggu Lalu" span={2}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyCompare} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: PALETTE.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: PALETTE.muted }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                  <Bar dataKey="thisWeek" name="Minggu Ini" fill={PALETTE.primary} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="lastWeek" name="Minggu Lalu" fill={PALETTE.border} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* AI Insights */}
            <ChartCard title="AI Insights & Rekomendasi">
              <div style={{ display: "flex", flexDirection: "column", gap: 8, height: 200, overflowY: "auto" }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{
                    background: PALETTE.bg, border: `1px solid ${PALETTE.border}`, borderRadius: 8,
                    padding: "8px 12px", fontSize: 12, color: PALETTE.text, lineHeight: 1.5,
                  }}>
                    {ins}
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SECTION 6: Raw Data Table
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="dash-section">
          <SectionHeader title="Raw Data" subtitle="Tabel data dengan filter, sorting, dan pagination" />
          <div style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 16 }}>
            <RawDataTable logs={logs} sources={sources} />
          </div>
        </div>

      </div>
    </AppShell>
  );
}
