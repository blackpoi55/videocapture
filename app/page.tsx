"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select, { components, SingleValue } from "react-select";
import Swal from "sweetalert2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/** ---------------------------
 *  Small IndexedDB helper (store FileSystem handles)
 *  --------------------------*/
const IDB_DB = "vcapture_db_v1";
const IDB_STORE = "kv";

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
    tone === "primary"
      ? "bg-emerald-500/15 hover:bg-emerald-500/20 border-emerald-400/20"
      : tone === "danger"
        ? "bg-rose-500/15 hover:bg-rose-500/20 border-rose-400/20"
        : "bg-white/[0.06] hover:bg-white/[0.10] border-white/10";
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
      className={`h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] text-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed ${props.className || ""
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
  refreshSignal?: number;
}) {
  const { open, onClose, originalDir, chooseDir, onRefreshAfter, onEditChosen, refreshSignal } = props;
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

  const [tool, setTool] = useState<"select" | "text" | "arrow" | "rect" | "circle" | "crop">("select");
  const [stroke, setStroke] = useState("#3b82f6");
  const [fill, setFill] = useState("rgba(0,0,0,0)");
  const [fontSize, setFontSize] = useState(40);
  const [strokeW, setStrokeW] = useState(6);
  const [busy, setBusy] = useState(false);
  const toolRef = useRef(tool);
  const strokeRef = useRef(stroke);
  const fillRef = useRef(fill);
  const fontSizeRef = useRef(fontSize);
  const strokeWRef = useRef(strokeW);

  const applyStyleToActive = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a || a === bgImgRef.current) return;

    const common = {
      stroke: strokeRef.current,
      strokeWidth: strokeWRef.current,
      fill: fillRef.current,
    };

    if (a.type === "i-text" || a.type === "textbox") {
      a.set({
        fill: strokeRef.current,
        fontSize: fontSizeRef.current,
      });
    } else if (a.type === "rect" || a.type === "circle" || a.type === "triangle" || a.type === "path") {
      a.set(common);
    } else if (a.type === "line") {
      a.set({
        stroke: strokeRef.current,
        strokeWidth: strokeWRef.current,
      });
    }
    c.requestRenderAll();
  }, []);

  const pushState = useCallback(() => {}, []);

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

      // tool drawing (single-click to drop; crop uses drag)
      const getPointer = (opt: any) => c.getPointer(opt.e);
      let isCropping = false;
      let cropTemp: any = null;
      let cropStartX = 0;
      let cropStartY = 0;

      const addShapeAtPoint = (p: { x: number; y: number }) => {
        const currentTool = toolRef.current;
        if (currentTool === "select") return;
        if (currentTool === "crop") return; // crop handled via drag

        const commonSelectable = { selectable: true, evented: true };
        let obj: any = null;

        if (currentTool === "text") {
          obj = new IText("พิมพ์ข้อความ", {
            left: p.x,
            top: p.y,
            fontSize: fontSizeRef.current,
            fill: strokeRef.current,
            ...commonSelectable,
          });
        } else if (currentTool === "arrow") {
          const path = `M 0 0 L 36 0 L 18 36 Z`;
          obj = new Path(path, {
            left: p.x - 18,
            top: p.y - 12,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            fill: strokeRef.current,
            ...commonSelectable,
            originX: "left",
            originY: "top",
          });
        } else if (currentTool === "rect") {
          obj = new Rect({
            left: p.x - 80,
            top: p.y - 50,
            width: 160,
            height: 100,
            fill: fillRef.current,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            ...commonSelectable,
          });
        } else if (currentTool === "circle") {
          obj = new Circle({
            left: p.x - 60,
            top: p.y - 60,
            radius: 60,
            fill: fillRef.current,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            ...commonSelectable,
          });
        } else if (currentTool === "crop") {
          obj = new Rect({
            left: p.x - 90,
            top: p.y - 60,
            width: 180,
            height: 120,
            fill: "rgba(255,255,255,0.08)",
            stroke: "rgba(255,255,255,0.85)",
            strokeWidth: 2,
            strokeDashArray: [8, 6],
            ...commonSelectable,
          });
        }

        if (!obj) return;
        c.add(obj);
        c.setActiveObject(obj);
        c.requestRenderAll();
        pushState();
        if (toolRef.current !== "select") {
          toolRef.current = "select";
          setTool("select");
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

        addShapeAtPoint(p);
      };

      const onMouseMove = (opt: any) => {
        if (!isCropping || !cropTemp) return;
        const p = getPointer(opt);
        const w = p.x - cropStartX;
        const h = p.y - cropStartY;
        cropTemp.set({
          left: Math.min(cropStartX, p.x),
          top: Math.min(cropStartY, p.y),
          width: Math.abs(w),
          height: Math.abs(h),
        });
        c.requestRenderAll();
      };

      const onMouseUp = () => {
        if (!isCropping) return;
        isCropping = false;
        if (!cropTemp) return;
        cropTemp.set({ selectable: true, evented: true });
        c.setActiveObject(cropTemp);
        pushState();
        cropTemp = null;
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
    const a = c.getActiveObject();
    if (!a) return;
    // avoid deleting bg
    if (a === bgImgRef.current) return;
    c.remove(a);
    c.discardActiveObject();
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && toolRef.current === "select") {
        e.preventDefault();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        doDeleteActive();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, doDeleteActive]);

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
      c.requestRenderAll();

      alertOk("Crop เรียบร้อย");
    } catch (e: any) {
      alertErr("Crop ไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [pushState]);

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
export default function Page() {
  const [mounted, setMounted] = useState(false);

  // Root handle + remember
  const [root, setRoot] = useState<DirHandle | null>(null);
  const [rootLabel, setRootLabel] = useState<string>("(not connected)");

  // Structure handles
  const [vcDir, setVcDir] = useState<DirHandle | null>(null);
  const [dateDir, setDateDir] = useState<DirHandle | null>(null);
  const [hnDir, setHnDir] = useState<DirHandle | null>(null);
  const [vnDir, setVnDir] = useState<DirHandle | null>(null);
  const [originalDir, setOriginalDir] = useState<DirHandle | null>(null);
  const [chooseDir, setChooseDir] = useState<DirHandle | null>(null);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);

  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const dateKey = useMemo(() => (pickedDate ? makeDateKey(pickedDate) : ""), [pickedDate]);

  const [hnInput, setHnInput] = useState("");
  const [vnInput, setVnInput] = useState("");

  // Dropdown options
  const [dateOptions, setDateOptions] = useState<Opt[]>([]);
  const [hnOptions, setHnOptions] = useState<Opt[]>([]);
  const [vnOptions, setVnOptions] = useState<Opt[]>([]);

  const [dateSelected, setDateSelected] = useState<Opt | null>(null);
  const [hnSelected, setHnSelected] = useState<Opt | null>(null);
  const [vnSelected, setVnSelected] = useState<Opt | null>(null);

  // Files + preview
  const [files, setFiles] = useState<FileItem[]>([]);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pickerRefreshTick, setPickerRefreshTick] = useState(0);

  // Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceSelected, setDeviceSelected] = useState<Opt | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Recording
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [camBrightness, setCamBrightness] = useState(100);
  const [camContrast, setCamContrast] = useState(100);
  const [camSaturation, setCamSaturation] = useState(100);
  const [camSharpness, setCamSharpness] = useState(50);
  const camFilterRef = useRef("brightness(100%) contrast(100%) saturate(100%)");
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
      ctx.drawImage(vid, 0, 0, w, h);
      ctx.filter = "none";

      renderLoopRef.current = requestAnimationFrame(draw);
    };

    stopRenderLoop();
    renderLoopRef.current = requestAnimationFrame(draw);
  }, [stopRenderLoop]);

  const CameraAdjustControls = () => (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] text-white/70 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between mb-1">
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
        ].map((it) => (
          <div key={it.label} className="grid grid-cols-[76px_1fr_40px] items-center gap-2">
            <span className="text-white/65">{it.label}</span>
            <input
              type="range"
              min={it.min}
              max={it.max}
              value={it.value}
              onChange={(e) => it.onChange(Number(e.target.value))}
              className="w-full accent-emerald-400"
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
    setVnDir(null);
    setOriginalDir(null);
    setChooseDir(null);
    setFiles([]);
    setPreview(null);
    setPreviewUrl(null);
    setDateOptions([]);
    setHnOptions([]);
    setVnOptions([]);
    setDateSelected(null);
    setHnSelected(null);
    setVnSelected(null);
    setHnInput("");
    setVnInput("");
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

        // request permission
        const perm = await (saved as any).queryPermission?.({ mode: "readwrite" });
        if (perm !== "granted") {
          const req = await (saved as any).requestPermission?.({ mode: "readwrite" });
          if (req !== "granted") return;
        }
        setRoot(saved);
        setRootLabel(saved.name || "Root");
        alertOk("เชื่อมต่อ Root เดิมแล้ว");
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

  const loadVNOptions = useCallback(async (h: DirHandle | null) => {
    if (!h) {
      setVnOptions([]);
      return;
    }
    const names = await listDirs(h);
    const opts = names.map((x) => ({ value: x, label: x }));
    setVnOptions(opts);
  }, []);

  const selectDateFolder = useCallback(
    async (opt: Opt | null) => {
      setDateSelected(opt);
      setHnSelected(null);
      setVnSelected(null);
      setDateDir(null);
      setHnDir(null);
      setVnDir(null);
      setOriginalDir(null);
    setChooseDir(null);
    setFiles([]);
    setPreview(null);
    setPreviewUrl(null);

      if (!opt || !vcDir) return;
      try {
        const d = await vcDir.getDirectoryHandle(opt.value);
        setDateDir(d);
        await loadHNOptions(d);
      } catch (e: any) {
        alertErr("เปิด Date Folder ไม่สำเร็จ", e?.message || String(e));
      }
    },
    [vcDir, loadHNOptions]
  );

  const createHN = useCallback(async () => {
    if (!dateDir) return alertErr("ยังไม่มี Date Folder");
    const hn = hnInput.trim();
    if (!hn) return alertErr("กรอก HN ก่อน");
    try {
      const h = await ensureDir(dateDir, `HN${hn}`);
      setHnDir(h);
      setHnSelected({ value: `HN${hn}`, label: `HN${hn}` });
      await loadHNOptions(dateDir);
      await loadVNOptions(h);
      alertOk("สร้าง/เลือก HN แล้ว", `HN${hn}`);
    } catch (e: any) {
      alertErr("สร้าง HN ไม่สำเร็จ", e?.message || String(e));
    }
  }, [dateDir, hnInput, loadHNOptions, loadVNOptions]);

  const selectHNFolder = useCallback(
    async (opt: Opt | null) => {
    setHnSelected(opt);
    setVnSelected(null);
    setHnDir(null);
    setVnDir(null);
    setOriginalDir(null);
    setChooseDir(null);
    setFiles([]);
    setPreview(null);
    setPreviewUrl(null);

      if (!opt || !dateDir) return;
      try {
        const h = await dateDir.getDirectoryHandle(opt.value);
        setHnDir(h);
        await loadVNOptions(h);
      } catch (e: any) {
        alertErr("เปิด HN Folder ไม่สำเร็จ", e?.message || String(e));
      }
    },
    [dateDir, loadVNOptions]
  );

  const createVN = useCallback(async () => {
    if (!hnDir) return alertErr("ยังไม่มี HN Folder");
    const vn = vnInput.trim();
    if (!vn) return alertErr("กรอก VN ก่อน");
    try {
      const v = await ensureDir(hnDir, `VN${vn}`);
      setVnDir(v);

      // FIX bucket = original
      const orig = await ensureDir(v, "original");
      const ch = await ensureDir(v, "choose");
      setOriginalDir(orig);
      setChooseDir(ch);

      setVnSelected({ value: `VN${vn}`, label: `VN${vn}` });
      await loadVNOptions(hnDir);
      alertOk("สร้าง/เลือก VN แล้ว", `VN${vn}`);

      // refresh file list
      const fl = await listFiles(orig);
      setFiles(fl);
      setPreview((p) => (fl[0] ? fl[0] : p));
    } catch (e: any) {
      alertErr("สร้าง VN ไม่สำเร็จ", e?.message || String(e));
    }
  }, [hnDir, vnInput, loadVNOptions]);

  const selectVNFolder = useCallback(
    async (opt: Opt | null) => {
      setVnSelected(opt);
      setVnDir(null);
      setOriginalDir(null);
      setChooseDir(null);
      setFiles([]);
      setPreview(null);

      if (!opt || !hnDir) return;
      try {
        const v = await hnDir.getDirectoryHandle(opt.value);
        setVnDir(v);

        const orig = await ensureDir(v, "original");
        const ch = await ensureDir(v, "choose");
        setOriginalDir(orig);
        setChooseDir(ch);

        const fl = await listFiles(orig);
        setFiles(fl);
        setPreview((p) => (fl[0] ? fl[0] : p));
      } catch (e: any) {
        alertErr("เปิด VN ไม่สำเร็จ", e?.message || String(e));
      }
    },
    [hnDir]
  );

  const refreshFiles = useCallback(async () => {
    if (!originalDir) return;
    const fl = await listFiles(originalDir);
    setFiles(fl);
  }, [originalDir]);

  /** ----- current path click: copy + refresh + scroll ----- */
  const filesPanelRef = useRef<HTMLDivElement | null>(null);

  const currentPathText = useMemo(() => {
    const parts: string[] = [];
    if (dateSelected?.value) parts.push(dateSelected.value);
    if (hnSelected?.value) parts.push(hnSelected.value);
    if (vnSelected?.value) parts.push(vnSelected.value);
    // FIX bucket
    return `VideoCapture/${parts.join(" / ")}/original`;
  }, [dateSelected, hnSelected, vnSelected]);

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
      alertOk("เปิดกล้องแล้ว");
    } catch (e: any) {
      alertErr("เปิดกล้องไม่สำเร็จ", e?.message || String(e));
    }
  }, [deviceSelected, stopStream, applyCameraAdjust, camBrightness, camSharpness]);

  /** ----- Save helpers (original only) ----- */
  const canSave = !!originalDir && !!dateSelected && !!hnSelected && !!vnSelected;

  const savePhoto = useCallback(async () => {
    if (!originalDir) return alertErr("ยังไม่มีโฟลเดอร์ original");
    if (!canSave) return alertErr("ต้องเลือก Date/HN/VN ก่อนบันทึก");
    if (!videoRef.current) return;

    try {
      const v = videoRef.current;
      const c = document.createElement("canvas");
      c.width = v.videoWidth || 1280;
      c.height = v.videoHeight || 720;
      const ctx = c.getContext("2d")!;
      ctx.filter = camFilterRef.current;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      ctx.filter = "none";

      const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/png"));

      const name = `photo_${Date.now()}.png`;
      const fh = await originalDir.getFileHandle(name, { create: true });
      await writeFile(fh, blob);

      await refreshFiles();
      const fl = await listFiles(originalDir);
      const just = fl.find((x) => x.name === name) || fl[0] || null;
      setPreview(just);
      alertOk("ถ่ายรูปสำเร็จ", name);
    } catch (e: any) {
      alertErr("ถ่ายรูปไม่สำเร็จ", e?.message || String(e));
    }
  }, [originalDir, canSave, refreshFiles]);

  const startVideo = useCallback(async () => {
    if (!originalDir) return alertErr("ยังไม่มีโฟลเดอร์ original");
    if (!canSave) return alertErr("ต้องเลือก Date/HN/VN ก่อนบันทึก");
    const s = streamRef.current;
    if (!s) return alertErr("ยังไม่ได้เปิดกล้อง");

    try {
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
          setPreview(just);
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
      await applyCameraAdjust(camBrightness, camSharpness);
    } catch (e: any) {
      alertErr("เริ่มอัดวิดีโอไม่สำเร็จ", e?.message || String(e));
    }
  }, [originalDir, canSave, refreshFiles, applyCameraAdjust, camBrightness, camSharpness, startRenderLoop, stopRenderLoop]);

  const stopVideo = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch { }
  }, []);

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
    if (!originalDir || !chooseDir) return alertErr("ยังไม่มี original/choose", "เลือก Date/HN/VN ก่อน");
    setPickerOpen(true);
  }, [originalDir, chooseDir]);

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
    const v = vnSelected?.value ? `${h}/${vnSelected.value}` : `${h}/(ยังไม่มี VN)`;
    return `${v}/original`;
  }, [dateSelected, hnSelected, vnSelected]);

  const TopBar = () => (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] px-5 py-4">
        <div className="text-lg font-semibold">Local Video / Photo Capture</div>
        <div className="text-xs text-white/55">Capture → Save to local folder → Preview + Manage</div>
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
  );

  const FolderBuilderSection = () => (
    <GlassCard
      title="Folder Builder"
      right={
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/55">
            Save bucket: <span className="text-white/85">original</span>
          </div>
          <PillButton onClick={() => setBuilderOpen((v) => !v)}>{builderOpen ? "พับ" : "ขยาย"}</PillButton>
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
                    dateFormat="yyyy-MM-dd"
                    portalId="react-datepicker-portal"
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

          {/* VN (bucket fixed original) */}
          <div className="col-span-12 lg:col-span-4 overflow-visible">
            <div className="text-xs text-white/60 mb-2">VN (Save: original)</div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={vnInput}
                onChange={(e) => setVnInput(e.target.value)}
                placeholder="เช่น 112222"
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white/90 outline-none"
              />
              <PillButton onClick={createVN} disabled={!hnDir}>
                Create
              </PillButton>
            </div>

            <div className="mt-3 overflow-visible grid grid-cols-[1fr_auto] gap-2">
              <div className="overflow-visible">
                <Select
                  value={vnSelected}
                  onChange={(v) => selectVNFolder(v as any)}
                  options={vnOptions}
                  placeholder="ค้นหา/เลือก VN"
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

            <div className="mt-2 text-[11px] text-white/50 break-words">
              Current path:{" "}
              <button onClick={onClickPath} className="underline text-white/75 hover:text-white break-words">
                {builderPathHint}
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <PillButton onClick={openPicker} disabled={!originalDir || !chooseDir}>
                เลือก/จัดการรูป
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
          <div className="truncate break-words">
            {builderPathHint}{" "}
            <button onClick={onClickPath} className="underline text-white/70 hover:text-white break-words">
              (คลิกเพื่อคัดลอก/รีเฟรช)
            </button>
          </div>
          <div className="text-xs text-white/45">Builder ถูกพับเพื่อเน้น Camera/Preview</div>
        </div>
      )}
    </GlassCard>
  );

  const CameraPreviewSection = () => (
    <div className="grid grid-cols-12 gap-4 min-h-0">
      {/* Camera */}
      <GlassCard
        title="Camera"
        right={
          <div className="flex items-center gap-3 overflow-visible">
            <PillButton onClick={refreshDevices}>Refresh</PillButton>
            <div className="w-[280px] overflow-visible">
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
            <CameraAdjustControls />
          </div>
        }
        className="col-span-12 lg:col-span-6 min-h-0"
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden flex-1 min-h-0">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
          </div>

          <div className="mt-3">
            <CameraAdjustControls />
          </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <PillButton onClick={openCamera}>เปิดกล้อง</PillButton>
                  <PillButton onClick={stopStream} tone="danger">
                    ปิดกล้อง
                  </PillButton>
                </div>

                <div className="flex gap-2">
                  <PillButton onClick={savePhoto} disabled={!streamRef.current || !canSave}>
                    ถ่ายรูป (PNG)
                  </PillButton>

                  {!isRecording ? (
                    <PillButton onClick={startVideo} disabled={!streamRef.current || !canSave}>
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
                ต้องเลือก Date/HN/VN ก่อนบันทึก และจะบันทึกลง <span className="text-white/70">original</span> เท่านั้น
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

  const FilesPanelSection = () => (
    <div ref={filesPanelRef} className={`h-full ${filesOpen ? "w-[420px]" : "w-[56px]"} transition-all duration-200`}>
      <GlassCard
        title={filesOpen ? "Files" : undefined}
        right={
          <div className="flex items-center gap-2">
            {filesOpen && <div className="text-xs text-white/50">{files.length} items</div>}
            <IconButton onClick={() => setFilesOpen((v) => !v)} title={filesOpen ? "พับ" : "ขยาย"}>
              {filesOpen ? "◀" : "▶"}
            </IconButton>
          </div>
        }
        className="h-full"
      >
        {!filesOpen ? (
          <div className="h-full flex items-center justify-center text-white/30">Files</div>
        ) : (
          <div className="h-full min-h-0 flex flex-col">
            <div className="text-xs text-white/55 mb-3 space-y-1">
              <div className="truncate">Path:</div>
              <div className="truncate break-all">
                <button onClick={onClickPath} className="underline hover:text-white">
                  {currentPathText}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto space-y-3 pr-1">
              {files.length === 0 && <div className="text-sm text-white/50">ยังไม่มีไฟล์ในโฟลเดอร์นี้</div>}

              {files.map((it) => (
                <div
                  key={it.name}
                  className={`rounded-2xl border p-3 flex gap-3 items-start flex-wrap sm:flex-nowrap ${
                    preview?.name === it.name ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <Thumb file={it} />
                  <div className="min-w-0 flex-1">
                    <button className="text-sm text-white/90 truncate hover:underline" onClick={() => setPreview(it)} title="คลิกเพื่อ Preview">
                      {it.name}
                    </button>
                    <div className="text-[11px] text-white/50 flex items-center justify-between gap-2">
                      <span className="truncate min-w-0">{it.type || "unknown"}</span>
                      <span>{humanSize(it.size)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <PillButton onClick={() => downloadFile(it)}>Download</PillButton>
                    <PillButton tone="danger" onClick={() => deleteFile(it)} disabled={!originalDir}>
                      Delete
                    </PillButton>
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
    return <main className="min-h-screen bg-slate-950" />;
  }

  return (
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
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] px-5 py-4">
            <div className="font-semibold text-5xl">Intraview</div> 
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
            {/* Folder Builder (collapsible, smaller than camera/preview) */}
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

                  {/* VN (bucket fixed original) */}
                  <div className="col-span-12 lg:col-span-4 overflow-visible">
                    <div className="text-xs text-white/60 mb-2">VN (Save: original)</div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        value={vnInput}
                        onChange={(e) => setVnInput(e.target.value)}
                        placeholder="เช่น 112222"
                        className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white/90 outline-none"
                      />
                      <PillButton onClick={createVN} disabled={!hnDir}>
                        Create
                      </PillButton>
                    </div>

                    <div className="mt-3 overflow-visible grid grid-cols-[1fr_auto] gap-2">
                      <div className="overflow-visible">
                        <Select
                          value={vnSelected}
                          onChange={(v) => selectVNFolder(v as any)}
                          options={vnOptions}
                          placeholder="ค้นหา/เลือก VN"
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
                      <button onClick={onClickPath} className="underline text-white/75 hover:text-white break-all">
                        {builderPathHint}
                      </button>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <PillButton onClick={openPicker} disabled={!originalDir || !chooseDir}>
                        เลือก/จัดการรูป
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
                    <button onClick={onClickPath} className="underline text-white/70 hover:text-white">
                      (คลิกเพื่อคัดลอก/รีเฟรช)
                    </button>
                  </div>
                  <div className="text-xs text-white/45">Builder ถูกพับเพื่อเน้น Camera/Preview</div>
                </div>
              )}
            </GlassCard>

            {/* Camera + Preview (bigger) */}
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
                      <CameraAdjustControls />
                    </div>
                  </div>
                }
                className="col-span-12 lg:col-span-6 min-h-0"
              >
                <div className="flex flex-col h-full min-h-0">
                  <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden flex-1 min-h-0">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                  </div>

                  <div className="mt-3 xl:hidden">
                    <CameraAdjustControls />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <PillButton onClick={openCamera}>เปิดกล้อง</PillButton>
                      <PillButton onClick={stopStream} tone="danger">
                        ปิดกล้อง
                      </PillButton>
                    </div>

                    <div className="flex gap-2">
                      <PillButton onClick={savePhoto} disabled={!streamRef.current || !canSave}>
                        ถ่ายรูป (PNG)
                      </PillButton>

                      {!isRecording ? (
                        <PillButton onClick={startVideo} disabled={!streamRef.current || !canSave}>
                          อัดวิดีโอ
                        </PillButton>
                      ) : (
                        <PillButton onClick={stopVideo} tone="danger">
                          หยุดอัด
                        </PillButton>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-white/45">
                    ต้องเลือก Date/HN/VN ก่อนบันทึก และจะบันทึกลง <span className="text-white/70">original</span> เท่านั้น
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
          </div>

          {/* FILES PANEL (collapsible) */}
          <div ref={filesPanelRef} className={`h-full ${filesOpen ? "w-[420px]" : "w-[56px]"} transition-all duration-200`}>
            <GlassCard
              title={filesOpen ? "Files" : undefined}
              right={
                <div className="flex items-center gap-2">
                  {filesOpen && <div className="text-xs text-white/50">{files.length} items</div>}
                  <IconButton onClick={() => setFilesOpen((v) => !v)} title={filesOpen ? "พับ" : "ขยาย"}>
                    {filesOpen ? "◀" : "▶"}
                  </IconButton>
                </div>
              }
              className="h-full"
            >
              {!filesOpen ? (
                <div className="h-full flex items-center justify-center text-white/30">Files</div>
              ) : (
                <div className="h-full min-h-0 flex flex-col">
                  <div className="text-xs text-white/55 mb-3 space-y-1">
                    <div className="truncate">Path:</div>
                    <div className="truncate break-all">
                      <button onClick={onClickPath} className="underline hover:text-white">{currentPathText}</button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 max-h-[calc(100vh-220px)] overflow-auto space-y-3 pr-1">
                    {files.length === 0 && <div className="text-sm text-white/50">ยังไม่มีไฟล์ในโฟลเดอร์นี้</div>}

                    {files.map((it) => (
                      <div
                        key={it.name}
                        className={`rounded-2xl border p-3 flex gap-3 items-start flex-wrap sm:flex-nowrap cursor-pointer ${
                          preview?.name === it.name ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 bg-white/[0.04]"
                        }`}
                        onClick={() => setPreview(it)}
                        title="คลิกเพื่อ Preview"
                      >
                        <Thumb file={it} />
                        <div className="flex flex-col">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-white/90 truncate hover:underline">{it.name}</div>
                            <div className="text-[11px] text-white/50 flex items-center justify-between gap-2">
                              <span className="truncate min-w-0">{it.type || "unknown"}</span>
                              <span>{humanSize(it.size)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                            <PillButton onClick={(e) => { e.stopPropagation(); downloadFile(it); }}>Download</PillButton>
                            <PillButton tone="danger" onClick={(e) => { e.stopPropagation(); deleteFile(it); }} disabled={!originalDir}>
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
        refreshSignal={pickerRefreshTick}
      />

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
  );
}
