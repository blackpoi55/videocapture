"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { alertErr, alertOk, confirmSwal } from "./alerts";
import { deleteEntry, humanSize, isImageType, listFiles, writeFile } from "./file-utils";
import type { DirHandle, FileItem } from "./types";
import { PillButton } from "./ui";
import { Thumb } from "./Thumb";

export function ImagePickerModal(props: {
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
    refresh().catch(() => {});
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
                  className={`rounded-2xl border p-3 flex items-center gap-3 bg-white/[0.04] border-white/10 ${chosenNames.has(f.name) ? "ring-2 ring-emerald-400/40" : ""}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", f.name);
                  }}
                >
                  <Thumb file={f} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white/90 truncate flex items-center gap-2">
                      {f.name}
                      {chosenNames.has(f.name) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-emerald-200/90">
                          เลือกแล้ว
                        </span>
                      )}
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
                <div className="text-sm text-white/50 px-1">ลากรูปมาวางฝั่งนี้เพื่อคัดลอกไปโฟลเดอร์ choose</div>
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
