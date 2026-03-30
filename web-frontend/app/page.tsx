import Image from "next/image";

const stats = [
  { label: "Total Employee", value: 160, valueClass: "text-white" },
  { label: "Safe", value: 40, valueClass: "text-lime-400" },
  { label: "Missing", value: 20, valueClass: "text-red-500" },
];

function SidebarIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-8 w-8 opacity-90 transition hover:opacity-100">
      <Image src={src} alt={alt} fill className="object-contain" sizes="32px" />
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#2a2a2a] p-4 text-white">
      <section className="mx-auto flex h-245.5 w-full max-w-378 overflow-hidden rounded-sm border border-[#2f8e4c]/45 bg-[#1f6b3c] shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
        <aside className="flex w-26 flex-col items-center justify-between bg-[#0f4b2b] py-4">
          <div className="relative h-15.5 w-25.75">
            <Image src="/logo-no-title.svg" alt="Logo" fill className="object-contain" sizes="103px" />
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-8">
            <SidebarIcon src="/home.svg" alt="Dashboard" />
            <SidebarIcon src="/people.svg" alt="People" />
          </nav>

          <SidebarIcon src="/log-out.svg" alt="Log out" />
        </aside>

        <div className="flex-1 px-5 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {stats.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl bg-[radial-gradient(circle_at_center,rgba(43,120,66,0.36)_0%,rgba(17,74,43,0.95)_80%)] px-6 py-5 text-center shadow-[0_10px_32px_rgba(5,28,15,0.32)]"
              >
                <h2 className="text-[26px] font-medium text-white/90 md:text-[45px] md:leading-tight">{item.label}</h2>
                <p className={`mt-1 text-[44px] font-medium md:text-[52px] ${item.valueClass}`}>{item.value}</p>
              </article>
            ))}
          </div>

          <section className="mt-6 h-169.75 w-full max-w-312.25 rounded-2xl bg-[#114a2b] p-5.5 shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
            <h3 className="mb-4 text-4xl font-medium text-white/95">Camera Feed</h3>
            <div className="relative h-[calc(100%-52px)] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#213d2e]">
              <Image
                src="/surveillance.svg"
                alt="CCTV camera placeholder"
                fill
                className="object-cover"
                sizes="(max-width: 1512px) 100vw, 1249px"
                priority
              />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}