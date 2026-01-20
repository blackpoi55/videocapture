"use client";

import Link from "next/link";
import { useState } from "react";
import { loginapi } from "@/action/api";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

export default function Page() {
  const [username, setusername] = useState("Est");
  const [password, setPassword] = useState("11681168");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setErrorMessage(null);
    setLoading(true);
    const result = await loginapi({ username, password });
    setLoading(false);
    if (result && typeof result === "object" && "error" in result && result.error) {
      setErrorMessage(result.message || "เข้าสู่ระบบไม่สำเร็จ");
      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบไม่สำเร็จ",
        text: result.message || "กรุณาลองใหม่อีกครั้ง",
      });
      return;
    }

    const payload = result as {
      message?: string;
      token?: string;
      user?: { userid?: string; username?: string; usertype?: string };
    };
    if (!payload?.token || !payload?.user) {
      setErrorMessage("ไม่พบข้อมูลผู้ใช้จากระบบ");
      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบไม่สำเร็จ",
        text: "ไม่พบข้อมูลผู้ใช้จากระบบ",
      });
      return;
    }

    try {
      localStorage.setItem("intraview_token", payload.token);
      localStorage.setItem("intraview_user", JSON.stringify(payload.user));
      window.dispatchEvent(new Event("intraview-auth"));
    } catch {
      // ignore storage errors
    }

    Swal.fire({
      icon: "success",
      title: "เข้าสู่ระบบสำเร็จ",
      text: payload.message || "ยินดีต้อนรับกลับ",
      timer: 1500,
      showConfirmButton: false,
    });
    router.push("/calenda");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_12%_-10%,rgba(20,184,166,0.18),transparent),radial-gradient(1000px_520px_at_90%_0%,rgba(251,191,36,0.18),transparent),radial-gradient(700px_420px_at_50%_100%,rgba(56,189,248,0.12),transparent)]" />
        <div className="absolute -left-32 -top-28 h-[360px] w-[360px] rounded-full bg-teal-200/70 blur-[120px]" />
        <div className="absolute right-[-80px] top-[180px] h-[280px] w-[280px] rounded-full bg-amber-200/60 blur-[120px]" />
        <div className="absolute bottom-[-160px] left-[20%] h-[420px] w-[420px] rounded-full bg-sky-200/45 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.05)_1px,_transparent_0)] [background-size:22px_22px] opacity-35" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[420px] items-center px-6 py-12">
        <div className="relative w-full rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/70 via-white/20 to-transparent" />
          <div className="relative">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-teal-500 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(20,184,166,0.35)]">
                  IV
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Intraview</p>
                  <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
                </div>
              </div>
              <span className="rounded-full border border-slate-200/70 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                Secure
              </span>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block text-[11px] uppercase tracking-[0.22em] text-slate-500">
                อีเมล / รหัสพนักงาน
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  placeholder="name@clinic.com"
                  value={username}
                  onChange={(event) => setusername(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                />
              </label>

              <label className="block text-[11px] uppercase tracking-[0.22em] text-slate-500">
                รหัสผ่าน
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.06)] outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                />
              </label>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-teal-500" />
                  จำฉันไว้
                </label>
                <button type="button" className="text-teal-600 hover:text-teal-500">
                  ลืมรหัสผ่าน?
                </button>
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-2xl bg-teal-500 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_18px_40px_rgba(20,184,166,0.35)] transition hover:-translate-y-0.5 hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <span className="relative z-10">{loading ? "กำลังเข้าสู่ระบบ..." : "Sign in"}</span>
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 transition hover:opacity-100" />
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              ต้องการสิทธิ์ใช้งาน?{" "}
              <Link href="/" className="text-teal-600 hover:text-teal-500">
                ติดต่อผู้ดูแล
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
