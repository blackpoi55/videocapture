"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const isLoginPath = (path: string) => {
  if (!path) return false;
  return path === "/login" || path.startsWith("/login/");
};

const decodeJwtExp = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "="));
    const data = JSON.parse(json) as { exp?: number };
    return typeof data.exp === "number" ? data.exp : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string) => {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  return Date.now() / 1000 >= exp;
};

export default function AuthGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoginPath(pathname || "/")) return;

    let token: string | null = null;
    try {
      token = localStorage.getItem("intraview_token");
    } catch {
      token = null;
    }

    if (!token || isTokenExpired(token)) {
      try {
        localStorage.removeItem("intraview_token");
        localStorage.removeItem("intraview_user");
      } catch {
        // ignore storage errors
      }
      router.replace("/login");
    }
  }, [pathname, router]);

  return null;
}
