"use client";
 
import { useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

type PatientForm = {
  hn: string;
  an: string;
  prefix: string;
  firstName: string;
  lastName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  age: string;
  nationality: string;
  sex: string;
  phone: string;
  patientType: {
    op: boolean;
    ward: boolean;
    refer: boolean;
  };
  note: string;
};

type HnStatus = "idle" | "loading" | "found" | "notfound";
 

const mockRecord: PatientForm = {
  hn: "12345678",
  an: "AN-5099",
  prefix: "นาย",
  firstName: "ปณต",
  lastName: "วีระสุข",
  dobDay: "09",
  dobMonth: "10",
  dobYear: "2539",
  age: "29",
  nationality: "ไทย",
  sex: "ชาย",
  phone: "089-555-1234",
  patientType: { op: true, ward: false, refer: false },
  note: "ผู้ป่วยติดตามตรวจ Intraview ทุก 6 เดือน",
};

const emptyForm: PatientForm = {
  hn: "",
  an: "",
  prefix: "",
  firstName: "",
  lastName: "",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
  age: "",
  nationality: "",
  sex: "",
  phone: "",
  patientType: { op: false, ward: false, refer: false },
  note: "",
};

const prefixOptions = ["นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ."];
const sexOptions = ["ชาย", "หญิง", "ไม่ระบุ"];
const nationalityOptions = ["ไทย", "ต่างชาติ"];

const labelClass = "text-[12px] uppercase tracking-[0.18em] text-slate-500/70";
const fieldClass =
  "rounded-2xl border border-slate-300/60 bg-slate-50/90 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500/70 focus:ring-2 focus:ring-teal-400/20";
const statusBaseClass =
  "rounded-full border bg-white/90 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em]";
const statusTone: Record<HnStatus, string> = {
  idle: "border-slate-300/60 text-slate-500",
  loading: "border-blue-500/60 text-blue-600",
  found: "border-emerald-500/70 text-emerald-600",
  notfound: "border-rose-400/70 text-rose-500",
};
const actionBaseClass =
  "rounded-full px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.16em] transition";
const ghostButtonClass = `${actionBaseClass} border border-teal-400/40 bg-teal-500/10 text-teal-700 hover:bg-teal-500/20`;
const primaryButtonClass = `${actionBaseClass} bg-teal-500 text-white hover:bg-teal-600`;

function formatDay(n: number) {
  return String(n).padStart(2, "0");
}

function formatMonth(n: number) {
  return String(n).padStart(2, "0");
}

export default function RegisterPage() {
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [mode, setMode] = useState<"create" | "update">("create");
  const [hnStatus, setHnStatus] = useState<HnStatus>("idle");
  const lastFetchedHnRef = useRef<string | null>(null);

  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => formatDay(i + 1)), []);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => formatMonth(i + 1)), []);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear() + 543;
    return Array.from({ length: 90 }, (_, i) => String(current - i));
  }, []);

  const updateField = (field: keyof PatientForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePatientType = (field: keyof PatientForm["patientType"], value: boolean) => {
    setForm((prev) => ({ ...prev, patientType: { ...prev.patientType, [field]: value } }));
  };

  const toast = (icon: "success" | "error" | "info", title: string, text?: string) =>
    Swal.fire({
      icon,
      title,
      text,
      toast: true,
      position: "top-end",
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    });

  const mockFetchByHn = async (hn: string) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (hn === "12345678") return mockRecord;
    return null;
  };

  const handleHnBlur = async (rawHn?: string) => {
    const hn = (rawHn ?? form.hn).replace(/\D/g, "");
    if (!hn) return;
    if (hn.length !== 8) {
      toast("error", "HN ต้องมี 8 หลัก");
      setHnStatus("idle");
      return;
    }
    if (lastFetchedHnRef.current === hn && hnStatus !== "idle") return;

    setHnStatus("loading");
    Swal.fire({
      title: "ค้นหา HN",
      text: "กำลังตรวจสอบข้อมูลในระบบ...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const result = await mockFetchByHn(hn);
    Swal.close();
    lastFetchedHnRef.current = hn;

    if (result) {
      setForm(result);
      setMode("update");
      setHnStatus("found");
      toast("success", "พบข้อมูลเดิมแล้ว", "สามารถแก้ไขและบันทึกได้เลย");
      return;
    }

    setMode("create");
    setHnStatus("notfound");
    setForm({ ...emptyForm, hn });
    toast("info", "ไม่พบข้อมูลเดิม", "กรอกข้อมูลเพิ่มเติมเพื่อเพิ่มผู้ป่วยใหม่");
  };

  const handleSave = async () => {
    const hn = form.hn.replace(/\D/g, "");
    if (hn.length !== 8) {
      toast("error", "กรุณากรอก HN ให้ครบ 8 หลัก");
      return;
    }
    if (!form.firstName || !form.lastName) {
      toast("error", "กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    Swal.fire({
      title: mode === "update" ? "บันทึกข้อมูล" : "เพิ่มข้อมูล",
      text: "กำลังบันทึกข้อมูลผู้ป่วย...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    await new Promise((resolve) => setTimeout(resolve, 900));
    Swal.close();
    toast("success", mode === "update" ? "บันทึกข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#fef9ef_0%,_#f7fbff_45%,_#eef6ff_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[120px] -left-[60px] h-[420px] w-[420px] rounded-full bg-[rgba(56,189,248,0.45)] blur-[140px] opacity-75" />
        <div className="absolute -bottom-[140px] -right-[40px] h-[420px] w-[420px] rounded-full bg-[rgba(16,185,129,0.35)] blur-[140px] opacity-75" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-full px-6 py-8 pb-16">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500/70">Intraview · Register</p>
            <h1 className="mt-2 text-[32px] font-semibold">ลงทะเบียนผู้ป่วย</h1>
            <p className="text-sm text-slate-500/70">กรอกข้อมูลใหม่หรืออัปเดตข้อมูลเดิมจาก HN</p>
          </div>
          <div className={`${statusBaseClass} ${statusTone[hnStatus]}`}>
            {hnStatus === "found" && "พบข้อมูลเดิม"}
            {hnStatus === "notfound" && "ยังไม่พบข้อมูล"}
            {hnStatus === "loading" && "กำลังค้นหา..."}
            {hnStatus === "idle" && "พร้อมกรอกข้อมูล"}
          </div>
        </header>

        <section className="rounded-[28px] border border-slate-300/40 bg-white/95 p-7 backdrop-blur-[24px] shadow-[0_30px_80px_rgba(148,163,184,0.35)]">
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-1 flex flex-col gap-2 md:col-span-2 lg:col-span-4">
              <label className={labelClass}>
                HN <span className="text-rose-400">*</span>
              </label>
              <input
                value={form.hn}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "");
                  updateField("hn", next);
                  if (next.length === 8) {
                    handleHnBlur(next);
                  }
                }}
                onBlur={(e) => handleHnBlur(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleHnBlur(e.currentTarget.value);
                  }
                }}
                placeholder="เช่น 12345678"
                maxLength={8}
                className={fieldClass}
              />
              <span className="text-xs text-slate-500/70">กรอก 8 หลัก แล้วระบบจะค้นหาอัตโนมัติ</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>AN</label>
              <input
                value={form.an}
                onChange={(e) => updateField("an", e.target.value)}
                placeholder="AN-0000"
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Prefix</label>
              <select value={form.prefix} onChange={(e) => updateField("prefix", e.target.value)} className={fieldClass}>
                <option value="">เลือกคำนำหน้า</option>
                {prefixOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>
                Firstname <span className="text-rose-400">*</span>
              </label>
              <input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} className={fieldClass} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>
                Lastname <span className="text-rose-400">*</span>
              </label>
              <input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} className={fieldClass} />
            </div>

            <div className="col-span-1 flex flex-col gap-2 md:col-span-2 lg:col-span-2">
              <label className={labelClass}>Date of Birth</label>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.dobDay} onChange={(e) => updateField("dobDay", e.target.value)} className={fieldClass}>
                  <option value="">DD</option>
                  {dayOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select value={form.dobMonth} onChange={(e) => updateField("dobMonth", e.target.value)} className={fieldClass}>
                  <option value="">MM</option>
                  {monthOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select value={form.dobYear} onChange={(e) => updateField("dobYear", e.target.value)} className={fieldClass}>
                  <option value="">YYYY</option>
                  {yearOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Age</label>
              <input value={form.age} onChange={(e) => updateField("age", e.target.value)} className={fieldClass} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Nationality</label>
              <select
                value={form.nationality}
                onChange={(e) => updateField("nationality", e.target.value)}
                className={fieldClass}
              >
                <option value="">เลือกสัญชาติ</option>
                {nationalityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Sex</label>
              <select value={form.sex} onChange={(e) => updateField("sex", e.target.value)} className={fieldClass}>
                <option value="">เลือกเพศ</option>
                {sexOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="08x-xxx-xxxx"
                className={fieldClass}
              />
            </div>

            <div className="col-span-1 flex flex-col gap-2 md:col-span-2 lg:col-span-4">
              <label className={labelClass}>Patient type</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-[13px] text-slate-800/80">
                  <input
                    type="checkbox"
                    checked={form.patientType.op}
                    onChange={(e) => updatePatientType("op", e.target.checked)}
                  />
                  OP
                </label>
                <label className="flex items-center gap-2 text-[13px] text-slate-800/80">
                  <input
                    type="checkbox"
                    checked={form.patientType.ward}
                    onChange={(e) => updatePatientType("ward", e.target.checked)}
                  />
                  Ward
                </label>
                <label className="flex items-center gap-2 text-[13px] text-slate-800/80">
                  <input
                    type="checkbox"
                    checked={form.patientType.refer}
                    onChange={(e) => updatePatientType("refer", e.target.checked)}
                  />
                  Refer
                </label>
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-2 md:col-span-2 lg:col-span-4">
              <label className={labelClass}>Note</label>
              <textarea value={form.note} onChange={(e) => updateField("note", e.target.value)} rows={3} className={fieldClass} />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={ghostButtonClass}
              onClick={() => {
                setForm(emptyForm);
                setMode("create");
                setHnStatus("idle");
                lastFetchedHnRef.current = null;
              }}
            >
              เคลียร์ฟอร์ม
            </button>
            <button type="button" className={primaryButtonClass} onClick={handleSave}>
              {mode === "update" ? "บันทึกข้อมูล" : "เพิ่มข้อมูล"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
