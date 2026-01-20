"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Capture" },
  { href: "/calenda", label: "Calenda" },
  { href: "/register", label: "Register" },
  { href: "/setting", label: "Setting" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const normalizePath = (value: string) => (value === "/" ? "/" : value.replace(/\/+$/, ""));
  const cleanPath = normalizePath(pathname || "/");
  const linkBase =
    "rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-150 border";
  const linkInactive =
    "text-teal-100/70 bg-teal-500/10 border-teal-400/20 hover:text-teal-50 hover:bg-teal-500/20 hover:border-teal-400/50";
  const linkActive =
    "text-white font-extrabold bg-teal-500 border-teal-400/70 shadow-[0_10px_24px_rgba(20,184,166,0.35)]";

  const syncAuthState = () => {
    try {
      const rawUser = localStorage.getItem("intraview_user");
      const user = rawUser ? (JSON.parse(rawUser) as { username?: string; userid?: string }) : null;
      setUsername(user?.username || user?.userid || null);
    } catch {
      setUsername(null);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    syncAuthState();
    const handleAuthChange = () => syncAuthState();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "intraview_user" || event.key === "intraview_token") syncAuthState();
    };
    window.addEventListener("intraview-auth", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("intraview-auth", handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    syncAuthState();
  }, [pathname]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("intraview_token");
      localStorage.removeItem("intraview_user");
    } finally {
      setUsername(null);
      router.push("/login");
    }
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-slate-400/20 bg-slate-950/70 backdrop-blur-lg print:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-3 py-3 max-[720px]:flex-col max-[720px]:items-start">
        <div className="flex items-center gap-4 flex-wrap">
          <div onClick={() => router.push("/")} className="flex cursor-pointer items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] border border-teal-400/40 bg-teal-500/20 font-bold uppercase tracking-[0.16em] text-teal-50">
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
          {isReady && username ? (
            <>
              <div className="rounded-full border border-teal-400/30 bg-teal-500/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-100">
                {username}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-teal-400/60 bg-teal-500 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:border-teal-300/70 hover:bg-teal-600"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="rounded-full border border-teal-400/40 bg-teal-500/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-teal-50/80 transition hover:border-teal-300/60 hover:bg-teal-500/20"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
