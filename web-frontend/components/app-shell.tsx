"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import AccountSettingsModal from "./account-settings-modal";

type AppShellProps = {
  title: string;
  children: ReactNode;
  variant?: "default" | "dashboard";
};

const navItems = [
  { href: "/sources", label: "Sources", icon: "/globe.svg" },
  { href: "/head-counting", label: "Head Counting Data", icon: "/people.svg" },
  { href: "/head-counting/live-view", label: "Live View", icon: "/window.svg" },
] as const;

export default function AppShell({ title, children, variant = "default" }: AppShellProps) {
  const pathname = usePathname();
  const isDashboard = variant === "dashboard";
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  return (
    <main className={`min-h-screen p-4 text-white ${isDashboard ? "bg-[#303030]" : "bg-[#2a2a2a]"}`}>
      <section className="mx-auto flex min-h-[88vh] w-full max-w-410 overflow-hidden rounded-sm border border-[#2f8e4c]/45 bg-[#1f6b3c] shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
        <aside className="flex w-64 shrink-0 flex-col bg-[#0f4b2b] px-4 py-5">
          <div className="flex items-center justify-center px-2 py-5">
            <div className="relative h-20 w-36">
              <Image src="/logo-no-title.svg" alt="Logo" fill className="object-contain" sizes="112px" loading="eager" />
            </div>
          </div>

          <nav className="mt-6 space-y-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center gap-3 rounded-sm border px-3 py-2 text-sm transition ${
                    isActive
                      ? "border-[#e2c15d]/70 bg-[#d6be67]/25 text-white"
                      : "border-white/15 bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  <Image src={item.icon} alt={item.label} width={16} height={16} className="opacity-90" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto">
            <button
              type="button"
              onClick={() => setIsAccountModalOpen((current) => !current)}
              title="Account Settings"
              className="flex w-full items-center gap-3 rounded-sm border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/20"
            >
              <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/35 bg-[#d6be67] text-xs font-semibold text-[#1a3f26]">
                NU
              </div>
              <span>Account</span>
            </button>
          </div>
        </aside>

        <div className={`relative flex-1 ${isDashboard ? "bg-[#1f6b3c] px-6 py-5 text-white" : "bg-[#f4f4f4] px-4 py-4 text-[#1e1e1e] md:px-6"}`}>
          {isDashboard ? null : (
            <header className="mb-4 rounded-sm border border-black/10 bg-white/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-black/55">Monitoring System</p>
              <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
            </header>
          )}
          {children}
        </div>
      </section>

      <AccountSettingsModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} />
    </main>
  );
}