"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState , Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Select, { components, SingleValue } from "react-select";
import Swal from "sweetalert2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getCasebyid, getSelectTypes, getvaluebyselecttypeid } from "@/action/api";
import { SELECT_TYPE_CODES, SELECT_TYPE_IDS } from "@/config";
import ReportClient from "./report/report-client";

/** ---------------------------
 *  Small IndexedDB helper (store FileSystem handles)
 *  --------------------------*/
const IDB_DB = "vcapture_db_v1";
const IDB_STORE = "kv";
const REPORT_STORAGE_KEY = "vcapture_report_payload";
const LAST_SELECTION_KEY = "vcapture_last_selection";

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await idbOpen();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value as any, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await idbOpen();
  const val = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result ?? null) as T | null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return val;
}

async function idbDel(key: string): Promise<void> {
  const db = await idbOpen();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** ---------------------------
 *  SweetAlert2 helpers (auto close 3s)
 *  --------------------------*/
const alertOk = (title: string, text?: string) =>
  Swal.fire({
    icon: "success",
    title,
    text,
    toast: true,
    position: "top-end",
    timer: 3000,
    showConfirmButton: false,
    timerProgressBar: true,
  });

const alertErr = (title: string, text?: string) =>
  Swal.fire({
    icon: "error",
    title,
    text,
    toast: true,
    position: "top-end",
    timer: 3000,
    showConfirmButton: false,
    timerProgressBar: true,
  });

const alertInfo = (title: string, text?: string) =>
  Swal.fire({
    icon: "info",
    title,
    text,
    toast: true,
    position: "top-end",
    timer: 3000,
    showConfirmButton: false,
    timerProgressBar: true,
  });

async function confirmSwal(title: string, text?: string) {
  const r = await Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    reverseButtons: true,
  });
  return r.isConfirmed;
}

/** ---------------------------
 *  Thai Buddhist date helpers (stable, no locale SSR mismatch)
 *  --------------------------*/
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function toBEYear(adYear: number) {
  return adYear + 543;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Folder key: ddMMyy (yy = last 2 digits of BE year) */
function makeDateKey(d: Date) {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyBE = String(toBEYear(d.getFullYear()) % 100).padStart(2, "0");
  return `${dd}${mm}${yyBE}`;
}

/** Display: "17 ธ.ค. 2568" */
function formatThaiBEDisplay(d: Date) {
  const day = d.getDate();
  const m = TH_MONTHS[d.getMonth()];
  const y = toBEYear(d.getFullYear());
  return `${day} ${m} ${y}`;
}

function parseDateKey(key: string) {
  if (!/^\d{6}$/.test(key)) return null;
  const dd = Number(key.slice(0, 2));
  const mm = Number(key.slice(2, 4));
  const yy = Number(key.slice(4, 6));
  const beYear = 2500 + yy;
  const adYear = beYear - 543;
  const date = new Date(adYear, mm - 1, dd);
  return isNaN(date.getTime()) ? null : date;
}

function normalizeText(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function normalizeCode(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseApiDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = normalizeText(value);
  if (!raw) return null;
  if (/^\d{6}$/.test(raw)) return parseDateKey(raw);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateDisplay(value: unknown) {
  const parsed = parseApiDate(value);
  if (!parsed) return normalizeText(value) || "-";
  return formatThaiBEDisplay(parsed);
}

function formatTimeDisplay(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return "-";
  let slice = raw;
  if (slice.includes("T")) slice = slice.split("T")[1] || slice;
  if (slice.includes(" ")) slice = slice.split(" ")[1] || slice;
  if (slice.includes(".")) slice = slice.split(".")[0] || slice;
  if (slice.includes(":")) return slice.slice(0, 5);
  return slice;
}

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

type SelectTypeKey = keyof typeof SELECT_TYPE_IDS;

function parseSelectTypes(raw: unknown): SelectType[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = normalizeText(row.id ?? row.selecttypeid);
      const code = normalizeText(row.selecttypecode ?? row.code);
      const desc = normalizeText(row.selecttypedesc ?? row.desc);
      return id && code ? { id, code, desc } : null;
    })
    .filter(Boolean) as SelectType[];
}

function parseSelectOptions(raw: unknown): SelectOption[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = normalizeText(row.id ?? row.valueid);
      const code = normalizeText(row.valuecode ?? row.code ?? row.value);
      const desc = normalizeText(row.valuedesc ?? row.desc ?? row.label);
      const label = desc || code;
      return id && label ? { id, code, label } : null;
    })
    .filter(Boolean) as SelectOption[];
}

function resolveTypeId(key: SelectTypeKey, types: SelectType[]) {
  const configured = SELECT_TYPE_IDS[key];
  if (configured) return configured;
  const code = SELECT_TYPE_CODES[key];
  if (!code) return "";
  return types.find((item) => normalizeCode(item.code) === normalizeCode(code))?.id ?? "";
}

function getOptionLabel(options: SelectOption[], value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  const byId = options.find((opt) => opt.id === trimmed);
  if (byId) return byId.label;
  const byCode = options.find((opt) => normalizeCode(opt.code) === normalizeCode(trimmed));
  if (byCode) return byCode.label;
  return trimmed;
}

type LastSelection = {
  date: string;
  dateLabel?: string;
  pickedDate?: string;
  hn?: string;
  hnLabel?: string;
  an?: string;
  anLabel?: string;
};

type CasePrefill = {
  caseId: string;
  hn?: string;
  an?: string;
  date?: Date | null;
};

type CaseDetail = {
  caseId: string;
  hn: string;
  an: string;
  caseNo: string;
  registerDate: string;
  registerTime: string;
  appointmentDate: string;
  appointmentTime: string;
  caseDate: string;
  timeFrom: string;
  timeTo: string;
  procedureRoom: string;
  procedure: string;
  physician: string;
  note: string;
};

/** ---------------------------
 *  File / Folder helpers (File System Access API)
 *  --------------------------*/
type DirHandle = FileSystemDirectoryHandle;

async function ensureDir(parent: DirHandle, name: string): Promise<DirHandle> {
  return await parent.getDirectoryHandle(name, { create: true });
}

async function listDirs(parent: DirHandle): Promise<string[]> {
  const out: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const [name, handle] of parent.entries()) {
    if (handle.kind === "directory") out.push(name);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

type FileItem = {
  name: string;
  kind: "file";
  type: string;
  size: number;
  lastModified: number;
  handle: FileSystemFileHandle;
  url?: string; // object url
};

async function listFiles(dir: DirHandle): Promise<FileItem[]> {
  const items: FileItem[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file") continue;
    const file = await (handle as FileSystemFileHandle).getFile();
    items.push({
      name,
      kind: "file",
      type: file.type || "",
      size: file.size,
      lastModified: file.lastModified,
      handle: handle as FileSystemFileHandle,
    });
  }
  items.sort((a, b) => b.lastModified - a.lastModified);
  return items;
}

async function writeFile(handle: FileSystemFileHandle, blob: Blob) {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

async function deleteEntry(dir: DirHandle, name: string) {
  await dir.removeEntry(name);
}

function isImageType(t: string, name: string) {
  if (t.startsWith("image/")) return true;
  return /\.(png|jpg|jpeg|webp|bmp)$/i.test(name);
}

function isVideoType(t: string, name: string) {
  if (t.startsWith("video/")) return true;
  return /\.(webm|mp4|mov|mkv)$/i.test(name);
}

function humanSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

/** ---------------------------
 *  react-select (select2) style + portal (fix "โดนทับ")
 *  --------------------------*/
const selectTheme = (base: any) => ({
  ...base,
  borderRadius: 14,
  colors: {
    ...base.colors,
    primary25: "rgba(255,255,255,0.10)",
    primary: "rgba(255,255,255,0.30)",
    neutral0: "rgba(15,23,42,0.85)", // bg
    neutral80: "rgba(255,255,255,0.92)",
    neutral20: "rgba(255,255,255,0.18)",
    neutral30: "rgba(255,255,255,0.22)",
  },
});

const selectStyles: any = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "rgba(2,6,23,0.35)",
    borderColor: "rgba(255,255,255,0.14)",
    boxShadow: "none",
    minHeight: 42,
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "rgba(2,6,23,0.98)",
    border: "1px solid rgba(255,255,255,0.14)",
    overflow: "hidden",
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 99999 }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "rgba(255,255,255,0.08)" : "transparent",
    color: "rgba(255,255,255,0.92)",
  }),
  singleValue: (base: any) => ({ ...base, color: "rgba(255,255,255,0.92)" }),
  input: (base: any) => ({ ...base, color: "rgba(255,255,255,0.92)" }),
  placeholder: (base: any) => ({ ...base, color: "rgba(255,255,255,0.45)" }),
};

type Opt = { value: string; label: string };

function GlassCard(props: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] ${props.className || ""}`}>
      {(props.title || props.right) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <div className="text-sm font-semibold text-white/90">{props.title}</div>
          {props.right}
        </div>
      )}
      <div className="p-5 pt-4">{props.children}</div>
    </section>
  );
}

function PillButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" }) {
  const tone = props.tone || "ghost";
  const cls =
    tone === "ghost"
      ? "bg-teal-500/10 hover:bg-teal-500/20 border-teal-400/20"
      : "bg-teal-500/20 hover:bg-teal-500/30 border-teal-400/30";
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-2xl border text-sm text-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed ${cls} ${props.className || ""}`}
    />
  );
}

