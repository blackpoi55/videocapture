"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { getbyHN, getSelectTypes, getvaluebyselecttypeid, postPatient, putPatient } from "@/action/api";
import { SELECT_TYPE_CODES, SELECT_TYPE_IDS } from "@/config";

type SelectType = {
  id: string;
  code: string;
  desc: string;
};

type SelectOption = {
  id: string;
  code: string;
  label: string;
};

type PatientForm = {
  hn: string;
  an: string;
  prefixid: string;
  firstname: string;
  lastname: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  age: string;
  nationalityid: string;
  sexid: string;
  contactphone: string;
  patienttype: string;
  note: string;
};

type HnStatus = "idle" | "loading" | "found" | "notfound";

const emptyForm: PatientForm = {
  hn: "",
  an: "",
  prefixid: "",
  firstname: "",
  lastname: "",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
  age: "",
  nationalityid: "",
  sexid: "",
  contactphone: "",
  patienttype: "",
  note: "",
};

type SelectTypeKey = keyof typeof SELECT_TYPE_IDS;

const normalizeText = (value: unknown) => (value == null ? "" : String(value));

const normalizeCode = (value: string) => value.trim().toLowerCase();

const parseSelectTypes = (raw: unknown): SelectType[] => {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = normalizeText(row.id ?? row.selecttypeid).trim();
      const code = normalizeText(row.selecttypecode ?? row.code).trim();
      const desc = normalizeText(row.selecttypedesc ?? row.desc).trim();
      return id && code ? { id, code, desc } : null;
    })
    .filter(Boolean) as SelectType[];
};

const parseSelectOptions = (raw: unknown): SelectOption[] => {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = normalizeText(row.id ?? row.valueid).trim();
      const code = normalizeText(row.valuecode ?? row.code ?? row.value).trim();
      const desc = normalizeText(row.valuedesc ?? row.desc ?? row.label).trim();
      const label = desc || code;
      return id && label ? { id, code, label } : null;
    })
    .filter(Boolean) as SelectOption[];
};

const resolveTypeId = (key: SelectTypeKey, types: SelectType[]) => {
  const configured = SELECT_TYPE_IDS[key];
  if (configured) return configured;
  const code = SELECT_TYPE_CODES[key];
  if (!code) return "";
  const matched = types.find((item) => normalizeCode(item.code) === normalizeCode(code));
  return matched?.id ?? "";
};

const parsePatientTypeIds = (raw: unknown): string[] => {
  const extractId = (value: unknown) => {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return normalizeText(value).trim();
    if (typeof value === "object") {
      const row = value as Record<string, unknown>;
      return normalizeText(row.id ?? row.valueid ?? row.patienttypeid ?? row.patientTypeId ?? row.code ?? row.value).trim();
    }
    return normalizeText(value).trim();
  };

  if (Array.isArray(raw)) {
    return raw.map(extractId).filter(Boolean);
  }
  if (raw == null) return [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return parsePatientTypeIds(parsed);
      } catch {
        return trimmed
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      }
    }
    return trimmed
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (typeof raw === "object") {
    const id = extractId(raw);
    return id ? [id] : [];
  }
  const value = normalizeText(raw).trim();
  return value ? [value] : [];
};

const patientTypeToString = (raw: unknown) => {
  const ids = parsePatientTypeIds(raw);
  return ids.join(",");
};

const patientTypeToList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseDobParts = (raw: unknown) => {
  const dobRaw = normalizeText(raw).trim();
  const fallback = { dobDay: "", dobMonth: "", dobYear: "" };
  if (!dobRaw) return fallback;
  const date = new Date(dobRaw);
  if (Number.isNaN(date.getTime())) return fallback;
  return {
    dobDay: String(date.getDate()).padStart(2, "0"),
    dobMonth: String(date.getMonth() + 1).padStart(2, "0"),
    dobYear: String(date.getFullYear() + 543),
  };
};

