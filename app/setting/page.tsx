"use client";

import { useState } from "react";
import { AccessSection } from "@/components/setting/AccessSection";
import { CameraSection } from "@/components/setting/CameraSection";
import { MasterSection } from "@/components/setting/MasterSection";
import { StorageSection } from "@/components/setting/StorageSection";

const sections = [
  { id: "master", title: "Master", subtitle: "ข้อมูลหน่วยงานและแบรนด์" },
  { id: "camera", title: "Camera Preset", subtitle: "พรีเซ็ตปรับภาพเริ่มต้น" },
  // { id: "storage", title: "Storage", subtitle: "โฟลเดอร์และรูปแบบไฟล์" },
  // { id: "access", title: "Access", subtitle: "สิทธิ์และผู้ใช้งาน" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function SettingPage() {
  const [active, setActive] = useState<SectionId>("master");

  return (
    <main className="relative min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-[380px] w-[380px] rounded-full bg-teal-200/45 blur-[130px]" />
        <div className="absolute right-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-amber-200/40 blur-[120px]" />
        <div className="absolute bottom-[-180px] left-[30%] h-[420px] w-[420px] rounded-full bg-sky-200/35 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.06)_1px,_transparent_0)] [background-size:22px_22px] opacity-40" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-full px-6 py-10">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Intraview · Settings</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">ตั้งค่า</h1>
              <p className="text-sm text-slate-500">จัดการค่าพื้นฐาน ระบบ และพรีเซ็ตเริ่มต้น</p>
            </div>
             
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[22px] border border-white/60 bg-white/70 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="space-y-2">
              {sections.map((item) => {
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition cursor-pointer ${isActive
                      ? "border-teal-400/50 bg-white text-slate-900 shadow-[0_14px_30px_rgba(20,184,166,0.18)]"
                      : "border-transparent bg-transparent text-slate-600 hover:border-white hover:bg-white/70"
                      }`}
                    aria-pressed={isActive}
                  >
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{item.subtitle}</div>
                  </button>
                );
              })}
            </div> 
          </aside>

          <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className={active === "master" ? "block" : "hidden"}>
              <MasterSection />
            </div>
            <div className={active === "camera" ? "block" : "hidden"}>
              <CameraSection active={active === "camera"} />
            </div>
            {/* <div className={active === "storage" ? "block" : "hidden"}>
              <StorageSection />
            </div>
            <div className={active === "access" ? "block" : "hidden"}>
              <AccessSection />
            </div> */}
          </section>
        </div>
      </div>
    </main>
  );
}