function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-10 w-10 rounded-2xl border border-teal-400/20 bg-teal-500/10 hover:bg-teal-500/20 text-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed ${props.className || ""
        }`}
    />
  );
}

/** ---------------------------
 *  Image Picker Modal (Original -> Choose copy)
 *  --------------------------*/
function ImagePickerModal(props: {
  open: boolean;
  onClose: () => void;
  originalDir: DirHandle | null;
  chooseDir: DirHandle | null;
  onRefreshAfter: () => Promise<void>;
  onEditChosen: (file: FileItem) => void;
  onExportReport: () => Promise<void>;
  refreshSignal?: number;
}) {
  const { open, onClose, originalDir, chooseDir, onRefreshAfter, onEditChosen, onExportReport, refreshSignal } = props;
  const [left, setLeft] = useState<FileItem[]>([]);
  const [right, setRight] = useState<FileItem[]>([]);
  const [busy, setBusy] = useState(false);

  const chosenNames = useMemo(() => new Set(right.map((x) => x.name)), [right]);

  const refresh = useCallback(async () => {
    if (!originalDir || !chooseDir) return;
    const [a, b] = await Promise.all([listFiles(originalDir), listFiles(chooseDir)]);
    setLeft(a.filter((x) => isImageType(x.type, x.name)));
    setRight(b.filter((x) => isImageType(x.type, x.name)));
  }, [originalDir, chooseDir]);

  useEffect(() => {
    if (!open) return;
    refresh().catch(() => { });
  }, [open, refresh, refreshSignal]);

  const copyToChoose = useCallback(
    async (name: string) => {
      if (!originalDir || !chooseDir) return;
      try {
        setBusy(true);
        const srcHandle = await originalDir.getFileHandle(name);
        const srcFile = await srcHandle.getFile();
        const dstHandle = await chooseDir.getFileHandle(name, { create: true });
        await writeFile(dstHandle, srcFile);
        await refresh();
        await onRefreshAfter();
        alertOk("คัดลอกไป choose แล้ว");
      } catch (e: any) {
        alertErr("คัดลอกไม่สำเร็จ", e?.message || String(e));
      } finally {
        setBusy(false);
      }
    },
    [originalDir, chooseDir, refresh, onRefreshAfter]
  );

  const removeFromChoose = useCallback(
    async (name: string) => {
      if (!chooseDir) return;
      const ok = await confirmSwal("ลบไฟล์จาก choose?", name);
      if (!ok) return;
      try {
        setBusy(true);
        await deleteEntry(chooseDir, name);
        await refresh();
        await onRefreshAfter();
        alertOk("ลบแล้ว");
      } catch (e: any) {
        alertErr("ลบไม่สำเร็จ", e?.message || String(e));
      } finally {
        setBusy(false);
      }
    },
    [chooseDir, refresh, onRefreshAfter]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[1300px] h-[86vh] rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_40px_120px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-white/90 font-semibold">เลือก/จัดการรูป (Original ⇄ Choose)</div>
            <div className="text-xs text-white/55">ลากรูปจากซ้ายไปขวาเพื่อคัดลอก (copy) — Original จะไม่ถูกย้าย</div>
          </div>
          <div className="flex gap-2">
            <PillButton onClick={() => refresh()} disabled={busy}>
              Refresh
            </PillButton>
            <PillButton
              onClick={async () => {
                try {
                  setBusy(true);
                  await onExportReport();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              ออกรีพอร์ท
            </PillButton>
            <PillButton tone="danger" onClick={onClose} disabled={busy}>
              ปิด
            </PillButton>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
          {/* Left */}
          <div className="border-r border-white/10 flex flex-col min-h-0">
            <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
              <span>Original</span>
              <span className="text-xs text-white/50">{left.length} files</span>
            </div>
            <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
              {left.length === 0 && <div className="text-sm text-white/50 px-1">ไม่มีรูปใน original</div>}
              {left.map((f) => (
                <div
                  key={f.name}
                  className={`rounded-2xl border p-3 flex items-center gap-3 bg-white/[0.04] border-white/10 ${chosenNames.has(f.name) ? "ring-2 ring-emerald-400/40" : ""
                    }`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", f.name);
                  }}
                >
                  <Thumb file={f} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white/90 truncate flex items-center gap-2">
                      {f.name}
                      {chosenNames.has(f.name) && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-emerald-200/90">เลือกแล้ว</span>}
                    </div>
                    <div className="text-xs text-white/50">{humanSize(f.size)}</div>
                  </div>
                  <div className="flex gap-2">
                    <PillButton onClick={() => copyToChoose(f.name)} disabled={busy || chosenNames.has(f.name)}>
                      Copy →
                    </PillButton>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div
            className="flex flex-col min-h-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const name = e.dataTransfer.getData("text/plain");
              if (name) copyToChoose(name);
            }}
          >
            <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
              <span>Choose</span>
              <span className="text-xs text-white/50">{right.length} files</span>
            </div>
            <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
              {right.length === 0 && (
                <div className="text-sm text-white/50 px-1">
                  ลากรูปมาวางฝั่งนี้เพื่อคัดลอกไปโฟลเดอร์ choose
                </div>
              )}
              {right.map((f) => (
                <div key={f.name} className="rounded-2xl border p-3 flex items-center gap-3 bg-white/[0.04] border-white/10">
                  <Thumb file={f} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white/90 truncate">{f.name}</div>
                    <div className="text-xs text-white/50">{humanSize(f.size)}</div>
                  </div>
                  <div className="flex gap-2">
                    <PillButton onClick={() => onEditChosen(f)} disabled={busy}>
                      Edit
                    </PillButton>
                    <PillButton tone="danger" onClick={() => removeFromChoose(f.name)} disabled={busy}>
                      Delete
                    </PillButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/45">
          เคล็ดลับ: ถ้ารูป “เลือกแล้ว” ฝั่งซ้ายจะมีกรอบ/ป้าย — เพราะไฟล์ชื่อเดียวกันมีอยู่ใน choose
        </div>
      </div>
    </div>
  );
}

function CameraAdjustModal(props: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const { open, onClose, children } = props;
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[99998] pointer-events-none" />
      <div className="fixed right-4 top-4 z-[99999] w-[420px] max-w-[90vw] rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl pointer-events-auto">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="text-white/90 font-semibold">Adjust Camera</div>
          <PillButton tone="danger" onClick={onClose}>
            Close
          </PillButton>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </>
  );
}

/** ---------------------------
 *  Fabric Image Editor Modal (dynamic import)
 *  --------------------------*/
function ImageEditorModal(props: {
  open: boolean;
  onClose: () => void;
  file: FileItem | null;
  chooseDir: DirHandle | null;
  onSaved: () => Promise<void>;
}) {
  const { open, onClose, file, chooseDir, onSaved } = props;

  const hostRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const fabricRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const bgImgRef = useRef<any>(null);
  const clipboardRef = useRef<any[] | null>(null);

  const [tool, setTool] = useState<"select" | "text" | "arrow" | "rect" | "circle" | "crop">("select");
  const [stroke, setStroke] = useState("#0008FF");
  const [fill, setFill] = useState("rgba(0,0,0,0)");
  const [fontSize, setFontSize] = useState(40);
  const [strokeW, setStrokeW] = useState(6);
  const [imgBrightness, setImgBrightness] = useState(0);
  const [imgContrast, setImgContrast] = useState(0);
  const [imgSaturation, setImgSaturation] = useState(0);
  const [imgShadow, setImgShadow] = useState(0);
  const imgAdjustRef = useRef({ brightness: 0, contrast: 0, saturation: 0, shadow: 0 });
  const transparentFill = "rgba(0,0,0,0)";
  const [busy, setBusy] = useState(false);
  const toolRef = useRef(tool);
  const strokeRef = useRef(stroke);
  const fillRef = useRef(fill);
  const fontSizeRef = useRef(fontSize);
  const strokeWRef = useRef(strokeW);

  const buildAdjustFilters = useCallback((lib: any) => {
    const filtersLib = lib.filters || lib.Image?.filters || lib.fabric?.filters;
    if (!filtersLib) return [];

    const filters: any[] = [];
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const { brightness, contrast, saturation, shadow } = imgAdjustRef.current;
    const br = clamp(brightness, -100, 100) / 100;
    const ct = clamp(contrast, -100, 100) / 100;
    const sa = clamp(saturation, -100, 100) / 100;
    const sh = clamp(shadow, -100, 100);

    if (br !== 0 && filtersLib.Brightness) filters.push(new filtersLib.Brightness({ brightness: br }));
    if (ct !== 0 && filtersLib.Contrast) filters.push(new filtersLib.Contrast({ contrast: ct }));
    if (sa !== 0 && filtersLib.Saturation) filters.push(new filtersLib.Saturation({ saturation: sa }));
    if (sh !== 0 && filtersLib.Gamma) {
      const gamma = clamp(1 + (sh / 100) * 0.8, 0.2, 2.2);
      filters.push(new filtersLib.Gamma({ gamma: [gamma, gamma, gamma] }));
    }
    return filters;
  }, []);

  const applyStyleToActive = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a || a === bgImgRef.current) return;

    const common = {
      stroke: strokeRef.current,
      strokeWidth: strokeWRef.current,
    };

    if (a.type === "i-text" || a.type === "textbox") {
      a.set({
        fill: strokeRef.current,
        fontSize: fontSizeRef.current,
      });
    } else if (a.type === "path") {
      a.set({ ...common, fill: strokeRef.current });
    } else if (a.type === "rect" || a.type === "circle" || a.type === "triangle") {
      a.set({ ...common, fill: transparentFill });
    } else if (a.type === "line") {
      a.set({
        stroke: strokeRef.current,
        strokeWidth: strokeWRef.current,
      });
    }
    c.requestRenderAll();
  }, []);

  const applyImageAdjustments = useCallback(() => {
    const c = canvasRef.current;
    const bg = bgImgRef.current;
    const fabric = fabricRef.current as any;
    if (!c || !bg || !fabric) return;

    const filters = buildAdjustFilters(fabric);
    bg.filters = filters;
    bg.applyFilters();
    c.requestRenderAll();
  }, [buildAdjustFilters]);

  const pushState = useCallback(() => { }, []);

  const destroyCanvas = useCallback(() => {
    try {
      const c = canvasRef.current;
      if (c) {
        c.dispose();
      }
    } catch { }
    canvasRef.current = null;
    bgImgRef.current = null;
    fabricRef.current = null;
  }, []);

  const loadEditor = useCallback(async () => {
    if (!open || !file || !chooseDir) return;
    if (!hostRef.current) return;

    setBusy(true);
    try {
      // dynamic import fabric (Fix SSR + Fix "export fabric doesn't exist")
      const fabric = await import("fabric");
      fabricRef.current = fabric;

      const { Canvas, FabricImage, Rect, Circle, Line, IText, Path } = fabric as any;

      const c = new Canvas(hostRef.current, {
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: "#0b1020",
      });
      canvasRef.current = c;

      // Load file blob
      const fh = await chooseDir.getFileHandle(file.name);
      const f = await fh.getFile();
      const url = URL.createObjectURL(f);

      const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });

      // Fit canvas to container
      const fit = () => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        c.setWidth(w);
        c.setHeight(h);
        c.requestRenderAll();
      };

      fit();

      const bg = new FabricImage(imgEl, { selectable: false, evented: false });
      bgImgRef.current = bg;

      // Scale bg to fit canvas
      const scale = Math.min(c.getWidth() / (bg.width || 1), c.getHeight() / (bg.height || 1));
      bg.scale(scale);
      bg.set({
        left: (c.getWidth() - (bg.getScaledWidth?.() ?? 0)) / 2,
        top: (c.getHeight() - (bg.getScaledHeight?.() ?? 0)) / 2,
      });
      c.add(bg);
      c.sendObjectToBack(bg);
      applyImageAdjustments();

      // tool drawing (single-click to drop; crop uses drag)
      const getPointer = (opt: any) => c.getPointer(opt.e);
      let isCropping = false;
      let cropTemp: any = null;
      let cropStartX = 0;
      let cropStartY = 0;

      let isDrawing = false;
      let drawTemp: any = null;
      let drawStartX = 0;
      let drawStartY = 0;
      let drawTool: "text" | "arrow" | "rect" | "circle" | null = null;

      const baseArrowLen = 36;
      const baseArrowHalfW = 12;
      const minArrowLen = 12;

      const createArrowPath = (len: number, halfW: number) => {
        const halfLen = len / 2;
        return `M ${halfLen} 0 L ${-halfLen} ${-halfW} L ${-halfLen} ${halfW} Z`;
      };

      const startDrawing = (p: { x: number; y: number }) => {
        const currentTool = toolRef.current;
        if (currentTool === "select" || currentTool === "crop") return;

        drawStartX = p.x;
        drawStartY = p.y;
        isDrawing = true;
        drawTool = currentTool;

        const commonSelectable = { selectable: false, evented: false };
        if (currentTool === "text") {
          drawTemp = new IText("พิมพ์ข้อความ", {
            left: p.x,
            top: p.y,
            fontSize: fontSizeRef.current,
            fill: strokeRef.current,
            ...commonSelectable,
            originX: "center",
            originY: "center",
          });
        } else if (currentTool === "arrow") {
          drawTemp = new Path(createArrowPath(baseArrowLen, baseArrowHalfW), {
            left: p.x,
            top: p.y,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            fill: strokeRef.current,
            originX: "center",
            originY: "center",
            ...commonSelectable,
          });
        } else if (currentTool === "rect") {
          drawTemp = new Rect({
            left: p.x,
            top: p.y,
            width: 1,
            height: 1,
            fill: transparentFill,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            ...commonSelectable,
          });
        } else if (currentTool === "circle") {
          drawTemp = new Circle({
            left: p.x,
            top: p.y,
            radius: 1,
            fill: transparentFill,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            ...commonSelectable,
          });
        }

        if (!drawTemp) return;
        c.add(drawTemp);
        c.requestRenderAll();
      };

      const updateDrawing = (p: { x: number; y: number }) => {
        if (!isDrawing) return;
        if (!drawTemp) return;

        const dx = p.x - drawStartX;
        const dy = p.y - drawStartY;

        if (drawTool === "text") {
          const baseFont = Math.max(6, fontSizeRef.current);
          const scaleX = Math.max(0.1, Math.abs(dx) / baseFont);
          const scaleY = Math.max(0.1, Math.abs(dy) / baseFont);
          drawTemp.set({
            left: drawStartX + dx / 2,
            top: drawStartY + dy / 2,
            scaleX,
            scaleY,
          });
        } else if (drawTool === "rect") {
          drawTemp.set({
            left: Math.min(drawStartX, p.x),
            top: Math.min(drawStartY, p.y),
            width: Math.max(1, Math.abs(dx)),
            height: Math.max(1, Math.abs(dy)),
          });
        } else if (drawTool === "circle") {
          const radius = Math.max(1, Math.max(Math.abs(dx), Math.abs(dy)) / 2);
          const cx = drawStartX + dx / 2;
          const cy = drawStartY + dy / 2;
          drawTemp.set({
            left: cx - radius,
            top: cy - radius,
            radius,
          });
        } else if (drawTool === "arrow") {
          const rad = Math.atan2(dy, dx);
          const angle = (rad * 180) / Math.PI;
          const dist = Math.hypot(dx, dy);
          const scaledLen = Math.max(minArrowLen, dist);
          const scale = scaledLen / baseArrowLen;
          const offsetX = Math.cos(rad) * (scaledLen / 2);
          const offsetY = Math.sin(rad) * (scaledLen / 2);
          drawTemp.set({
            left: p.x - offsetX,
            top: p.y - offsetY,
            angle,
            scaleX: scale,
            scaleY: scale,
          });
        }
        c.requestRenderAll();
      };

      const finishDrawing = (p: { x: number; y: number }) => {
        if (!isDrawing) return;

        updateDrawing(p);
        isDrawing = false;

        if (drawTemp) {
          const shouldReturnSelect = drawTool === "text";
          drawTemp.set({ selectable: true, evented: true });
          c.setActiveObject(drawTemp);
          pushState();
          drawTemp = null;
          drawTool = null;
          if (shouldReturnSelect && toolRef.current !== "select") {
            toolRef.current = "select";
            setTool("select");
          }
        }
      };

      const onMouseDown = (opt: any) => {
        const p = getPointer(opt);
        const currentTool = toolRef.current;
        if (currentTool === "crop") {
          // keep only one crop rect at a time
          c.getObjects().forEach((o: any) => {
            if (o?.type === "rect" && Array.isArray(o.strokeDashArray) && o.strokeDashArray.length > 0) {
              c.remove(o);
            }
          });
          isCropping = true;
          cropStartX = p.x;
          cropStartY = p.y;
          cropTemp = new Rect({
            left: p.x,
            top: p.y,
            width: 1,
            height: 1,
            fill: "rgba(255,255,255,0.08)",
            stroke: "rgba(255,255,255,0.85)",
            strokeWidth: 2,
            strokeDashArray: [8, 6],
            selectable: false,
            evented: false,
          });
          c.add(cropTemp);
          return;
        }

        startDrawing(p);
      };

      const onMouseMove = (opt: any) => {
        const p = getPointer(opt);
        if (isCropping && cropTemp) {
          const w = p.x - cropStartX;
          const h = p.y - cropStartY;
          cropTemp.set({
            left: Math.min(cropStartX, p.x),
            top: Math.min(cropStartY, p.y),
            width: Math.abs(w),
            height: Math.abs(h),
          });
          c.requestRenderAll();
          return;
        }

        updateDrawing(p);
      };

      const onMouseUp = (opt: any) => {
        if (isCropping) {
          isCropping = false;
          if (!cropTemp) return;
          cropTemp.set({ selectable: true, evented: true });
          c.setActiveObject(cropTemp);
          pushState();
          cropTemp = null;
          return;
        }

        const p = getPointer(opt);
        finishDrawing(p);
      };

      const onObjMod = () => pushState();

      // init state stack
      // attach
      c.on("mouse:down", onMouseDown);
      c.on("mouse:move", onMouseMove);
      c.on("mouse:up", onMouseUp);
      c.on("object:modified", onObjMod);
      c.on("object:removed", onObjMod);

      // resize
      const ro = new ResizeObserver(() => {
        // Keep relative placement by re-fitting bg only (simple)
        const wrap = wrapRef.current;
        if (!wrap) return;
        if (canvasRef.current !== c || !c?.lowerCanvasEl) return;
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        c.setWidth(w);
        c.setHeight(h);

        // refit bg
        const bg2 = bgImgRef.current;
        if (bg2) {
          const sc = Math.min(c.getWidth() / (bg2.width || 1), c.getHeight() / (bg2.height || 1));
          bg2.scale(sc);
          bg2.set({
            left: (c.getWidth() - (bg2.getScaledWidth?.() ?? 0)) / 2,
            top: (c.getHeight() - (bg2.getScaledHeight?.() ?? 0)) / 2,
          });
        }
        c.requestRenderAll();
      });
      if (wrapRef.current) ro.observe(wrapRef.current);

      // keep objects selectable; bg is locked above
      c.selection = true;

      return () => {
        ro.disconnect();
        URL.revokeObjectURL(url);
      };
    } catch (e: any) {
      alertErr("เปิด Editor ไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [open, file, chooseDir, pushState]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    strokeRef.current = stroke;
    applyStyleToActive();
  }, [stroke]);

  useEffect(() => {
    fillRef.current = fill;
    applyStyleToActive();
  }, [fill]);

  useEffect(() => {
    fontSizeRef.current = fontSize;
    applyStyleToActive();
  }, [fontSize]);

  useEffect(() => {
    strokeWRef.current = strokeW;
    applyStyleToActive();
  }, [strokeW, applyStyleToActive]);

  useEffect(() => {
    imgAdjustRef.current = {
      brightness: imgBrightness,
      contrast: imgContrast,
      saturation: imgSaturation,
      shadow: imgShadow,
    };
    if (!open) return;
    applyImageAdjustments();
  }, [imgBrightness, imgContrast, imgSaturation, imgShadow, open, applyImageAdjustments]);

  useEffect(() => {
    if (!open) return;
    setImgBrightness(0);
    setImgContrast(0);
    setImgSaturation(0);
    setImgShadow(0);
  }, [open, file?.name]);

  useEffect(() => {
    if (!open) return;
    // reset stacks per open
    destroyCanvas();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadEditor();
    return () => {
      destroyCanvas();
    };
  }, [open, loadEditor, destroyCanvas]); // intentionally only open/close lifecycle

  // tool change handled via refs (selection always enabled)

  const doRotate90 = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a) return;
    a.rotate(((a.angle || 0) + 90) % 360);
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  const doFlipX = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a) return;
    a.set("flipX", !a.flipX);
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  const doFlipY = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a) return;
    a.set("flipY", !a.flipY);
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  const rotateCanvas = useCallback(
    (dir: "cw" | "ccw") => {
      const c = canvasRef.current;
      const fabric = fabricRef.current as any;
      if (!c || !fabric) return;
      const delta = dir === "cw" ? 90 : -90;
      const rad = fabric.util.degreesToRadians(delta);
      const oldW = c.getWidth();
      const oldH = c.getHeight();
      const newW = oldH;
      const newH = oldW;
      const oldCenter = new fabric.Point(oldW / 2, oldH / 2);
      const newCenter = new fabric.Point(newW / 2, newH / 2);

      c.getObjects().forEach((o: any) => {
        const center = o.getCenterPoint();
        const rotated = fabric.util.rotatePoint(center, oldCenter, rad);
        const translated = new fabric.Point(
          rotated.x - oldCenter.x + newCenter.x,
          rotated.y - oldCenter.y + newCenter.y
        );
        o.rotate((o.angle || 0) + delta);
        o.setPositionByOrigin(translated, "center", "center");
      });

      c.setWidth(newW);
      c.setHeight(newH);
      c.calcOffset();
      c.requestRenderAll();
      pushState();
    },
    [pushState]
  );

  const flipCanvas = useCallback(
    (axis: "x" | "y") => {
      const c = canvasRef.current;
      if (!c) return;
      const w = c.getWidth();
      const h = c.getHeight();
      c.getObjects().forEach((o: any) => {
        const ow = o.getScaledWidth?.() ?? o.width ?? 0;
        const oh = o.getScaledHeight?.() ?? o.height ?? 0;
        if (axis === "x") {
          o.set({
            left: w - (o.left ?? 0) - ow,
            flipX: !o.flipX,
          });
        } else {
          o.set({
            top: h - (o.top ?? 0) - oh,
            flipY: !o.flipY,
          });
        }
      });
      c.requestRenderAll();
      pushState();
    },
    [pushState]
  );

  const doDeleteActive = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const activeList = typeof c.getActiveObjects === "function" ? c.getActiveObjects() : [];
    if (!activeList || activeList.length === 0) {
      const a = c.getActiveObject();
      if (!a || a === bgImgRef.current) return;
      c.remove(a);
    } else {
      activeList.forEach((obj: any) => {
        if (obj !== bgImgRef.current) c.remove(obj);
      });
    }
    c.discardActiveObject();
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  const copyActive = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const activeList = typeof c.getActiveObjects === "function" ? c.getActiveObjects() : [];
    const rawList = activeList.length > 0 ? activeList : c.getActiveObject() ? [c.getActiveObject()] : [];
    const list = rawList.filter((obj: any) => obj && obj !== bgImgRef.current);
    if (list.length === 0) return;
    clipboardRef.current = list.map((obj: any) => obj.toObject());
  }, []);

  const pasteActive = useCallback(() => {
    const c = canvasRef.current;
    const data = clipboardRef.current;
    if (!c || !data || data.length === 0) return;
    const fabric = fabricRef.current;
    const util = fabric?.util || fabric?.fabric?.util;
    const ActiveSelection = fabric?.ActiveSelection || fabric?.fabric?.ActiveSelection;
    if (!util?.enlivenObjects) return;
    util
      .enlivenObjects(data)
      .then((enlivened: any[]) => {
        const list = enlivened?.filter(Boolean) || [];
        if (list.length === 0) return;
        const offset = 20;
        list.forEach((obj: any) => {
          obj.set({
            left: (obj.left || 0) + offset,
            top: (obj.top || 0) + offset,
            evented: true,
            selectable: true,
          });
          c.add(obj);
        });
        if (list.length === 1) {
          c.setActiveObject(list[0]);
        } else if (ActiveSelection) {
          const activeSel = new ActiveSelection(list, { canvas: c });
          c.setActiveObject(activeSel);
        }
        c.requestRenderAll();
        pushState();
      })
      .catch(() => { });
  }, [pushState]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const c = canvasRef.current;
      const activeObj = c?.getActiveObject?.();
      if (activeObj?.isEditing) return;
      if (target && target.closest("input, textarea, [contenteditable='true']") && !activeObj) return;
      if (e.key === "Delete") {
        e.preventDefault();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        doDeleteActive();
        return;
      }
      const isCopy = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "c" || e.code === "KeyC");
      const isPaste = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "v" || e.code === "KeyV");
      if (isCopy) {
        e.preventDefault();
        e.stopPropagation();
        copyActive();
        return;
      }
      if (isPaste) {
        e.preventDefault();
        e.stopPropagation();
        pasteActive();
        return;
      }
      if (toolRef.current !== "select") return;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, doDeleteActive, copyActive, pasteActive]);

  const applyCrop = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;

    // find top-most crop rect (dashed stroke)
    const cropRects = c
      .getObjects()
      .filter((o: any) => o?.type === "rect" && Array.isArray(o.strokeDashArray) && o.strokeDashArray.length > 0);

    if (cropRects.length === 0) {
      alertInfo("ยังไม่มีกรอบ Crop", "เลือก Tool: Crop แล้วลากกรอบก่อน");
      return;
    }

    // Use the last one
    const crop = cropRects[cropRects.length - 1];

    try {
      setBusy(true);

      // Rasterize full canvas to image, then crop via native canvas
      const dataUrl = c.toDataURL({ format: "png" });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = dataUrl;
      });

      const cropLeft = Math.max(0, crop.left || 0);
      const cropTop = Math.max(0, crop.top || 0);
      const cropW = Math.max(1, crop.width ? crop.width * (crop.scaleX || 1) : 1);
      const cropH = Math.max(1, crop.height ? crop.height * (crop.scaleY || 1) : 1);

      const oc = document.createElement("canvas");
      oc.width = Math.floor(cropW);
      oc.height = Math.floor(cropH);
      const ctx = oc.getContext("2d")!;
      ctx.drawImage(img, cropLeft, cropTop, cropW, cropH, 0, 0, oc.width, oc.height);

      const blob = await new Promise<Blob>((resolve) => oc.toBlob((b) => resolve(b!), "image/png"));

      // Replace editor canvas with cropped result
      c.clear();
      c.setWidth(oc.width);
      c.setHeight(oc.height);

      const fabric = fabricRef.current;
      const { FabricImage } = fabric as any;

      const croppedImgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = URL.createObjectURL(blob);
      });

      const bg = new FabricImage(croppedImgEl, { selectable: false, evented: false });
      bgImgRef.current = bg;
      bg.scale(1);
      bg.set({ left: 0, top: 0 });
      c.add(bg);
      c.sendObjectToBack(bg);
      applyImageAdjustments();
      c.requestRenderAll();

      alertOk("Crop เรียบร้อย");
    } catch (e: any) {
      alertErr("Crop ไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [pushState, applyImageAdjustments]);

  const onCropButton = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;
    const cropRects = c.getObjects().filter(
      (o: any) => o?.type === "rect" && Array.isArray(o.strokeDashArray) && o.strokeDashArray.length > 0
    );
    if (cropRects.length === 0) {
      setTool("crop");
      alertInfo("โหมด Crop", "ลากกรอบแล้วกดปุ่มนี้ซ้ำเพื่อ Apply");
      return;
    }
    await applyCrop();
  }, [applyCrop]);

  const save = useCallback(async () => {
    if (!file || !chooseDir) return;
    const c = canvasRef.current;
    if (!c) return;

    try {
      setBusy(true);
      const blob = await new Promise<Blob>((resolve, reject) => {
        c
          .toCanvasElement()
          .toBlob(
            (b: Blob | null) => (b ? resolve(b) : reject(new Error("Export canvas failed"))),
            "image/png"
          );
      });

      const fh = await chooseDir.getFileHandle(file.name, { create: true });
      await writeFile(fh, blob);
      await onSaved();
      alertOk("บันทึกทับไฟล์ใน choose แล้ว");
      onClose();
    } catch (e: any) {
      alertErr("บันทึกไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [file, chooseDir, onSaved, onClose]);

  const saveAllAdjust = useCallback(async () => {
    if (!chooseDir) return;
    try {
      setBusy(true);
      const files = (await listFiles(chooseDir)).filter((it) => isImageType(it.type, it.name));
      if (files.length === 0) {
        alertInfo("ไม่มีไฟล์รูปใน choose", "เพิ่มรูปก่อนแล้วค่อยลองใหม่");
        return;
      }

      let savedCount = 0;
      const currentName = file?.name ?? null;
      if (currentName && canvasRef.current) {
        const c = canvasRef.current;
        const blob = await new Promise<Blob>((resolve, reject) => {
          c
            .toCanvasElement()
            .toBlob(
              (b: Blob | null) => (b ? resolve(b) : reject(new Error("Export canvas failed"))),
              "image/png"
            );
        });
        const currentHandle = await chooseDir.getFileHandle(currentName, { create: true });
        await writeFile(currentHandle, blob);
        savedCount += 1;
      }

      const fabric = fabricRef.current ?? (await import("fabric"));
      fabricRef.current = fabric;
      const { Canvas, FabricImage } = fabric as any;

      const batchCanvasEl = document.createElement("canvas");
      const batchCanvas = new Canvas(batchCanvasEl, { selection: false });

      for (const item of files) {
        if (currentName && item.name === currentName) continue;
        const fileHandle = await chooseDir.getFileHandle(item.name);
        const f = await fileHandle.getFile();
        const url = URL.createObjectURL(f);
        try {
          const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = url;
          });

          batchCanvas.clear();
          batchCanvas.setWidth(imgEl.naturalWidth || imgEl.width);
          batchCanvas.setHeight(imgEl.naturalHeight || imgEl.height);

          const bg = new FabricImage(imgEl, { selectable: false, evented: false });
          const filters = buildAdjustFilters(fabric);
          bg.filters = filters;
          bg.applyFilters();
          bg.set({ left: 0, top: 0, scaleX: 1, scaleY: 1 });
          batchCanvas.add(bg);
          batchCanvas.requestRenderAll();

          const blob = await new Promise<Blob>((resolve, reject) => {
            batchCanvas
              .toCanvasElement()
              .toBlob(
                (b: Blob | null) => (b ? resolve(b) : reject(new Error("Export canvas failed"))),
                "image/png"
              );
          });

          await writeFile(fileHandle, blob);
          savedCount += 1;
        } finally {
          URL.revokeObjectURL(url);
        }
      }

      batchCanvas.dispose();
      await onSaved();
      alertOk("บันทึกทุกไฟล์แล้ว", `${savedCount} ไฟล์`);
      onClose();
    } catch (e: any) {
      alertErr("บันทึกทั้งหมดไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [chooseDir, onSaved, onClose, buildAdjustFilters, file]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[1400px] h-[88vh] rounded-3xl border border-white/10 bg-slate-950/75 overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.75)] flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white/90 font-semibold truncate">Edit: {file?.name}</div>
            <div className="text-xs text-white/45">Text / Arrow / Shape / Crop / Move / Resize / Rotate / Flip</div>
          </div>
          <div className="flex gap-2">
            <PillButton onClick={saveAllAdjust} disabled={busy}>
              Save Adjust all images in choose
            </PillButton>
            <PillButton onClick={save} disabled={busy}>
              Save
            </PillButton>
            <PillButton tone="danger" onClick={onClose} disabled={busy}>
              Close
            </PillButton>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-[360px_1fr] min-h-0">
          {/* Left toolbar */}
          <div className="border-r border-white/10 p-4 space-y-4 overflow-auto">
            <div className="text-sm text-white/80 font-semibold">Tools</div>

            <div className="grid grid-cols-2 gap-2">
              <PillButton tone={tool === "select" ? "primary" : "ghost"} onClick={() => setTool("select")}>
                Select
              </PillButton>
              <PillButton tone={tool === "text" ? "primary" : "ghost"} onClick={() => setTool("text")}>
                Text
              </PillButton>
              <PillButton tone={tool === "arrow" ? "primary" : "ghost"} onClick={() => setTool("arrow")}>
                Arrow
              </PillButton>
              <PillButton tone={tool === "rect" ? "primary" : "ghost"} onClick={() => setTool("rect")}>
                Rect
              </PillButton>
              <PillButton tone={tool === "circle" ? "primary" : "ghost"} onClick={() => setTool("circle")}>
                Circle
              </PillButton>
              <PillButton tone={tool === "crop" ? "primary" : "ghost"} onClick={onCropButton}>
                Crop
              </PillButton>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
              <div className="text-xs text-white/60">Color / Size</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-white/60">
                  Stroke
                  <input value={stroke} onChange={(e) => setStroke(e.target.value)} type="color" className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-transparent" />
                </label>
                <label className="text-xs text-white/60">
                  Fill
                  <input value={fill} onChange={(e) => setFill(e.target.value)} type="color" className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-transparent" />
                </label>
                <label className="text-xs text-white/60">
                  Font
                  <input
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value) || 40)}
                    type="number"
                    className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white/90 outline-none"
                  />
                </label>
                <label className="text-xs text-white/60">
                  Stroke W
                  <input
                    value={strokeW}
                    onChange={(e) => setStrokeW(Number(e.target.value) || 6)}
                    type="number"
                    className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white/90 outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">Adjust Image</div>
                <button
                  type="button"
                  onClick={() => {
                    setImgBrightness(0);
                    setImgContrast(0);
                    setImgSaturation(0);
                    setImgShadow(0);
                  }}
                  className="text-[11px] text-teal-200/70 hover:text-teal-100"
                >
                  Reset
                </button>
              </div>

              <label className="text-xs text-white/60 flex flex-col gap-2">
                Brightness
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={imgBrightness}
                    onChange={(e) => setImgBrightness(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[11px] text-white/45 w-10 text-right">{imgBrightness}</span>
                </div>
              </label>

              <label className="text-xs text-white/60 flex flex-col gap-2">
                Contrast
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={imgContrast}
                    onChange={(e) => setImgContrast(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[11px] text-white/45 w-10 text-right">{imgContrast}</span>
                </div>
              </label>

              <label className="text-xs text-white/60 flex flex-col gap-2">
                Saturation
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={imgSaturation}
                    onChange={(e) => setImgSaturation(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[11px] text-white/45 w-10 text-right">{imgSaturation}</span>
                </div>
              </label>

              <label className="text-xs text-white/60 flex flex-col gap-2">
                Shadow
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={imgShadow}
                    onChange={(e) => setImgShadow(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[11px] text-white/45 w-10 text-right">{imgShadow}</span>
                </div>
              </label>
              <div className="text-[11px] text-white/45">ปรับแสง/เงาเฉพาะภาพพื้นหลัง (ไม่กระทบวัตถุที่วาด)</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
              <div className="text-xs text-white/60">Actions (Active object)</div>
              <div className="grid grid-cols-2 gap-2">
                <PillButton onClick={doRotate90} disabled={busy}>
                  Rotate 90°
                </PillButton>
                <PillButton onClick={doFlipX} disabled={busy}>
                  Flip X
                </PillButton>
                <PillButton onClick={doFlipY} disabled={busy}>
                  Flip Y
                </PillButton>
                <PillButton tone="danger" onClick={doDeleteActive} disabled={busy}>
                  Delete
                </PillButton>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
              <div className="text-xs text-white/60">Canvas</div>
              <div className="grid grid-cols-2 gap-2">
                <PillButton onClick={() => rotateCanvas("ccw")} disabled={busy}>
                  Rotate -90°
                </PillButton>
                <PillButton onClick={() => rotateCanvas("cw")} disabled={busy}>
                  Rotate +90°
                </PillButton>
                <PillButton onClick={() => flipCanvas("x")} disabled={busy}>
                  Flip Horizontal
                </PillButton>
                <PillButton onClick={() => flipCanvas("y")} disabled={busy}>
                  Flip Vertical
                </PillButton>
              </div>
              <div className="text-[11px] text-white/45">หมุน/กลับด้านทั้งภาพรวมวัตถุที่วางไว้</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
              <div className="text-xs text-white/60">Crop</div>
              <PillButton onClick={onCropButton} disabled={busy}>
                Crop (ลาก/ปรับกรอบ แล้วกดซ้ำเพื่อ Apply)
              </PillButton>
              <div className="text-[11px] text-white/45">
                ถ้ายังไม่มีกรอบจะสลับเป็นโหมด Crop ให้ลากกรอบก่อน กดอีกครั้งจะ Apply
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="p-4 min-h-0">
            <div ref={wrapRef} className="w-full h-full rounded-3xl border border-white/10 bg-black/40 overflow-hidden">
              <canvas ref={hostRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------------------------
 *  Thumbnail component
 *  --------------------------*/
function Thumb({ file }: { file: FileItem }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let currentUrl: string | null = null;
    (async () => {
      try {
        const f = await file.handle.getFile();
        const u = URL.createObjectURL(f);
        if (!alive) return;
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = u;
        setUrl(u);
      } catch {
        setUrl(null);
      }
    })();
    return () => {
      alive = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.name, file.lastModified]);

  const isImg = isImageType(file.type, file.name);
  return (
    <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden flex items-center justify-center shrink-0">
      {isImg && url ? <img src={url} alt={file.name} className="h-full w-full object-cover" /> : <span className="text-white/40 text-xs">FILE</span>}
    </div>
  );
}

/** ---------------------------
 *  Main Page
 *  --------------------------*/
function PageContent() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  // Root handle + remember
  const [root, setRoot] = useState<DirHandle | null>(null);
  const [rootLabel, setRootLabel] = useState<string>("(not connected)");

  // Structure handles
  const [vcDir, setVcDir] = useState<DirHandle | null>(null);
  const [dateDir, setDateDir] = useState<DirHandle | null>(null);
  const [hnDir, setHnDir] = useState<DirHandle | null>(null);
  const [anDir, setAnDir] = useState<DirHandle | null>(null);
  const [originalDir, setOriginalDir] = useState<DirHandle | null>(null);
  const [chooseDir, setChooseDir] = useState<DirHandle | null>(null);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);

  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const dateKey = useMemo(() => (pickedDate ? makeDateKey(pickedDate) : ""), [pickedDate]);
  const caseIdParam = searchParams.get("caseId") || "";

  const [hnInput, setHnInput] = useState("");
  const [anInput, setAnInput] = useState("");
  const [casePrefill, setCasePrefill] = useState<CasePrefill | null>(null);
  const casePrefillAppliedRef = useRef<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [caseDetailCollapsed, setCaseDetailCollapsed] = useState(true);
  const [procedureRoomOptions, setProcedureRoomOptions] = useState<SelectOption[]>([]);
  const [procedureOptions, setProcedureOptions] = useState<SelectOption[]>([]);
  const [mainProcedureOptions, setMainProcedureOptions] = useState<SelectOption[]>([]);
  const [physicianOptions, setPhysicianOptions] = useState<SelectOption[]>([]);
  const [caseOptionLoading, setCaseOptionLoading] = useState(false);
  const [caseOptionError, setCaseOptionError] = useState<string | null>(null);

  // Dropdown options
  const [dateOptions, setDateOptions] = useState<Opt[]>([]);
  const [hnOptions, setHnOptions] = useState<Opt[]>([]);
  const [anOptions, setAnOptions] = useState<Opt[]>([]);

  const [dateSelected, setDateSelected] = useState<Opt | null>(null);
  const [hnSelected, setHnSelected] = useState<Opt | null>(null);
  const [anSelected, setAnSelected] = useState<Opt | null>(null);

  // Files + preview
  const [files, setFiles] = useState<FileItem[]>([]);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pickerRefreshTick, setPickerRefreshTick] = useState(0);
  const [videoCountdown, setVideoCountdown] = useState<number | null>(null);

  // Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playSound = useCallback((name: string, volume = 1) => {
    if (typeof window === "undefined") return;
    const audio = new Audio(`/sound/${name}.mp3`);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play().catch(() => {
      // ignore failures (policy/permission)
    });
  }, []);

  const captureCountRef = useRef(0);
  const captureSeqRef = useRef(0);
  const captureAudioRef = useRef<HTMLAudioElement | null>(null);
  const captureResolveRef = useRef<(() => void) | null>(null);

  const getNumberSoundSequence = useCallback((value: number) => {
    const normalized = ((value - 1) % 100) + 1;
    if (normalized <= 19) return [String(normalized)];
    if (normalized === 100) return ["100"];
    const tens = Math.floor(normalized / 10) * 10;
    const ones = normalized % 10;
    const seq = [String(tens)];
    if (ones !== 0) seq.push(String(ones));
    return seq;
  }, []);

  const stopCaptureAudio = useCallback(() => {
    if (captureResolveRef.current) {
      captureResolveRef.current();
      captureResolveRef.current = null;
    }
    if (captureAudioRef.current) {
      captureAudioRef.current.pause();
      captureAudioRef.current.currentTime = 0;
    }
  }, []);

  const playCaptureSound = useCallback((name: string, seqId: number, rate = 1.2) => {
    if (typeof window === "undefined") return Promise.resolve();
    return new Promise<void>((resolve) => {
      if (seqId !== captureSeqRef.current) {
        resolve();
        return;
      }
      const audio = new Audio(`/sound/${name}.mp3`);
      captureAudioRef.current = audio;
      captureResolveRef.current = resolve;
      audio.volume = 1;
      audio.playbackRate = rate;
      const finish = () => {
        if (captureResolveRef.current === resolve) captureResolveRef.current = null;
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }, []);

  const playCaptureCount = useCallback(
    async (count: number) => {
      const seqId = captureSeqRef.current + 1;
      captureSeqRef.current = seqId;
      stopCaptureAudio();
      const sequence = ["capture", ...getNumberSoundSequence(count)];
      for (const name of sequence) {
        if (seqId !== captureSeqRef.current) return;
        await playCaptureSound(name, seqId);
      }
    },
    [getNumberSoundSequence, playCaptureSound, stopCaptureAudio]
  );

  const runVideoCountdown = useCallback(async () => {
    for (let i = 3; i >= 1; i--) {
      setVideoCountdown(i);
      playSound(String(i));
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    setVideoCountdown(null);
  }, [playSound]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceSelected, setDeviceSelected] = useState<Opt | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Recording
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const camDefaults = useMemo(
    () => ({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sharpness: 50,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
    }),
    []
  );
  const [camBrightness, setCamBrightness] = useState(camDefaults.brightness);
  const [camContrast, setCamContrast] = useState(camDefaults.contrast);
  const [camSaturation, setCamSaturation] = useState(camDefaults.saturation);
  const [camSharpness, setCamSharpness] = useState(camDefaults.sharpness);
  const [camCropLeft, setCamCropLeft] = useState(camDefaults.cropLeft);
  const [camCropRight, setCamCropRight] = useState(camDefaults.cropRight);
  const [camCropTop, setCamCropTop] = useState(camDefaults.cropTop);
  const [camCropBottom, setCamCropBottom] = useState(camDefaults.cropBottom);
  const [camAdjustOpen, setCamAdjustOpen] = useState(false);
  const camAdjustLoadingRef = useRef<string | null>(null);
  const CAM_ADJUST_STORAGE_PREFIX = "vcapture_cam_adjust_";
  const camFilterRef = useRef("brightness(100%) contrast(100%) saturate(100%)");
  const camCropRef = useRef({ left: 0, right: 0, top: 0, bottom: 0 });
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const renderLoopRef = useRef<number | null>(null);

  // Modals
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFile, setEditorFile] = useState<FileItem | null>(null);

  // Stable mount (avoid hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!caseIdParam) return;
    setBuilderOpen(false);
  }, [caseIdParam]);

  useEffect(() => {
    if (!caseIdParam) return;
    setCaseDetailCollapsed(true);
  }, [caseIdParam]);

  useEffect(() => {
    if (!caseIdParam) return;
    let active = true;
    const loadCaseOptions = async () => {
      setCaseOptionLoading(true);
      setCaseOptionError(null);
      try {
        let types: SelectType[] = [];
        const needsTypes = Object.values(SELECT_TYPE_IDS).some((value) => !value);
        if (needsTypes) {
          const typeResponse = await getSelectTypes();
          if ((typeResponse as { error?: unknown })?.error) {
            throw new Error((typeResponse as { message?: string })?.message || "โหลดประเภทไม่สำเร็จ");
          }
          const typeRaw = (typeResponse as { data?: unknown })?.data ?? typeResponse;
          types = parseSelectTypes(typeRaw);
        }
        const typeIds = {
          procedureRoom: resolveTypeId("procedureRoom", types),
          procedure: resolveTypeId("procedure", types),
          mainProcedure: resolveTypeId("mainProcedure", types),
          physician: resolveTypeId("physician", types),
        };
        const [roomRes, procedureRes, mainRes, physicianRes] = await Promise.all([
          typeIds.procedureRoom ? getvaluebyselecttypeid(typeIds.procedureRoom) : Promise.resolve({ data: [] }),
          typeIds.procedure ? getvaluebyselecttypeid(typeIds.procedure) : Promise.resolve({ data: [] }),
          typeIds.mainProcedure ? getvaluebyselecttypeid(typeIds.mainProcedure) : Promise.resolve({ data: [] }),
          typeIds.physician ? getvaluebyselecttypeid(typeIds.physician) : Promise.resolve({ data: [] }),
        ]);
        if (!active) return;
        setProcedureRoomOptions(parseSelectOptions((roomRes as { data?: unknown })?.data ?? roomRes));
        setProcedureOptions(parseSelectOptions((procedureRes as { data?: unknown })?.data ?? procedureRes));
        setMainProcedureOptions(parseSelectOptions((mainRes as { data?: unknown })?.data ?? mainRes));
        setPhysicianOptions(parseSelectOptions((physicianRes as { data?: unknown })?.data ?? physicianRes));
      } catch (err: unknown) {
        if (!active) return;
        setCaseOptionError(err instanceof Error ? err.message : "โหลดชื่อไม่สำเร็จ");
      } finally {
        if (active) setCaseOptionLoading(false);
      }
    };
    loadCaseOptions();
    return () => {
      active = false;
    };
  }, [caseIdParam]);

  useEffect(() => {
    if (!caseIdParam) {
      setCaseDetail(null);
      setCasePrefill(null);
      return;
    }
    casePrefillAppliedRef.current = null;
    let active = true;
    (async () => {
      const response = await getCasebyid(caseIdParam);
      if (!active) return;
      if ((response as { error?: unknown })?.error) {
        alertErr("ดึงข้อมูลเคสไม่สำเร็จ", (response as { message?: string })?.message || "โปรดลองใหม่อีกครั้ง");
        return;
      }
      const data = (response as { data?: unknown })?.data ?? response;
      const row = data as Record<string, unknown> | null;
      if (!row) return;
      const hn = normalizeText(row.hn ?? row.HN ?? "");
      const an = normalizeText(row.an ?? row.AN ?? "");
      const registerDate = normalizeText(row.registerdate ?? row.registerDate ?? "");
      const registerTime = normalizeText(row.registertime ?? row.registerTime ?? "");
      const appointmentDate = normalizeText(row.appointmentdate ?? row.appointmentDate ?? "");
      const appointmentTime = normalizeText(row.appointmenttime ?? row.appointmentTime ?? "");
      const caseDate = normalizeText(row.casedate ?? row.caseDate ?? row.operationDate ?? "");
      const timeFrom = normalizeText(row.casetimefrom ?? row.caseTimeFrom ?? "");
      const timeTo = normalizeText(row.casetimeto ?? row.caseTimeTo ?? "");
      const procedureRoom = normalizeText(
        row.procedureroomid ??
        row.procedureRoomId ??
        row.procedureroomname ??
        row.procedureRoomName ??
        row.roomname ??
        row.room ??
        ""
      );
      const procedure = normalizeText(
        row.mainprocedureid ??
        row.mainProcedureId ??
        row.mainprocedurename ??
        row.mainProcedureName ??
        row.procedurename ??
        row.procedureName ??
        row.procedure ??
        row.caseType ??
        ""
      );
      const physician = normalizeText(
        row.physicians1id ??
        row.physicians1Id ??
        row.physicians1name ??
        row.physicians1Name ??
        row.physicianname ??
        row.physicianName ??
        row.doctorname ??
        row.doctorName ??
        row.doctor ??
        row.physician ??
        ""
      );
      const note = normalizeText(row.note ?? "");
      const caseNo = normalizeText(row.casenumber ?? row.caseNumber ?? row.caseNo ?? "");
      const date = parseApiDate(
        row.casedate ??
        row.caseDate ??
        row.operationDate ??
        row.appointmentdate ??
        row.appointmentDate ??
        row.registerdate ??
        row.registerDate ??
        row.date ??
        row.createdate ??
        row.createDate ??
        row.createdAt
      );
      const prefill: CasePrefill = { caseId: caseIdParam, hn, an, date };
      setCasePrefill(prefill);
      setCaseDetail({
        caseId: caseIdParam,
        hn,
        an,
        caseNo,
        registerDate,
        registerTime,
        appointmentDate,
        appointmentTime,
        caseDate,
        timeFrom,
        timeTo,
        procedureRoom,
        procedure,
        physician,
        note,
      });
      if (date) setPickedDate(date);
      if (hn) setHnInput(hn);
      if (an) setAnInput(an);
    })();
    return () => {
      active = false;
    };
  }, [caseIdParam]);

  const persistLastSelection = useCallback(() => {
    if (!dateSelected?.value) return;
    const payload: LastSelection = {
      date: dateSelected.value,
      dateLabel: dateSelected.label,
      pickedDate: pickedDate ? pickedDate.toISOString() : undefined,
      hn: hnSelected?.value,
      hnLabel: hnSelected?.label,
      an: anSelected?.value,
      anLabel: anSelected?.label,
    };
    void idbSet(LAST_SELECTION_KEY, payload);
  }, [dateSelected, hnSelected, pickedDate, anSelected]);

  useEffect(() => {
    persistLastSelection();
  }, [persistLastSelection]);

  const computeCamFilter = useCallback(
    (b?: number, c?: number, s?: number) => {
      const br = Math.max(0, b ?? camBrightness);
      const ct = Math.max(0, c ?? camContrast);
      const sa = Math.max(0, s ?? camSaturation);
      return `brightness(${br}%) contrast(${ct}%) saturate(${sa}%)`;
    },
    [camBrightness, camContrast, camSaturation]
  );

  const applyCameraAdjust = useCallback(
    async (brightness?: number, sharpness?: number) => {
      const track = streamRef.current?.getVideoTracks?.()[0];
      if (!track) return;
      const adv: any[] = [];
      if (typeof brightness === "number") adv.push({ brightness });
      if (typeof sharpness === "number") adv.push({ sharpness });
      if (adv.length === 0) return;
      try {
        await track.applyConstraints({ advanced: adv });
      } catch {
        // ignore unsupported constraints
      }
    },
    []
  );

  // keep live filter applied to preview video and refs for capture/record
  useEffect(() => {
    const f = computeCamFilter();
    camFilterRef.current = f;
    if (videoRef.current) {
      videoRef.current.style.filter = f;
    }
  }, [computeCamFilter]);

  useEffect(() => {
    camCropRef.current = {
      left: camCropLeft,
      right: camCropRight,
      top: camCropTop,
      bottom: camCropBottom,
    };
  }, [camCropLeft, camCropRight, camCropTop, camCropBottom]);

  useEffect(() => {
    const deviceId = deviceSelected?.value;
    if (!deviceId) return;
    try {
      const raw = localStorage.getItem(`${CAM_ADJUST_STORAGE_PREFIX}${deviceId}`);
      if (!raw) return;
      const data = JSON.parse(raw || "{}");
      const clamp = (v: any, min: number, max: number, fallback: number) =>
        typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
      const br = clamp(data.brightness, 0, 200, camDefaults.brightness);
      const ct = clamp(data.contrast, 50, 200, camDefaults.contrast);
      const sa = clamp(data.saturation, 50, 200, camDefaults.saturation);
      const sh = clamp(data.sharpness, 0, 100, camDefaults.sharpness);
      setCamBrightness(br);
      setCamContrast(ct);
      setCamSaturation(sa);
      setCamSharpness(sh);
      setCamCropLeft(clamp(data.cropLeft, 0, 40, camDefaults.cropLeft));
      setCamCropRight(clamp(data.cropRight, 0, 40, camDefaults.cropRight));
      setCamCropTop(clamp(data.cropTop, 0, 40, camDefaults.cropTop));
      setCamCropBottom(clamp(data.cropBottom, 0, 40, camDefaults.cropBottom));
      camAdjustLoadingRef.current = deviceId;
      setTimeout(() => {
        if (camAdjustLoadingRef.current === deviceId) camAdjustLoadingRef.current = null;
      }, 0);
      if (streamRef.current?.getVideoTracks?.()[0]) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        applyCameraAdjust(br, sh);
      }
    } catch {
      // ignore malformed storage
    }
  }, [deviceSelected, camDefaults, applyCameraAdjust]);

  useEffect(() => {
    const deviceId = deviceSelected?.value;
    if (!deviceId) return;
    if (camAdjustLoadingRef.current === deviceId) return;
    const payload = {
      brightness: camBrightness,
      contrast: camContrast,
      saturation: camSaturation,
      sharpness: camSharpness,
      cropLeft: camCropLeft,
      cropRight: camCropRight,
      cropTop: camCropTop,
      cropBottom: camCropBottom,
    };
    try {
      localStorage.setItem(`${CAM_ADJUST_STORAGE_PREFIX}${deviceId}`, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }, [deviceSelected, camBrightness, camContrast, camSaturation, camSharpness, camCropLeft, camCropRight, camCropTop, camCropBottom]);

  const previewCropTransform = useMemo(() => {
    const clamp = (v: number) => Math.max(0, Math.min(60, v));
    const l = clamp(camCropLeft) / 100;
    const r = clamp(camCropRight) / 100;
    const t = clamp(camCropTop) / 100;
    const b = clamp(camCropBottom) / 100;
    const wFactor = Math.max(0.05, 1 - l - r);
    const hFactor = Math.max(0.05, 1 - t - b);
    const sx = 1 / wFactor;
    const sy = 1 / hFactor;
    const tx = -l * sx * 100;
    const ty = -t * sy * 100;
    return `translate(${tx}%, ${ty}%) scale(${sx}, ${sy})`;
  }, [camCropLeft, camCropRight, camCropTop, camCropBottom]);

  const getCropPixels = useCallback((w: number, h: number) => {
    const c = camCropRef.current;
    const left = Math.max(0, Math.min(60, c.left));
    const right = Math.max(0, Math.min(60, c.right));
    const top = Math.max(0, Math.min(60, c.top));
    const bottom = Math.max(0, Math.min(60, c.bottom));
    const sx = Math.floor((w * left) / 100);
    const sy = Math.floor((h * top) / 100);
    const sw = Math.max(1, Math.floor(w * (1 - (left + right) / 100)));
    const sh = Math.max(1, Math.floor(h * (1 - (top + bottom) / 100)));
    return { sx, sy, sw, sh };
  }, []);

  const stopRenderLoop = useCallback(() => {
    if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);
    renderLoopRef.current = null;
  }, []);

  const startRenderLoop = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!renderCanvasRef.current) renderCanvasRef.current = document.createElement("canvas");
    const c = renderCanvasRef.current;
    renderCtxRef.current = c.getContext("2d");

    const draw = () => {
      if (!renderCanvasRef.current || !renderCtxRef.current || !videoRef.current) {
        renderLoopRef.current = requestAnimationFrame(draw);
        return;
      }
      const vid = videoRef.current;
      const w = vid.videoWidth || 1280;
      const h = vid.videoHeight || 720;
      renderCanvasRef.current.width = w;
      renderCanvasRef.current.height = h;

      const ctx = renderCtxRef.current;
      ctx.clearRect(0, 0, w, h);
      ctx.filter = camFilterRef.current;
      const { sx, sy, sw, sh } = getCropPixels(w, h);
      ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, w, h);
      ctx.filter = "none";

      renderLoopRef.current = requestAnimationFrame(draw);
    };

    stopRenderLoop();
    renderLoopRef.current = requestAnimationFrame(draw);
  }, [getCropPixels, stopRenderLoop]);

  const CameraAdjustControls = () => (
    <div className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] text-white/70 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between mb-2">
        <span className="uppercase tracking-[0.08em] text-[10px] text-white/60">Adjust</span>
        <span className="text-white/40">Cam</span>
      </div>
      <div className="space-y-2">
        {[
          {
            label: "Brightness",
            value: camBrightness,
            min: 0,
            max: 200,
            onChange: (v: number) => {
              setCamBrightness(v);
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              applyCameraAdjust(v, camSharpness);
            },
            suffix: "%",
          },
          {
            label: "Contrast",
            value: camContrast,
            min: 50,
            max: 200,
            onChange: (v: number) => setCamContrast(v),
            suffix: "%",
          },
          {
            label: "Saturate",
            value: camSaturation,
            min: 50,
            max: 200,
            onChange: (v: number) => setCamSaturation(v),
            suffix: "%",
          },
          {
            label: "Sharp",
            value: camSharpness,
            min: 0,
            max: 100,
            onChange: (v: number) => {
              setCamSharpness(v);
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              applyCameraAdjust(camBrightness, v);
            },
            suffix: "",
          },
          {
            label: "Crop L",
            value: camCropLeft,
            min: 0,
            max: 40,
            onChange: (v: number) => setCamCropLeft(v),
            suffix: "%",
          },
          {
            label: "Crop R",
            value: camCropRight,
            min: 0,
            max: 40,
            onChange: (v: number) => setCamCropRight(v),
            suffix: "%",
          },
          {
            label: "Crop T",
            value: camCropTop,
            min: 0,
            max: 40,
            onChange: (v: number) => setCamCropTop(v),
            suffix: "%",
          },
          {
            label: "Crop B",
            value: camCropBottom,
            min: 0,
            max: 40,
            onChange: (v: number) => setCamCropBottom(v),
            suffix: "%",
          },
        ].map((it) => (
          <div key={it.label} className="grid grid-cols-[66px_1fr_56px_44px] items-center gap-2">
            <span className="text-white/65">{it.label}</span>
            <input
              type="range"
              min={it.min}
              max={it.max}
              value={it.value}
              onChange={(e) => it.onChange(Number(e.target.value))}
              className="w-full min-w-0 accent-emerald-400"
            />
            <input
              type="number"
              min={it.min}
              max={it.max}
              value={it.value}
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (Number.isNaN(raw)) return;
                const v = Math.min(it.max, Math.max(it.min, raw));
                it.onChange(v);
              }}
              className="h-8 w-full min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 text-right text-white/90 outline-none"
            />
            <span className="text-right text-white/70">
              {it.value}
              {it.suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  /** ----- Root connect / disconnect ----- */
  const connectRoot = useCallback(async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        alertErr("Browser ไม่รองรับ", "ต้องใช้ Chrome/Edge ที่รองรับ File System Access API");
        return;
      }
      const saved = await idbGet<DirHandle>("rootHandle");
      if (saved) {
        const perm = await (saved as any).queryPermission?.({ mode: "readwrite" });
        if (perm !== "granted") {
          const req = await (saved as any).requestPermission?.({ mode: "readwrite" });
          if (req !== "granted") {
            alertErr("ยังไม่ได้อนุญาตสิทธิ์", "โปรดกด Allow เพื่อเชื่อมต่อ Root เดิม");
            return;
          }
        }
        setRoot(saved);
        setRootLabel(saved.name || "Root");
        alertOk("เชื่อมต่อ Root เดิมแล้ว");
        return;
      }
      const h = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      setRoot(h);
      setRootLabel(h.name || "Root");
      await idbSet("rootHandle", h);
      alertOk("เชื่อมต่อ Root แล้ว");
    } catch (e: any) {
      alertErr("เลือก Root ไม่สำเร็จ", e?.message || String(e));
    }
  }, []);

  const disconnectRoot = useCallback(async () => {
    setRoot(null);
    setRootLabel("(not connected)");
    setVcDir(null);
    setDateDir(null);
    setHnDir(null);
    setAnDir(null);
    setOriginalDir(null);
    setChooseDir(null);
    setFiles([]);
    setPreview(null);
    setPreviewUrl(null);
    setDateOptions([]);
    setHnOptions([]);
    setAnOptions([]);
    setDateSelected(null);
    setHnSelected(null);
    setAnSelected(null);
    setHnInput("");
    setAnInput("");
    await idbDel("rootHandle");
    alertInfo("ตัดการเชื่อมต่อแล้ว");
  }, []);

  // Auto reconnect root from IDB
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      try {
        const saved = await idbGet<DirHandle>("rootHandle");
        if (!saved) return;

        // auto-reconnect only if permission already granted
        const perm = await (saved as any).queryPermission?.({ mode: "readwrite" });
        if (perm !== "granted") return;
        setRoot(saved);
        setRootLabel(saved.name || "Root");
      } catch {
        // ignore
      }
    })();
  }, [mounted]);

  /** ----- Ensure base structure: Root/VideoCapture ----- */
  const ensureVideoCapture = useCallback(async () => {
    if (!root) return null;
    try {
      const v = await ensureDir(root, "VideoCapture");
      setVcDir(v);
      return v;
    } catch (e: any) {
      alertErr("สร้าง/เปิด VideoCapture ไม่สำเร็จ", e?.message || String(e));
      return null;
    }
  }, [root]);

  // Whenever root set, ensure VideoCapture and load date folders
  useEffect(() => {
    if (!mounted) return;
    if (!root) return;

    (async () => {
      const v = await ensureVideoCapture();
      if (!v) return;

      const ds = await listDirs(v);
      const opts: Opt[] = ds
        .filter((x) => /^\d{6}$/.test(x)) // ddMMyy
        .map((k) => {
          // best effort parse for label
          const dd = Number(k.slice(0, 2));
          const mm = Number(k.slice(2, 4));
          const yy = Number(k.slice(4, 6)); // BE last2
          const be = 2500 + yy; // approximate (25xx)
          const label = `${k} — ${dd} ${TH_MONTHS[Math.max(0, Math.min(11, mm - 1))]} ${be}`;
          return { value: k, label };
        });

      setDateOptions(opts);
    })().catch(() => { });
  }, [mounted, root, ensureVideoCapture]);

  /** ----- Folder builder create/select ----- */
  const createOrSelectDate = useCallback(async () => {
    if (!vcDir) {
      alertErr("ยังไม่มี Root", "กรุณาเลือก Root ก่อน");
      return;
    }
    if (!pickedDate) {
      alertErr("ยังไม่ได้เลือกวันที่");
      return;
    }
    try {
      const d = await ensureDir(vcDir, dateKey);
      setDateDir(d);

      // refresh date options
      const ds = await listDirs(vcDir);
      const opts: Opt[] = ds
        .filter((x) => /^\d{6}$/.test(x))
        .map((k) => ({ value: k, label: `${k} — (พศ.)` }));
      setDateOptions(opts);

      setDateSelected({ value: dateKey, label: `${dateKey} — ${formatThaiBEDisplay(pickedDate)}` });
      alertOk("พร้อมใช้งาน Date Folder", dateKey);
    } catch (e: any) {
      alertErr("สร้าง Date Folder ไม่สำเร็จ", e?.message || String(e));
    }
  }, [vcDir, pickedDate, dateKey]);

  const loadHNOptions = useCallback(async (d: DirHandle | null) => {
    if (!d) {
      setHnOptions([]);
      return;
    }
    const names = await listDirs(d);
    const opts = names.map((x) => ({ value: x, label: x }));
    setHnOptions(opts);
  }, []);

  const loadANOptions = useCallback(async (h: DirHandle | null) => {
    if (!h) {
      setAnOptions([]);
      return;
    }
    const names = await listDirs(h);
    const opts = names.map((x) => ({ value: x, label: x }));
    setAnOptions(opts);
  }, []);

  const selectDateFolder = useCallback(
    async (opt: Opt | null, options?: { silent?: boolean; create?: boolean }) => {
      const silent = options?.silent;
      const create = options?.create;
      setDateSelected(opt);
      setHnSelected(null);
      setAnSelected(null);
      setDateDir(null);
      setHnDir(null);
      setAnDir(null);
      setOriginalDir(null);
      setChooseDir(null);
      setFiles([]);
      setPreview(null);
      setPreviewUrl(null);

      if (!opt || !vcDir) return null;
      try {
        const d = await vcDir.getDirectoryHandle(opt.value, { create: Boolean(create) });
        setDateDir(d);
        await loadHNOptions(d);
        if (create) {
          const ds = await listDirs(vcDir);
          const opts: Opt[] = ds
            .filter((x) => /^\d{6}$/.test(x))
            .map((k) => ({ value: k, label: `${k} — (พศ.)` }));
          setDateOptions(opts);
        }
        return d;
      } catch (e: any) {
        if (!silent) alertErr("เปิด Date Folder ไม่สำเร็จ", e?.message || String(e));
        return null;
      }
    },
    [vcDir, loadHNOptions]
  );

  const createHN = useCallback(async () => {
    if (!dateDir) return alertErr("ยังไม่มี Date Folder");
    const hn = hnInput.trim();
    if (!hn) return alertErr("กรอก HN ก่อน");
    try {
      const h = await ensureDir(dateDir, hn);
      setHnDir(h);
      setHnSelected({ value: hn, label: hn });
      await loadHNOptions(dateDir);
      await loadANOptions(h);
      alertOk("สร้าง/เลือก HN แล้ว", hn);
    } catch (e: any) {
      alertErr("สร้าง HN ไม่สำเร็จ", e?.message || String(e));
    }
  }, [dateDir, hnInput, loadHNOptions, loadANOptions]);

  const selectHNFolder = useCallback(
    async (opt: Opt | null, options?: { silent?: boolean; create?: boolean }, parentDir?: DirHandle | null) => {
      const silent = options?.silent;
      const create = options?.create;
      setHnSelected(opt);
      setAnSelected(null);
      setHnDir(null);
      setAnDir(null);
      setOriginalDir(null);
      setChooseDir(null);
      setFiles([]);
      setPreview(null);
      setPreviewUrl(null);

      const baseDir = parentDir ?? dateDir;
      if (!opt || !baseDir) return null;
      try {
        const h = await baseDir.getDirectoryHandle(opt.value, { create: Boolean(create) });
        setHnDir(h);
        await loadANOptions(h);
        return h;
      } catch (e: any) {
        if (!silent) alertErr("เปิด HN Folder ไม่สำเร็จ", e?.message || String(e));
        return null;
      }
    },
    [dateDir, loadANOptions]
  );

  const createAN = useCallback(async () => {
    if (!hnDir) return alertErr("ยังไม่มี HN Folder");
    const an = anInput.trim();
    if (!an) return alertErr("กรอก AN ก่อน");
    try {
      const v = await ensureDir(hnDir, an);
      setAnDir(v);

      // FIX bucket = original
      const orig = await ensureDir(v, "original");
      const ch = await ensureDir(v, "choose");
      setOriginalDir(orig);
      setChooseDir(ch);

      setAnSelected({ value: an, label: an });
      await loadANOptions(hnDir);
      alertOk("สร้าง/เลือก AN แล้ว", an);

      // refresh file list
      const fl = await listFiles(orig);
      setFiles(fl);
      if (fl[0]) setPreviewKeepScroll(fl[0]);
    } catch (e: any) {
      alertErr("สร้าง AN ไม่สำเร็จ", e?.message || String(e));
    }
  }, [hnDir, anInput, loadANOptions]);

  const selectANFolder = useCallback(
    async (opt: Opt | null, options?: { silent?: boolean; create?: boolean }, parentDir?: DirHandle | null) => {
      const silent = options?.silent;
      const create = options?.create;
      setAnSelected(opt);
      setAnDir(null);
      setOriginalDir(null);
      setChooseDir(null);
      setFiles([]);
      setPreview(null);

      const baseDir = parentDir ?? hnDir;
      if (!opt || !baseDir) return;
      try {
        const v = await baseDir.getDirectoryHandle(opt.value, { create: Boolean(create) });
        setAnDir(v);

        const orig = await ensureDir(v, "original");
        const ch = await ensureDir(v, "choose");
        setOriginalDir(orig);
        setChooseDir(ch);

        const fl = await listFiles(orig);
        setFiles(fl);
        if (fl[0]) setPreviewKeepScroll(fl[0]);
        return v;
      } catch (e: any) {
        if (!silent) alertErr("เปิด AN ไม่สำเร็จ", e?.message || String(e));
        return null;
      }
    },
    [hnDir]
  );

  const refreshFiles = useCallback(async () => {
    if (!originalDir) return;
    const fl = await listFiles(originalDir);
    setFiles(fl);
  }, [originalDir]);

  const applyCasePrefill = useCallback(
    async (prefill: CasePrefill) => {
      if (!vcDir) return;
      const date = prefill.date ?? null;
      const dateValue = date ? makeDateKey(date) : "";
      const dateLabel = date ? `${dateValue} — ${formatThaiBEDisplay(date)}` : dateValue;
      const dateDir = dateValue
        ? await selectDateFolder({ value: dateValue, label: dateLabel }, { silent: true, create: true })
        : null;
      if (prefill.hn) {
        const hnValue = prefill.hn;
        const hnDir = await selectHNFolder(
          { value: hnValue, label: hnValue },
          { silent: true, create: true },
          dateDir ?? undefined
        );
        if (prefill.an) {
          const anValue = prefill.an;
          await selectANFolder(
            { value: anValue, label: anValue },
            { silent: true, create: true },
            hnDir ?? undefined
          );
        }
      }
      await refreshFiles();
    },
    [vcDir, selectDateFolder, selectHNFolder, selectANFolder, refreshFiles]
  );

  const restoreSelectionVcRef = useRef<DirHandle | null>(null);

  useEffect(() => {
    if (!vcDir) {
      restoreSelectionVcRef.current = null;
      return;
    }
    if (restoreSelectionVcRef.current === vcDir) return;
    restoreSelectionVcRef.current = vcDir;

    let cancelled = false;
    (async () => {
      try {
        const saved = await idbGet<LastSelection>(LAST_SELECTION_KEY);
        if (!saved?.date) return;
        if (cancelled) return;
        const parsedDate = saved.pickedDate ? new Date(saved.pickedDate) : parseDateKey(saved.date);
        if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
          setPickedDate(parsedDate);
        }
        const dateLabel =
          saved.dateLabel || (parsedDate ? `${saved.date} — ${formatThaiBEDisplay(parsedDate)}` : saved.date);
        const restoredDateDir = await selectDateFolder(
          { value: saved.date, label: dateLabel },
          { silent: true }
        );
        if (saved.hn) {
          const restoredHnDir = await selectHNFolder(
            { value: saved.hn, label: saved.hnLabel || saved.hn },
            { silent: true },
            restoredDateDir ?? undefined
          );
          if (saved.an) {
            await selectANFolder(
              { value: saved.an, label: saved.anLabel || saved.an },
              { silent: true },
              restoredHnDir ?? undefined
            );
          }
        }
        await refreshFiles();
      } catch {
        // ignore restore failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vcDir, selectDateFolder, selectHNFolder, selectANFolder, refreshFiles]);

  useEffect(() => {
    if (!casePrefill || !vcDir) return;
    if (casePrefillAppliedRef.current === casePrefill.caseId) return;
    casePrefillAppliedRef.current = casePrefill.caseId;
    void applyCasePrefill(casePrefill);
  }, [casePrefill, vcDir, applyCasePrefill]);

  /** ----- current path click: copy + refresh + scroll ----- */
  const filesPanelRef = useRef<HTMLDivElement | null>(null);
  const filesListRef = useRef<HTMLDivElement | null>(null);
  const previewScrollTopRef = useRef(0);
  const pageScrollTopRef = useRef(0);

  const currentPathText = useMemo(() => {
    const parts: string[] = [];
    if (dateSelected?.value) parts.push(dateSelected.value);
    if (hnSelected?.value) parts.push(hnSelected.value);
    if (anSelected?.value) parts.push(anSelected.value);
    // FIX bucket
    return `VideoCapture/${parts.join(" / ")}/original`;
  }, [dateSelected, hnSelected, anSelected]);

  const onClickPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentPathText);
      await refreshFiles();
      filesPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      alertOk("คัดลอก path แล้ว", currentPathText);
    } catch {
      alertInfo("ไม่สามารถคัดลอกได้", currentPathText);
    }
  }, [currentPathText, refreshFiles]);

  const setPreviewKeepScroll = useCallback((it: FileItem | null) => {
    previewScrollTopRef.current = filesListRef.current?.scrollTop ?? 0;
    pageScrollTopRef.current = window.scrollY || 0;
    setPreview(it);
  }, []);

  useLayoutEffect(() => {
    const el = filesListRef.current;
    if (!el) return;
    el.scrollTop = previewScrollTopRef.current;
    if (window.scrollY !== pageScrollTopRef.current) {
      window.scrollTo({ top: pageScrollTopRef.current });
    }
  }, [preview, previewUrl]);

  /** ----- Camera: enumerate + open/close ----- */
  const refreshDevices = useCallback(async () => {
    try {
      const ds = await navigator.mediaDevices.enumerateDevices();
      const cams = ds.filter((d) => d.kind === "videoinput");
      setDevices(cams);

      // default first
      if (!deviceSelected && cams[0]) {
        setDeviceSelected({ value: cams[0].deviceId, label: cams[0].label || `Camera (${cams[0].deviceId.slice(0, 6)})` });
      }
    } catch (e: any) {
      alertErr("อ่านรายการกล้องไม่สำเร็จ", e?.message || String(e));
    }
  }, [deviceSelected]);

  useEffect(() => {
    if (!mounted) return;
    // get permission first to show labels
    (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch { }
      await refreshDevices();
    })().catch(() => { });
  }, [mounted, refreshDevices]);

  const stopStream = useCallback(() => {
    const s = streamRef.current;
    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsRecording(false);
    recorderRef.current = null;
    recChunksRef.current = [];
    stopRenderLoop();
  }, []);

  const openCamera = useCallback(async () => {
    try {
      stopStream();
      const deviceId = deviceSelected?.value;
      const s = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: true,
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      await applyCameraAdjust(camBrightness, camSharpness);
      await refreshFiles();
      alertOk("เปิดกล้องแล้ว");
    } catch (e: any) {
      alertErr("เปิดกล้องไม่สำเร็จ", e?.message || String(e));
    }
  }, [deviceSelected, stopStream, applyCameraAdjust, camBrightness, camSharpness, refreshFiles]);

  /** ----- Save helpers (original only) ----- */
  const canSave = !!originalDir && !!dateSelected && !!hnSelected && !!anSelected;

  const savePhoto = useCallback(async () => {
    if (!originalDir) return alertErr("ยังไม่มีโฟลเดอร์ original");
    if (!canSave) return alertErr("ต้องเลือก Date/HN/AN ก่อนบันทึก");
    if (!videoRef.current) return;

    try {
      const v = videoRef.current;
      const c = document.createElement("canvas");
      const w = v.videoWidth || 1280;
      const h = v.videoHeight || 720;
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.filter = camFilterRef.current;
      const { sx, sy, sw, sh } = getCropPixels(w, h);
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
      ctx.filter = "none";

      const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/png"));

      const name = `photo_${Date.now()}.png`;
      const fh = await originalDir.getFileHandle(name, { create: true });
      await writeFile(fh, blob);

      await refreshFiles();
      const fl = await listFiles(originalDir);
      const imageCount = fl.filter((item) => isImageType(item.type, item.name)).length;
      const just = fl.find((x) => x.name === name) || fl[0] || null;
      setPreviewKeepScroll(just);
      alertOk("ถ่ายรูปสำเร็จ", name);
      captureCountRef.current = imageCount;
      void playCaptureCount(imageCount);
    } catch (e: any) {
      alertErr("ถ่ายรูปไม่สำเร็จ", e?.message || String(e));
    }
  }, [originalDir, canSave, refreshFiles, playCaptureCount]);

  const startVideo = useCallback(async () => {
    if (videoCountdown !== null) return;
    if (!originalDir) return alertErr("ยังไม่มีโฟลเดอร์ original");
    if (!canSave) return alertErr("ต้องเลือก Date/HN/AN ก่อนบันทึก");
    const s = streamRef.current;
    if (!s) return alertErr("ยังไม่ได้เปิดกล้อง");

    try {
      await runVideoCountdown();
      // draw filtered frames to hidden canvas, then record that stream (keeps filters in video)
      startRenderLoop();
      const canvasStream = (renderCanvasRef.current || document.createElement("canvas")).captureStream(30);
      // keep audio from original stream
      s.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

      recChunksRef.current = [];
      const rec = new MediaRecorder(canvasStream, { mimeType: "video/webm;codecs=vp8,opus" });
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        try {
          const blob = new Blob(recChunksRef.current, { type: "video/webm" });
          const name = `video_${Date.now()}.webm`;
          const fh = await originalDir.getFileHandle(name, { create: true });
          await writeFile(fh, blob);
          await refreshFiles();
          const fl = await listFiles(originalDir);
          const just = fl.find((x) => x.name === name) || fl[0] || null;
          setPreviewKeepScroll(just);
          alertOk("บันทึกวิดีโอสำเร็จ", name);
        } catch (e: any) {
          alertErr("บันทึกวิดีโอไม่สำเร็จ", e?.message || String(e));
        } finally {
          setIsRecording(false);
          recorderRef.current = null;
          recChunksRef.current = [];
          stopRenderLoop();
        }
      };

      rec.start(200);
      setIsRecording(true);
      alertInfo("กำลังอัดวิดีโอ...");
      playSound("recording");
      await applyCameraAdjust(camBrightness, camSharpness);
    } catch (e: any) {
      alertErr("เริ่มอัดวิดีโอไม่สำเร็จ", e?.message || String(e));
    } finally {
      setVideoCountdown(null);
    }
  }, [
    applyCameraAdjust,
    camBrightness,
    camSharpness,
    canSave,
    originalDir,
    refreshFiles,
    runVideoCountdown,
    startRenderLoop,
    stopRenderLoop,
    videoCountdown,
    playSound,
  ]);

  const stopVideo = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    try {
      rec.stop();
      playSound("recordend");
    } catch { }
  }, [playSound]);

  /** ----- Preview URL management ----- */
  useEffect(() => {
    let cancelled = false;
    if (!preview) {
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      return;
    }
    (async () => {
      try {
        const f = await preview.handle.getFile();
        const u = URL.createObjectURL(f);
        if (!cancelled) {
          setPreviewUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return u;
          });
        }
      } catch {
        if (!cancelled) {
          setPreviewUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return null;
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
    };
  }, [preview]);

  /** ----- Files actions ----- */
  const downloadFile = useCallback(async (it: FileItem) => {
    try {
      const f = await it.handle.getFile();
      const u = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = u;
      a.download = it.name;
      a.click();
      URL.revokeObjectURL(u);
    } catch (e: any) {
      alertErr("ดาวน์โหลดไม่สำเร็จ", e?.message || String(e));
    }
  }, []);

  const deleteFile = useCallback(
    async (it: FileItem) => {
      if (!originalDir) return;
      const ok = await confirmSwal("ลบไฟล์?", it.name);
      if (!ok) return;
      try {
        await deleteEntry(originalDir, it.name);
        await refreshFiles();
        alertOk("ลบแล้ว", it.name);
      } catch (e: any) {
        alertErr("ลบไม่สำเร็จ", e?.message || String(e));
      }
    },
    [originalDir, refreshFiles]
  );

  const openPicker = useCallback(() => {
    if (!originalDir || !chooseDir) return alertErr("ยังไม่มี original/choose", "เลือก Date/HN/AN ก่อน");
    stopStream();
    setPickerOpen(true);
  }, [originalDir, chooseDir, stopStream]);

  const exportReport = useCallback(async () => {
    if (!chooseDir) {
      alertErr("ยังไม่มีโฟลเดอร์ choose", "เลือก Date/HN/AN ก่อน");
      return;
    }
    if (!dateSelected || !hnSelected || !anSelected) {
      alertErr("ข้อมูลไม่ครบ", "ต้องเลือก Date/HN/AN ก่อน");
      return;
    }
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      alertErr("เปิดแท็บใหม่ไม่สำเร็จ", "กรุณาอนุญาต popup แล้วลองใหม่");
      return;
    }
    try {
      reportWindow.document.write(
        "<!doctype html><title>กำลังสร้างรีพอร์ท...</title><body style='font-family:Sarabun,sans-serif;padding:24px;background:#0f172a;color:#e2e8f0'>กำลังสร้างรีพอร์ท...</body>"
      );
      reportWindow.opener = null;
    } catch {
      // ignore write failures
    }
    try {
      const fl = await listFiles(chooseDir);
      const imgs = fl.filter((f) => isImageType(f.type, f.name));
      if (imgs.length === 0) {
        reportWindow.close();
        alertInfo("ไม่มีรูปใน choose");
        return;
      }

      const toDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

      const images = [];
      for (const it of imgs) {
        const f = await it.handle.getFile();
        images.push({
          name: it.name,
          type: f.type || it.type || "",
          size: f.size,
          dataUrl: await toDataUrl(f),
        });
      }

      const payload = {
        date: dateSelected.value,
        hn: hnSelected.value,
        an: anSelected.value,
        images,
      };

      const reportKey = `${REPORT_STORAGE_KEY}:${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const payloadJson = JSON.stringify(payload);
      sessionStorage.setItem(REPORT_STORAGE_KEY, payloadJson);
      localStorage.setItem(reportKey, payloadJson);
      const reportUrl = `/report?payload=${encodeURIComponent(reportKey)}`;
      reportWindow.location.href = reportUrl;
    } catch (e: any) {
      reportWindow.close();
      alertErr("ออกรีพอร์ทไม่สำเร็จ", e?.message || String(e));
    }
  }, [chooseDir, dateSelected, hnSelected, anSelected]);

  const openEditor = useCallback((f: FileItem) => {
    setEditorFile(f);
    setEditorOpen(true);
  }, []);

  // auto refresh files when originalDir is ready or when Files panel is opened
  useEffect(() => {
    if (originalDir && filesOpen) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      refreshFiles();
    }
  }, [originalDir, filesOpen, refreshFiles]);

  // Select options
  const cameraOptions: Opt[] = devices.map((d) => ({
    value: d.deviceId,
    label: d.label || `Camera (${d.deviceId.slice(0, 6)})`,
  }));

  const beDateLabel = pickedDate ? formatThaiBEDisplay(pickedDate) : "เลือกวันที่ (พ.ศ.)";

  const builderPathHint = useMemo(() => {
    const d = dateSelected?.value ? `VideoCapture/${dateSelected.value}` : "VideoCapture/(ยังไม่มี date)";
    const h = hnSelected?.value ? `${d}/${hnSelected.value}` : `${d}/(ยังไม่มี HN)`;
    const v = anSelected?.value ? `${h}/${anSelected.value}` : `${h}/(ยังไม่มี AN)`;
    return `${v}/original`;
  }, [dateSelected, hnSelected, anSelected]);

  const showCaseDetails = Boolean(caseIdParam);
  const caseFolderReady = Boolean(originalDir && chooseDir);
  const caseDetailView = {
    caseId: caseDetail?.caseId || caseIdParam || "-",
    hn: caseDetail?.hn || hnInput || "-",
    an: caseDetail?.an || anInput || "-",
    caseNo: caseDetail?.caseNo || "-",
    registerDate: formatDateDisplay(caseDetail?.registerDate),
    registerTime: formatTimeDisplay(caseDetail?.registerTime),
    appointmentDate: formatDateDisplay(caseDetail?.appointmentDate),
    appointmentTime: formatTimeDisplay(caseDetail?.appointmentTime),
    caseDate: formatDateDisplay(caseDetail?.caseDate || pickedDate),
    timeFrom: formatTimeDisplay(caseDetail?.timeFrom),
    timeTo: formatTimeDisplay(caseDetail?.timeTo),
    procedureRoom:
      getOptionLabel(procedureRoomOptions, caseDetail?.procedureRoom || "") || caseDetail?.procedureRoom || "-",
    procedure:
      getOptionLabel(mainProcedureOptions, caseDetail?.procedure || "") ||
      getOptionLabel(procedureOptions, caseDetail?.procedure || "") ||
      caseDetail?.procedure ||
      "-",
    physician: getOptionLabel(physicianOptions, caseDetail?.physician || "") || caseDetail?.physician || "-",
    note: caseDetail?.note || "-",
  };

  const renderCameraPreviewSection = () => (
    <div className="grid grid-cols-12 gap-4 min-h-0">
      {/* Camera */}
      <GlassCard
        title="Camera"
        right={
          <div className="flex items-center gap-3 overflow-visible">
            <PillButton onClick={refreshDevices}>Refresh</PillButton>
            <div className="w-[340px] overflow-visible">
              <Select
                value={deviceSelected}
                onChange={(v) => setDeviceSelected(v as any)}
                options={cameraOptions}
                placeholder="เลือกกล้อง"
                isClearable
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={selectStyles}
                theme={selectTheme}
              />
            </div>
            <div className="hidden xl:flex">
              <PillButton onClick={() => setCamAdjustOpen(true)}>Adjust</PillButton>
            </div>
          </div>
        }
        className="col-span-12 lg:col-span-6 min-h-0"
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="relative rounded-3xl border border-white/10 bg-black/40 overflow-hidden flex-1 min-h-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
              style={{ transform: previewCropTransform, transformOrigin: "top left" }}
            />
            {videoCountdown !== null && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-[120px] font-semibold text-white/90 pointer-events-none">
                {videoCountdown}
              </div>
            )}
          </div>

          <div className="mt-3 xl:hidden">
            <PillButton onClick={() => setCamAdjustOpen(true)}>Adjust</PillButton>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <PillButton onClick={openCamera}>เปิดกล้อง</PillButton>
              <PillButton onClick={stopStream} tone="danger">
                ปิดกล้อง
              </PillButton>
            </div>

            <div className="flex gap-2">
              <PillButton onClick={savePhoto} disabled={!streamRef.current || !canSave || videoCountdown !== null}>
                ถ่ายรูป (PNG)
              </PillButton>

              {!isRecording ? (
                <PillButton onClick={startVideo} disabled={!streamRef.current || !canSave || videoCountdown !== null}>
                  อัดวิดีโอ
                </PillButton>
              ) : (
                <PillButton onClick={stopVideo} tone="danger">
                  หยุดอัด
                </PillButton>
              )}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-white/45">
            ต้องเลือก Date/HN/AN ก่อนบันทึก และจะบันทึกลง <span className="text-white/70">original</span> เท่านั้น
          </div>
        </div>
      </GlassCard>

      {/* Preview */}
      <GlassCard title="Preview" right={<div className="text-xs text-white/45">Auto after capture</div>} className="col-span-12 lg:col-span-6 min-h-0">
        <div className="h-full min-h-0 flex flex-col">
          <div className="text-sm text-white/80 mb-2 truncate">{preview?.name || "ยังไม่มีพรีวิว (ถ่ายรูป/อัดวิดีโอแล้วจะขึ้นอัตโนมัติ)"}</div>

          <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden flex-1 min-h-0 flex items-center justify-center">
            {!preview || !previewUrl ? (
              <div className="text-sm text-white/45">No Preview</div>
            ) : isImageType(preview.type, preview.name) ? (
              <img src={previewUrl} alt={preview.name} className="max-h-full max-w-full object-contain" />
            ) : isVideoType(preview.type, preview.name) ? (
              <video src={previewUrl} controls className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-sm text-white/45">ไม่รองรับ preview</div>
            )}
          </div>

          {preview && (
            <div className="mt-3 flex gap-2">
              <PillButton onClick={() => downloadFile(preview)}>Download</PillButton>
              <PillButton tone="danger" onClick={() => deleteFile(preview)} disabled={!originalDir}>
                Delete
              </PillButton>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );

  const renderFilesPanelSection = () => (
    <div ref={filesPanelRef} className={`h-full ${filesOpen ? "w-[420px]" : "w-[56px]"} transition-all duration-200`}>
      <GlassCard
        title={filesOpen ? "Files" : undefined}
        right={
          filesOpen ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/50">{files.length} items</div>
              <IconButton onClick={() => setFilesOpen((v) => !v)} title="พับ">
                ◀
              </IconButton>
            </div>
          ) : undefined
        }
        className="h-full overflow-hidden"
      >
        {!filesOpen ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-white/30">
            <IconButton onClick={() => setFilesOpen(true)} title="ขยาย">
              ▶
            </IconButton>
            <div className="text-sm">Files</div>
          </div>
        ) : (
          <div className="h-full min-h-0 flex flex-col">
            <div className="text-xs text-white/55 mb-3 space-y-1">
              <div className="truncate">Path:</div>
              <div className="truncate break-all">
                <button onClick={onClickPath} className="underline text-teal-200/80 hover:text-teal-100">
                  {currentPathText}
                </button>
              </div>
            </div>

            <div
              ref={filesListRef}
              onScroll={() => {
                previewScrollTopRef.current = filesListRef.current?.scrollTop ?? 0;
              }}
              className="flex-1 min-h-0 max-h-[calc(100vh-200px)] overflow-auto space-y-3 pr-1"
            >
              {files.length === 0 && <div className="text-sm text-white/50">ยังไม่มีไฟล์ในโฟลเดอร์นี้</div>}

              {files.map((it) => (
                <div
                  key={it.name}
                  className={`rounded-2xl border p-3 flex gap-3 items-start cursor-pointer ${preview?.name === it.name ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 bg-white/[0.04]"
                    }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setPreviewKeepScroll(it)}
                  title="คลิกเพื่อ Preview"
                >
                  <Thumb file={it} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-sm text-teal-100/90 truncate hover:underline"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setPreviewKeepScroll(it)}
                      title="คลิกเพื่อ Preview"
                    >
                      {it.name}
                    </button>
                    <div className="text-[11px] text-white/50 flex items-center justify-between gap-2">
                      <span className="truncate min-w-0">{it.type || "unknown"}</span>
                      <span>{humanSize(it.size)}</span>
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <PillButton onClick={() => downloadFile(it)}>Download</PillButton>
                      <PillButton tone="danger" onClick={() => deleteFile(it)} disabled={!originalDir}>
                        Delete
                      </PillButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );

  // Render guard (must be AFTER all hooks)
  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white" aria-busy="true">
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950">
          <div className="flex items-center gap-3" role="status" aria-live="polite">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-[0.2em] text-white/70">Loading</span>
          </div>
        </div>
      </main>
    );
  }

  return (
<>
      <main className="min-h-screen w-screen overflow-x-hidden bg-slate-950 text-white">
        {/* background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="absolute top-1/4 -right-40 h-[620px] w-[620px] rounded-full bg-indigo-500/18 blur-[140px]" />
          <div className="absolute bottom-[-180px] left-1/4 h-[700px] w-[700px] rounded-full bg-fuchsia-500/14 blur-[160px]" />
        </div>

      <div className="relative h-full w-full p-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] px-5 py-4 w-full">
            {showCaseDetails ? (
              <GlassCard
                title="รายละเอียดเคส"
                right={
                  <div className="flex items-center gap-2">
                    <PillButton onClick={() => setCaseDetailCollapsed((prev) => !prev)}>
                      {caseDetailCollapsed ? "ขยาย" : "ย่อ"}
                    </PillButton>
                    <PillButton onClick={openPicker} disabled={!caseFolderReady}>
                      เลือก/จัดการรูป
                    </PillButton>
                    <PillButton onClick={refreshFiles} disabled={!originalDir}>
                      Refresh Files
                    </PillButton>
                  </div>
                }
              >
                {caseOptionLoading && (
                  <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/50">กำลังโหลดชื่อ...</div>
                )}
                {caseOptionError && <div className="mb-2 text-[10px] text-rose-300">{caseOptionError}</div>}

                {caseDetailCollapsed ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-7">
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">HN</div>
                        <div className="text-[11px] text-white/90">{caseDetailView.hn}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">AN</div>
                        <div className="text-[11px] text-white/90">{caseDetailView.an}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">Case Date</div>
                        <div className="text-[11px] text-white/90">{caseDetailView.caseDate}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">Time</div>
                        <div className="text-[11px] text-white/90">
                          {caseDetailView.timeFrom} - {caseDetailView.timeTo}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">Room</div>
                        <div className="text-[11px] text-white/90">{caseDetailView.procedureRoom}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">Procedure</div>
                        <div className="text-[11px] text-white/90">{caseDetailView.procedure}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">Physician</div>
                        <div className="text-[11px] text-white/90">{caseDetailView.physician}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Case ID</div>
                      <div className="text-sm text-white/90">{caseDetailView.caseId}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">HN</div>
                      <div className="text-sm text-white/90">{caseDetailView.hn}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">AN</div>
                      <div className="text-sm text-white/90">{caseDetailView.an}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Case No</div>
                      <div className="text-sm text-white/90">{caseDetailView.caseNo}</div>
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Case Date</div>
                      <div className="text-sm text-white/90">{caseDetailView.caseDate}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Time From</div>
                      <div className="text-sm text-white/90">{caseDetailView.timeFrom}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Time To</div>
                      <div className="text-sm text-white/90">{caseDetailView.timeTo}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Register Date</div>
                      <div className="text-sm text-white/90">{caseDetailView.registerDate}</div>
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Register Time</div>
                      <div className="text-sm text-white/90">{caseDetailView.registerTime}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Appointment Date</div>
                      <div className="text-sm text-white/90">{caseDetailView.appointmentDate}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Appointment Time</div>
                      <div className="text-sm text-white/90">{caseDetailView.appointmentTime}</div>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Room</div>
                      <div className="text-sm text-white/90">{caseDetailView.procedureRoom}</div>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Procedure</div>
                      <div className="text-sm text-white/90">{caseDetailView.procedure}</div>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Physician</div>
                      <div className="text-sm text-white/90">{caseDetailView.physician}</div>
                    </div>
                    <div className="col-span-12">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">Note</div>
                      <div className="text-sm text-white/90">{caseDetailView.note}</div>
                    </div>
                  </div>
                )}

                {/* <div
                  className={`border border-white/10 bg-white/[0.04] ${caseDetailCollapsed ? "mt-3 rounded-xl px-3 py-2" : "mt-4 rounded-2xl px-4 py-3"
                    }`}
                >
                  <div className={`${caseDetailCollapsed ? "text-[9px]" : "text-[11px]"} uppercase tracking-[0.2em] text-white/50`}>
                    Folder
                  </div>
                  <div className={`mt-1 break-all ${caseDetailCollapsed ? "text-[11px] text-white/75" : "text-sm text-white/80"}`}>
                    {builderPathHint}
                  </div>
                  {!caseFolderReady && (
                    <div className={`mt-2 text-amber-200/80 ${caseDetailCollapsed ? "text-[9px]" : "text-[11px]"}`}>
                      ยังไม่พร้อมใช้งาน เลือก Root ก่อน
                    </div>
                  )}
                </div> */}
              </GlassCard>
            ) : (
              <GlassCard
                title="Folder Builder"
                right={
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-white/55">Save bucket: <span className="text-white/85">original</span></div>
                    <PillButton onClick={() => setBuilderOpen((v) => !v)}>
                      {builderOpen ? "พับ" : "ขยาย"}
                    </PillButton>
                  </div>
                }
                className="overflow-visible"
              >
                {builderOpen && (
                  <div className="grid grid-cols-12 gap-4 overflow-visible">
                    {/* Date */}
                    <div className="col-span-12 lg:col-span-5 overflow-visible">
                      <div className="text-xs text-white/60 mb-2">Date (พ.ศ.)</div>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                          <div className="text-[11px] text-white/50">เลือกวันที่</div>
                          <div className="mt-1 flex items-center justify-center gap-2">
                            <div className="text-sm text-white/90 w-full">{beDateLabel}</div>
                            <DatePicker
                              selected={pickedDate}
                              onChange={(d) => setPickedDate(d)}
                              customInput={<PillButton className="h-9 px-3">Pick</PillButton>}
                              popperPlacement="bottom-end"
                              portalId="react-datepicker-portal"
                              dateFormat="yyyy-MM-dd"
                            />
                          </div>
                          <div className="text-[11px] text-white/45 mt-1">{pickedDate ? `${pickedDate.toISOString().slice(0, 10)} → folder: ${dateKey}` : "ยังไม่เลือก"}</div>
                        </div>

                        <PillButton onClick={createOrSelectDate} disabled={!vcDir || !pickedDate} className="h-full">
                          ใช้
                        </PillButton>
                      </div>

                      <div className="mt-3 overflow-visible">
                        <Select
                          value={dateSelected}
                          onChange={(v) => selectDateFolder(v as any)}
                          options={dateOptions.map((o) => {
                            // if selected date exists, show proper label
                            if (pickedDate && o.value === dateKey) return { value: o.value, label: `${o.value} — ${formatThaiBEDisplay(pickedDate)}` };
                            return o;
                          })}
                          placeholder="ค้นหา/เลือก Date folder"
                          isClearable
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          styles={selectStyles}
                          theme={selectTheme}
                        />
                        <div className="text-[11px] text-white/45 mt-2">
                          Example: <span className="text-white/70">VideoCapture/{dateSelected?.value || "ddMMyy"}</span>
                        </div>
                      </div>
                    </div>

                    {/* HN */}
                    <div className="col-span-12 lg:col-span-3 overflow-visible">
                      <div className="text-xs text-white/60 mb-2">HN</div>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          value={hnInput}
                          onChange={(e) => setHnInput(e.target.value)}
                          placeholder="เช่น 112222"
                          className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white/90 outline-none"
                        />
                        <PillButton onClick={createHN} disabled={!dateDir}>
                          Create
                        </PillButton>
                      </div>

                      <div className="mt-3 overflow-visible">
                        <Select
                          value={hnSelected}
                          onChange={(v) => selectHNFolder(v as any)}
                          options={hnOptions}
                          placeholder="ค้นหา/เลือก HN"
                          isClearable
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          styles={selectStyles}
                          theme={selectTheme}
                        />
                      </div>
                    </div>

                    {/* AN (bucket fixed original) */}
                    <div className="col-span-12 lg:col-span-4 overflow-visible">
                      <div className="text-xs text-white/60 mb-2">AN (Save: original)</div>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          value={anInput}
                          onChange={(e) => setAnInput(e.target.value)}
                          placeholder="เช่น 112222"
                          className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white/90 outline-none"
                        />
                        <PillButton onClick={createAN} disabled={!hnDir}>
                          Create
                        </PillButton>
                      </div>

                      <div className="mt-3 overflow-visible grid grid-cols-[1fr_auto] gap-2">
                        <div className="overflow-visible">
                          <Select
                            value={anSelected}
                            onChange={(v) => selectANFolder(v as any)}
                            options={anOptions}
                            placeholder="ค้นหา/เลือก AN"
                            isClearable
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={selectStyles}
                            theme={selectTheme}
                          />
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 flex items-center text-sm text-white/80">
                          original
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] text-white/50">
                        Current path:{" "}
                        <button onClick={onClickPath} className="underline text-teal-200/70 hover:text-teal-100 break-all">
                          {builderPathHint}
                        </button>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <PillButton onClick={openPicker} disabled={!originalDir || !chooseDir}>
                          รีพอร์ท/เลือกจัดการรูป
                        </PillButton>
                        <PillButton onClick={refreshFiles} disabled={!originalDir}>
                          Refresh Files
                        </PillButton>
                      </div>
                    </div>
                  </div>
                )}

                {!builderOpen && (
                  <div className="text-sm text-white/60 flex items-center justify-between gap-3">
                    <div className="truncate">
                      {builderPathHint}{" "}
                      <button onClick={onClickPath} className="underline text-teal-200/70 hover:text-teal-100">
                        (คลิกเพื่อคัดลอก/รีเฟรช)
                      </button>
                    </div>
                    <div className="text-xs text-white/45">Builder ถูกพับเพื่อเน้น Camera/Preview</div>
                  </div>
                )}
              </GlassCard>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 rounded-2xl border border-white/10 bg-emerald-500/10 text-sm text-white/80">
              Root: <span className="text-white/90">{root ? rootLabel : "—"}</span>
            </div>
            <PillButton onClick={connectRoot} tone="primary">
              Select Root
            </PillButton>
            <PillButton onClick={disconnectRoot} tone="danger" disabled={!root}>
              Disconnect
            </PillButton>
          </div>
        </div>

        {/* Layout: main + files panel (collapsible) */}
        <div className="h-[calc(100%-88px)] grid grid-cols-[1fr_auto] gap-4 min-w-0">
          {/* MAIN */}
          <div className="min-w-0 h-full grid grid-rows-[auto_1fr] gap-4">


            {renderCameraPreviewSection()}
          </div>

          {renderFilesPanelSection()}
        </div>
      </div>

      {/* Modals */}
      <ImagePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        originalDir={originalDir}
        chooseDir={chooseDir}
        onRefreshAfter={refreshFiles}
        onEditChosen={(f) => {
          setEditorFile(f);
          setEditorOpen(true);
        }}
        onExportReport={exportReport}
        refreshSignal={pickerRefreshTick}
      />

      <CameraAdjustModal open={camAdjustOpen} onClose={() => setCamAdjustOpen(false)}>
        <CameraAdjustControls />
      </CameraAdjustModal>

      <ImageEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        file={editorFile}
        chooseDir={chooseDir}
        onSaved={async () => {
          setPickerRefreshTick((v) => v + 1);
        }}
      />
    </main>

      <Suspense fallback={null}>
        <ReportClient />
      </Suspense>
      </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}