const buildDateOfBirth = (dobDay: string, dobMonth: string, dobYear: string) => {
  if (!dobDay || !dobMonth || !dobYear) return "";
  const yearThai = Number(dobYear);
  const month = Number(dobMonth);
  const day = Number(dobDay);
  if (!Number.isFinite(yearThai) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const year = yearThai - 543;
  if (year < 1800) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const calculateAgeFromDob = (dobDay: string, dobMonth: string, dobYear: string) => {
  if (!dobDay || !dobMonth || !dobYear) return "";
  const yearThai = Number(dobYear);
  const month = Number(dobMonth);
  const day = Number(dobDay);
  if (!Number.isFinite(yearThai) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const year = yearThai - 543;
  if (year < 1800) return "";
  const dob = new Date(year, month - 1, day);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  if (age < 0) return "";
  return String(age);
};

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
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [prefixOptions, setPrefixOptions] = useState<SelectOption[]>([]);
  const [nationalityOptions, setNationalityOptions] = useState<SelectOption[]>([]);
  const [sexOptions, setSexOptions] = useState<SelectOption[]>([]);
  const [patientTypeOptions, setPatientTypeOptions] = useState<SelectOption[]>([]);
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

  const togglePatientType = (id: string, checked: boolean) => {
    setForm((prev) => {
      const current = patientTypeToList(prev.patienttype);
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { ...prev, patienttype: Array.from(next).join(",") };
    });
  };

  const toast = useCallback((icon: "success" | "error" | "info", title: string, text?: string) => {
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
  }, []);

  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        let types: SelectType[] = [];
        const needsTypes = Object.values(SELECT_TYPE_IDS).some((value) => !value);
        if (needsTypes) {
          const response = await getSelectTypes();
          if ((response as { error?: unknown })?.error) {
            throw new Error((response as { message?: string })?.message || "โหลดประเภทไม่สำเร็จ");
          }
          const raw = (response as { data?: unknown })?.data ?? response;
          types = parseSelectTypes(raw);
        }
        const typeIds = {
          prefix: resolveTypeId("prefix", types),
          nationality: resolveTypeId("nationality", types),
          sex: resolveTypeId("sex", types),
          patientType: resolveTypeId("patientType", types),
        };
        const [prefixRes, nationalityRes, sexRes, patientTypeRes] = await Promise.all([
          typeIds.prefix ? getvaluebyselecttypeid(typeIds.prefix) : Promise.resolve({ data: [] }),
          typeIds.nationality ? getvaluebyselecttypeid(typeIds.nationality) : Promise.resolve({ data: [] }),
          typeIds.sex ? getvaluebyselecttypeid(typeIds.sex) : Promise.resolve({ data: [] }),
          typeIds.patientType ? getvaluebyselecttypeid(typeIds.patientType) : Promise.resolve({ data: [] }),
        ]);
        if (!active) return;
        setPrefixOptions(parseSelectOptions((prefixRes as { data?: unknown })?.data ?? prefixRes));
        setNationalityOptions(parseSelectOptions((nationalityRes as { data?: unknown })?.data ?? nationalityRes));
        setSexOptions(parseSelectOptions((sexRes as { data?: unknown })?.data ?? sexRes));
        setPatientTypeOptions(parseSelectOptions((patientTypeRes as { data?: unknown })?.data ?? patientTypeRes));
      } catch (error) {
        if (!active) return;
        setPrefixOptions([]);
        setNationalityOptions([]);
        setSexOptions([]);
        setPatientTypeOptions([]);
        toast("error", "โหลดตัวเลือกไม่สำเร็จ", (error as Error)?.message || "โปรดลองใหม่อีกครั้ง");
      } finally {
        if (active) setOptionsLoading(false);
      }
    };
    loadOptions();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    const nextAge = calculateAgeFromDob(form.dobDay, form.dobMonth, form.dobYear);
    setForm((prev) => (prev.age === nextAge ? prev : { ...prev, age: nextAge }));
  }, [form.dobDay, form.dobMonth, form.dobYear]);

  const handleHnBlur = async (rawHn?: string) => {
    const hn = (rawHn ?? form.hn).trim();
    if (!hn) return;
    if (lastFetchedHnRef.current === hn && hnStatus !== "idle") return;

    setHnStatus("loading");
    Swal.fire({
      title: "ค้นหา HN",
      text: "กำลังตรวจสอบข้อมูลในระบบ...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const response = await getbyHN(hn);
    Swal.close();
    lastFetchedHnRef.current = hn;

    if (!(response as { error?: unknown })?.error) {
      const status = (response as { status?: boolean })?.status;
      if (status === false) {
        setMode("create");
        setHnStatus("notfound");
        setForm({ ...emptyForm, hn });
        toast("info", "ไม่พบข้อมูลเดิม", (response as { message?: string })?.message || "กรอกข้อมูลเพิ่มเติมเพื่อเพิ่มผู้ป่วยใหม่");
        return;
      }
      const data = (response as { data?: unknown })?.data ?? response;
      const row = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      if (row && Object.keys(row).length) {
        const dobParts = parseDobParts(row.dateofbirth ?? row.dob ?? row.birthdate ?? "");
        setForm({
          hn: normalizeText(row.hn ?? row.HN ?? hn).trim(),
          an: normalizeText(row.an ?? row.AN ?? ""),
          prefixid: normalizeText(row.prefixid ?? row.prefixId ?? row.prefix ?? row.title ?? ""),
          firstname: normalizeText(row.firstname ?? row.firstName ?? ""),
          lastname: normalizeText(row.lastname ?? row.lastName ?? ""),
          dobDay: dobParts.dobDay,
          dobMonth: dobParts.dobMonth,
          dobYear: dobParts.dobYear,
          age: normalizeText(row.age ?? ""),
          nationalityid: normalizeText(row.nationalityid ?? row.nationalityId ?? row.nationality ?? ""),
          sexid: normalizeText(row.sexid ?? row.sexId ?? row.sex ?? row.gender ?? ""),
          contactphone: normalizeText(row.contactphone ?? row.contactPhone ?? row.phone ?? row.tel ?? ""),
          patienttype: patientTypeToString(row.patienttype ?? row.patientType ?? []),
          note: normalizeText(row.note ?? ""),
        });
        setMode("update");
        setHnStatus("found");
        toast("success", "พบข้อมูลเดิมแล้ว", "สามารถแก้ไขและบันทึกได้เลย");
        return;
      }
      setMode("create");
      setHnStatus("notfound");
      setForm({ ...emptyForm, hn });
      toast("info", "ไม่พบข้อมูลเดิม", "กรอกข้อมูลเพิ่มเติมเพื่อเพิ่มผู้ป่วยใหม่");
      return;
    }
    setHnStatus("notfound");
    setMode("create");
    setForm({ ...emptyForm, hn });
    toast("error", "ค้นหา HN ไม่สำเร็จ", (response as { message?: string })?.message || "โปรดลองใหม่อีกครั้ง");
  };

  const handleSave = async () => {
    const hn = form.hn.trim();
    if (!hn) {
      toast("error", "กรุณากรอก HN");
      return;
    }
    if (!form.firstname.trim() || !form.lastname.trim()) {
      toast("error", "กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    Swal.fire({
      title: mode === "update" ? "บันทึกข้อมูล" : "เพิ่มข้อมูล",
      text: "กำลังบันทึกข้อมูลผู้ป่วย...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const dateofbirth = buildDateOfBirth(form.dobDay, form.dobMonth, form.dobYear);
    const payload: Record<string, unknown> = {
      hn,
      an: form.an.trim() || null,
      prefixid: form.prefixid || null,
      firstname: form.firstname.trim(),
      lastname: form.lastname.trim(),
      contactphone: form.contactphone.trim() || null,
      nationalityid: form.nationalityid || null,
      sexid: form.sexid || null,
      dateofbirth: dateofbirth || null,
      note: form.note.trim() || null,
      patienttype: form.patienttype.trim() || null,
    };
    if (form.age.trim()) {
      payload.age = form.age.trim();
    }
    const response = mode === "update" ? await putPatient(hn, payload) : await postPatient(payload);
    Swal.close();
    if ((response as { error?: unknown })?.error) {
      toast("error", "บันทึกข้อมูลไม่สำเร็จ", (response as { message?: string })?.message || "โปรดลองใหม่อีกครั้ง");
      return;
    }
    if ((response as { status?: boolean })?.status === false) {
      toast("error", "บันทึกข้อมูลไม่สำเร็จ", (response as { message?: string })?.message || "โปรดลองใหม่อีกครั้ง");
      return;
    }
    setMode("update");
    setHnStatus("found");
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
            <h1 className="mt-2 text-[32px] font-semibold">ลงทะเบียนผู้ป่วย</h1> 
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
                  updateField("hn", e.target.value);
                }}
                onBlur={(e) => handleHnBlur(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleHnBlur(e.currentTarget.value);
                  }
                }}
                placeholder="เช่น 1-65"
                className={fieldClass}
              />
              <span className="text-xs text-slate-500/70">กด Enter เพื่อค้นหา</span>
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
              <select
                value={form.prefixid}
                onChange={(e) => updateField("prefixid", e.target.value)}
                className={fieldClass}
                disabled={optionsLoading}
              >
                <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกคำนำหน้า"}</option>
                {prefixOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>
                Firstname <span className="text-rose-400">*</span>
              </label>
              <input
                value={form.firstname}
                onChange={(e) => updateField("firstname", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>
                Lastname <span className="text-rose-400">*</span>
              </label>
              <input
                value={form.lastname}
                onChange={(e) => updateField("lastname", e.target.value)}
                className={fieldClass}
              />
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
              <input value={form.age} readOnly placeholder="คำนวณอัตโนมัติ" className={fieldClass} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Nationality</label>
              <select
                value={form.nationalityid}
                onChange={(e) => updateField("nationalityid", e.target.value)}
                className={fieldClass}
                disabled={optionsLoading}
              >
                <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกสัญชาติ"}</option>
                {nationalityOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Sex</label>
              <select
                value={form.sexid}
                onChange={(e) => updateField("sexid", e.target.value)}
                className={fieldClass}
                disabled={optionsLoading}
              >
                <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกเพศ"}</option>
                {sexOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Phone</label>
              <input
                value={form.contactphone}
                onChange={(e) => updateField("contactphone", e.target.value)}
                placeholder="08x-xxx-xxxx"
                className={fieldClass}
              />
            </div>

            <div className="col-span-1 flex flex-col gap-2 md:col-span-2 lg:col-span-4">
              <label className={labelClass}>Patient type</label>
              <div className="flex flex-wrap gap-4">
                {optionsLoading && <span className="text-xs text-slate-500/70">กำลังโหลด...</span>}
                {!optionsLoading && patientTypeOptions.length === 0 && (
                  <span className="text-xs text-slate-500/70">ไม่พบข้อมูล</span>
                )}
                {!optionsLoading &&
                  patientTypeOptions.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 text-[13px] text-slate-800/80">
                      <input
                        type="checkbox"
                        checked={patientTypeToList(form.patienttype).includes(opt.id)}
                        onChange={(e) => togglePatientType(opt.id, e.target.checked)}
                      />
                      {opt.label}
                    </label>
                  ))}
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
