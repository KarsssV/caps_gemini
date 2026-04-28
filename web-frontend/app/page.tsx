import Image from "next/image";
import AppShell from "../components/app-shell";

const stats = [
  { label: "Total Employee", value: 160, valueClass: "text-white" },
  { label: "Safe", value: 40, valueClass: "text-lime-400" },
  { label: "Missing", value: 20, valueClass: "text-red-500" },
];

export default function HomePage() {
  return (
    <AppShell title="Dashboard" variant="dashboard">
      <div className="h-full rounded-sm border border-[#2f8e4c]/70 bg-[linear-gradient(140deg,#145e35_0%,#1d7a43_65%,#1f6b3c_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl bg-[radial-gradient(circle_at_55%_45%,rgba(44,130,70,0.45)_0%,rgba(15,74,44,0.98)_85%)] px-6 py-5 text-center shadow-[0_10px_30px_rgba(4,26,14,0.33)]"
            >
              <h2 className="text-[42px] leading-tight font-medium text-white/92 md:text-[44px]">{item.label}</h2>
              <p className={`mt-1 text-[46px] font-medium md:text-[50px] ${item.valueClass}`}>{item.value}</p>
            </article>
          ))}
        </div>

        <section className="mt-4 rounded-2xl bg-[#114a2b] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.25)] md:p-5">
          <h3 className="mb-3 text-5xl font-medium text-white/96">Camera Feed</h3>
          <div className="relative h-[55vh] min-h-90 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#213d2e]">
            <Image
              src="/surveillance.svg"
              alt="CCTV camera placeholder"
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}