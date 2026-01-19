"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "Capture" },
  { href: "/calenda", label: "Calenda" },
  { href: "/register", label: "Register" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const normalizePath = (value: string) => (value === "/" ? "/" : value.replace(/\/+$/, ""));
  const cleanPath = normalizePath(pathname || "/");
  const linkBase =
    "rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-150 border";
  const linkInactive =
    "text-slate-200/70 bg-slate-900/35 border-slate-400/20 hover:text-slate-100 hover:bg-slate-800/70 hover:border-slate-400/40";
  const linkActive =
    "text-slate-900 font-extrabold bg-gradient-to-br from-teal-300/95 to-blue-500/90 border-sky-300/80 shadow-[0_10px_24px_rgba(59,130,246,0.28)]";

  return (
    <nav
      className="sticky top-0 z-50 border-b border-slate-400/20 bg-slate-950/70 backdrop-blur-lg print:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-3 py-3 max-[720px]:flex-col max-[720px]:items-start">
        <div className="flex items-center gap-4 flex-wrap">
          <div onClick={() => router.push("/")} className="flex cursor-pointer items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-emerald-300/40 bg-gradient-to-br from-emerald-400/35 to-emerald-700/10 font-bold uppercase tracking-[0.16em] text-slate-200">
              IV
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-bold uppercase tracking-[0.32em] text-slate-200">Intraview</div>
              <div className="mt-0.5 text-[12px] text-slate-200/60">Video Capture Suite</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const href = normalizePath(item.href);
              const isActive = cleanPath === href || (href !== "/" && cleanPath.startsWith(`${href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${linkBase} ${isActive ? linkActive : linkInactive}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 max-[720px]:w-full max-[720px]:justify-end">
          <button
            type="button"
            className="rounded-full border border-slate-400/35 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-slate-200/80 transition hover:border-slate-300/60"
          >
            Login
          </button>
          <button
            type="button"
            className="rounded-full border border-emerald-300/40 bg-gradient-to-br from-emerald-400/35 to-emerald-700/55 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-slate-100 transition hover:-translate-y-0.5 hover:border-slate-300/60"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
