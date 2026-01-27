"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { alertErr, alertOk, confirmSwal } from "./alerts";
import Swal from "sweetalert2";
import { deleteEntry, humanSize, isImageType, listFiles, writeFile } from "./file-utils";
import type { DirHandle, FileItem } from "./types";
import { PillButton } from "./ui";
import { Thumb } from "./Thumb";
import { postreportimage, putreportimage, uploadMultiple } from "@/action/api";

type SelectedImage = {
  label?: string;
  name: string;
  description: string;
};

type TemplatePlacement = {
  x: number;
  y: number;
};

type InitialPicture = {
  picturelabel?: string | null;
  picturename?: string | null;
  picturepath?: string | null;
  description?: string | null;
  x_axis?: string | number | null;
  y_axis?: string | number | null;
};

const TEMPLATE_SRC = "/images/type/OPERATIVETEMPLATE1IMAGE.jpg";

const getLabelForIndex = (index: number) => (index >= 0 && index < 26 ? String.fromCharCode(65 + index) : "?");

export function ImagePickerModal(props: {
  open: boolean;
  onClose: () => void;
  originalDir: DirHandle | null;
  chooseDir: DirHandle | null;
  onRefreshAfter: () => Promise<void>;
  onEditChosen: (file: FileItem) => void;
  onExportReport: () => Promise<void>;
  refreshSignal?: number;
  templateSrc?: string | null;
  caseNumber?: string | null;
  initialPictures?: InitialPicture[] | null;
}) {
  const {
    open,
    onClose,
    originalDir,
    chooseDir,
    onRefreshAfter,
    onEditChosen,
    onExportReport,
    refreshSignal,
    templateSrc,
    caseNumber,
    initialPictures,
  } = props;
  const [left, setLeft] = useState<FileItem[]>([]);
  const [right, setRight] = useState<FileItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<SelectedImage[]>([]);
  const [activeLabel, setActiveLabel] = useState("");
  const [placements, setPlacements] = useState<Record<string, TemplatePlacement>>({});
  const [uploadMap, setUploadMap] = useState<Record<string, unknown>>({});
  const appliedPicturesRef = useRef<string | null>(null);

  const chosenNames = useMemo(() => new Set(right.map((x) => x.name)), [right]);
  const selectedNames = useMemo(() => new Set(selected.map((item) => item.name)), [selected]);
  const chooseMap = useMemo(() => new Map(right.map((item) => [item.name, item])), [right]);
  const stepLabels = useMemo(
    () => selected.map((item, index) => (item.label ? item.label : getLabelForIndex(index))),
    [selected]
  );
  const selectionPayload = useMemo(
    () =>
      selected.map((item, index) => ({
        label: item.label ? item.label : getLabelForIndex(index),
        name: item.name,
        description: item.description || "",
        upload: uploadMap[item.name] ?? null,
      })),
    [selected, uploadMap]
  );
  const placementPayload = useMemo(
    () =>
      Object.entries(placements).map(([label, pos]) => ({
        label,
        x: Number(pos.x.toFixed(2)),
        y: Number(pos.y.toFixed(2)),
      })),
    [placements]
  );
  const resolvedTemplateSrc = useMemo(() => {
    if (!templateSrc) return TEMPLATE_SRC;
    return templateSrc.replace(/\\/g, "/");
  }, [templateSrc]);

  const combinedPayload = useMemo(
    () => ({
      casenumber: caseNumber || "",
      images: selectionPayload,
      template: {
        src: resolvedTemplateSrc,
        placements: placementPayload,
      },
    }),
    [selectionPayload, placementPayload, resolvedTemplateSrc, caseNumber]
  );
  const hasExistingPictures = useMemo(() => (initialPictures?.length ?? 0) > 0, [initialPictures]);

  const refresh = useCallback(async () => {
    if (!originalDir || !chooseDir) return;
    const [a, b] = await Promise.all([listFiles(originalDir), listFiles(chooseDir)]);
    setLeft(a.filter((x) => isImageType(x.type, x.name)));
    setRight(b.filter((x) => isImageType(x.type, x.name)));
  }, [originalDir, chooseDir]);

  const uploadFileToApi = useCallback(async (file: File) => {
    if (uploadMap[file.name]) return;
    const data = new FormData();
    data.append("files", file, file.name);
    const response = await uploadMultiple(data);
    if ((response as { error?: unknown })?.error) {
      alertErr("อัปโหลดไม่สำเร็จ", (response as { message?: string })?.message || "unknown error");
      return;
    }
    const dataList = (response as { data?: Array<{ path?: string }> })?.data ?? [];
    const path = dataList[0]?.path || null;
    setUploadMap((prev) => ({ ...prev, [file.name]: path }));
  }, [uploadMap]);

  const saveReportImages = useCallback(async () => {
    try {
      setBusy(true);
      const response = hasExistingPictures
        ? await putreportimage(combinedPayload)
        : await postreportimage(combinedPayload);
      if ((response as { error?: unknown })?.error) {
        alertErr("บันทึกไม่สำเร็จ", (response as { message?: string })?.message || "unknown error");
        return;
      }
      Swal.fire({ icon: "success", title: "บันทึกสำเร็จ" });
    } catch (err: unknown) {
      alertErr("บันทึกไม่สำเร็จ", err instanceof Error ? err.message : "unknown error");
    } finally {
      setBusy(false);
    }
  }, [combinedPayload]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    refresh().catch(() => {});
  }, [open, refresh, refreshSignal]);

  useEffect(() => {
    if (!open) {
      appliedPicturesRef.current = null;
      return;
    }
    const caseKey = caseNumber || "no-case";
    if (appliedPicturesRef.current === caseKey) return;
    appliedPicturesRef.current = caseKey;
    if (!initialPictures || initialPictures.length === 0) {
      setSelected([]);
      setPlacements({});
      setUploadMap({});
      setActiveLabel("");
      return;
    }
    const normalized = initialPictures
      .map((item) => {
        const label = (item.picturelabel || "").toString().trim().toUpperCase();
        const name = item.picturename || item.picturepath || label || "Unknown";
        const description = item.description || "";
        const x = Number(item.x_axis);
        const y = Number(item.y_axis);
        return {
          label,
          name,
          description,
          path: item.picturepath || null,
          x: Number.isFinite(x) ? x : null,
          y: Number.isFinite(y) ? y : null,
        };
      })
      .sort((a, b) => {
        const aCode = a.label ? a.label.charCodeAt(0) : 999;
        const bCode = b.label ? b.label.charCodeAt(0) : 999;
        return aCode - bCode;
      });
    setSelected(normalized.map((item) => ({ label: item.label, name: item.name, description: item.description })));
    setUploadMap(
      normalized.reduce<Record<string, unknown>>((acc, item) => {
        if (item.path) acc[item.name] = item.path;
        return acc;
      }, {})
    );
    setPlacements(
      normalized.reduce<Record<string, TemplatePlacement>>((acc, item) => {
        if (item.label && item.x !== null && item.y !== null) {
          acc[item.label] = { x: item.x, y: item.y };
        }
        return acc;
      }, {})
    );
    setActiveLabel(normalized[0]?.label || "");
  }, [open, initialPictures, caseNumber]);

  useEffect(() => {
    setSelected((prev) => {
      if (initialPictures && initialPictures.length > 0) return prev;
      return prev.filter((item) => chooseMap.has(item.name));
    });
  }, [chooseMap, initialPictures]);

  useEffect(() => {
    if (!activeLabel) return;
    if (!stepLabels.includes(activeLabel)) {
      setActiveLabel(stepLabels[0] || "");
    }
  }, [activeLabel, stepLabels]);

  useEffect(() => {
    setPlacements((prev) => {
      const entries = Object.entries(prev).filter(([label]) => stepLabels.includes(label));
      if (entries.length === Object.keys(prev).length) return prev;
      return Object.fromEntries(entries) as Record<string, TemplatePlacement>;
    });
  }, [stepLabels]);

  useEffect(() => {
    if (step === 3 && selected.length === 0) {
      setStep(right.length > 0 ? 2 : 1);
      return;
    }
    if (step === 2 && right.length === 0) {
      setStep(1);
    }
  }, [step, right.length, selected.length]);

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
        setUploadMap((prev) => {
          if (!prev[name]) return prev;
          const next = { ...prev };
          delete next[name];
          return next;
        });
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

  const addToSelection = useCallback(
    (name: string) => {
      setSelected((prev) => {
        if (prev.some((item) => item.name === name)) return prev;
        return [...prev, { name, description: "" }];
      });
      const file = chooseMap.get(name);
      if (file) {
        void file.handle.getFile().then(uploadFileToApi).catch(() => {});
      }
    },
    [chooseMap, uploadFileToApi]
  );

  const removeFromSelection = useCallback((name: string) => {
    setSelected((prev) => prev.filter((item) => item.name !== name));
  }, []);

  const moveSelection = useCallback((name: string, direction: -1 | 1) => {
    setSelected((prev) => {
      const index = prev.findIndex((item) => item.name === name);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  }, []);

  const updateSelectiondescription = useCallback((name: string, description: string) => {
    setSelected((prev) => prev.map((item) => (item.name === name ? { ...item, description } : item)));
  }, []);

  const addAllToSelection = useCallback(() => {
    setSelected((prev) => {
      const descriptionMap = new Map(prev.map((item) => [item.name, item.description]));
      return right.map((item) => ({ name: item.name, description: descriptionMap.get(item.name) || "" }));
    });
    void Promise.all(right.map(async (item) => uploadFileToApi(await item.handle.getFile()))).catch(() => {});
  }, [right, uploadFileToApi]);

  const clearSelection = useCallback(() => {
    setSelected([]);
    setActiveLabel("");
    setPlacements({});
  }, []);

  const handleTemplateClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!activeLabel) return;
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setPlacements((prev) => ({ ...prev, [activeLabel]: { x, y } }));
    },
    [activeLabel]
  );

  const stepTitle =
    step === 1
      ? "Step 1: Original -> Choose"
      : step === 2
        ? "Step 2: Choose -> Order"
        : "Step 3: Template";
  const stepDesc =
    step === 1
      ? "ลากรูปจาก original ไป choose"
      : step === 2
        ? "จัดลำดับรูปและใส่ข้อความประกอบ"
        : "เลือกตัวอักษรแล้วคลิกบนภาพเทมเพลต";
  const canGoStep2 = right.length > 0;
  const canGoStep3 = selected.length > 0;
  const hasTooManyLabels = selected.length > 26;

  const stepButtonClass = (value: 1 | 2 | 3, disabled?: boolean) =>
    `rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] transition ${
      step === value
        ? "border-teal-300/70 bg-teal-500/20 text-teal-100"
        : "border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`;

  const renderStep1 = () => (
    <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
      <div className="border-r border-white/10 flex flex-col min-h-0">
        <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
          <span>Original</span>
          <span className="text-xs text-white/50">{left.length} files</span>
        </div>
        <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
          {left.length === 0 && <div className="text-sm text-white/50 px-1">ไม่พบรูปใน original</div>}
          {left.map((f) => (
            <div
              key={f.name}
              className={`rounded-2xl border p-3 flex items-center gap-3 bg-white/[0.04] border-white/10 ${
                chosenNames.has(f.name) ? "ring-2 ring-emerald-400/40" : ""
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
                  Copy to choose
                </PillButton>
              </div>
            </div>
          ))}
        </div>
      </div>

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
  );

  const renderStep2 = () => (
    <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
      <div className="border-r border-white/10 flex flex-col min-h-0">
        <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
          <span>Choose (ทั้งหมด)</span>
          <span className="text-xs text-white/50">{right.length} files</span>
        </div>
        <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
          {right.length === 0 && <div className="text-sm text-white/50 px-1">ยังไม่มีรูปใน choose</div>}
          {right.map((f) => (
            <div key={f.name} className="rounded-2xl border p-3 flex items-center gap-3 bg-white/[0.04] border-white/10">
              <Thumb file={f} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white/90 truncate">{f.name}</div>
                <div className="text-xs text-white/50">{humanSize(f.size)}</div>
              </div>
              <div className="flex gap-2">
                <PillButton onClick={() => addToSelection(f.name)} disabled={selectedNames.has(f.name)}>
                  {selectedNames.has(f.name) ? "Added" : "Add"}
                </PillButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Order</span>
            <span className="text-xs text-white/50">{selected.length} selected</span>
          </div>
          <div className="flex gap-2">
            <PillButton onClick={addAllToSelection} disabled={right.length === 0}>
              Select all
            </PillButton>
            <PillButton tone="danger" onClick={clearSelection} disabled={selected.length === 0}>
              Clear
            </PillButton>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
          {selected.length === 0 && <div className="text-sm text-white/50 px-1">ยังไม่ได้จัดลำดับ</div>}
          {selected.map((item, index) => {
            const file = chooseMap.get(item.name);
            const label = getLabelForIndex(index);
            return (
              <div key={item.name} className="rounded-2xl border p-3 flex items-center gap-3 bg-white/[0.04] border-white/10">
                <div className="h-10 w-10 rounded-2xl border border-rose-400/40 bg-rose-500/15 flex items-center justify-center text-sm font-semibold text-rose-200">
                  {label}
                </div>
                {file ? (
                  <Thumb file={file} />
                ) : (
                  <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-xs text-white/40">
                    FILE
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="text-sm text-white/90 truncate">{item.name}</div>
                  <input
                    value={item.description}
                    onChange={(e) => updateSelectiondescription(item.name, e.target.value)}
                    placeholder="ใส่ข้อความประกอบ..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/90 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <PillButton onClick={() => moveSelection(item.name, -1)} disabled={index === 0}>
                    Up
                  </PillButton>
                  <PillButton onClick={() => moveSelection(item.name, 1)} disabled={index === selected.length - 1}>
                    Down
                  </PillButton>
                  <PillButton tone="danger" onClick={() => removeFromSelection(item.name)}>
                    Remove
                  </PillButton>
                </div>
              </div>
            );
          })}
        </div>
        {/* <div className="border-t border-white/10 px-4 py-3 text-xs text-white/50">
          <div className="mb-2">JSON (เลือกและจัดลำดับ)</div>
          <pre className="max-h-36 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/70">
            {JSON.stringify(selectionPayload, null, 2)}
          </pre>
          {hasTooManyLabels && (
            <div className="mt-2 text-[11px] text-rose-300">รองรับตัวอักษร A-Z สูงสุด 26 รายการเท่านั้น</div>
          )}
        </div> */}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex-1 grid grid-cols-[300px_1fr] gap-0 overflow-hidden">
      <div className="border-r border-white/10 flex flex-col min-h-0">
        <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
          <span>Labels</span>
          <span className="text-xs text-white/50">{stepLabels.length} ตัว</span>
        </div>
        <div className="flex-1 overflow-auto px-4 pb-4 space-y-2">
          {selected.length === 0 && <div className="text-sm text-white/50 px-1">ยังไม่มีรูปที่เลือก</div>}
          {stepLabels.map((label, index) => {
            const item = selected[index];
            const file = item ? chooseMap.get(item.name) : undefined;
            const active = activeLabel === label;
            return (
              <button
                key={`${label}-${index}`}
                type="button"
                onClick={() => setActiveLabel(label)}
                className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
                  active
                    ? "border-rose-400/70 bg-rose-500/15 text-rose-100"
                    : "border-white/10 bg-white/[0.04] text-white/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-400/60 text-rose-200">
                    {label}
                  </span>
                  {file ? (
                    <Thumb file={file} />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-xs text-white/40">
                      FILE
                    </div>
                  )}
                  <span className="truncate">{item?.name || "Unknown"}</span>
                </div>
                {item?.description && <div className="mt-1 text-[10px] text-white/50 truncate">{item.description}</div>}
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-4">
          <PillButton tone="danger" onClick={() => setPlacements({})} disabled={Object.keys(placements).length === 0}>
            ล้างตำแหน่ง
          </PillButton>
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
          <span>Template</span>
          <span className="text-xs text-white/50">{activeLabel ? `กำลังวาง ${activeLabel}` : "เลือกตัวอักษรก่อนคลิก"}</span>
        </div>
        <div className="flex-1 overflow-hidden px-5 pb-5">
          <div className="h-full w-full flex items-center justify-center">
            <div
              className="relative aspect-square w-full max-w-[900px] max-h-full overflow-hidden rounded-3xl border border-white/10 bg-black/30"
              onClick={handleTemplateClick}
            >
              <img
                src={resolvedTemplateSrc}
                alt="template"
                className="block h-full w-full object-contain select-none"
              />
              {Object.entries(placements).map(([label, pos]) => (
                <div
                  key={label}
                  className="absolute text-red-500 text-lg font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-3 text-xs text-white/50">
          <div className="mb-2">JSON (รวมข้อมูล)</div>
          <pre className="max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/70">
            {JSON.stringify(combinedPayload, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[1300px] h-[86vh] rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_40px_120px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-white/90 font-semibold">{stepTitle}</div>
            <div className="text-xs text-white/55">{stepDesc}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button type="button" className={stepButtonClass(1)} onClick={() => setStep(1)}>
                Step 1
              </button>
              <button
                type="button"
                className={stepButtonClass(2, !canGoStep2)}
                onClick={() => {
                  if (!canGoStep2) return;
                  setStep(2);
                }}
                disabled={!canGoStep2}
              >
                Step 2
              </button>
              <button
                type="button"
                className={stepButtonClass(3, !canGoStep3)}
                onClick={() => {
                  if (!canGoStep3) return;
                  setStep(3);
                }}
                disabled={!canGoStep3}
              >
                Step 3
              </button>
            </div>
            <div className="h-6 w-px bg-white/10" />
            {/* <PillButton onClick={() => refresh()} disabled={busy}>
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
            </PillButton> */}
            <PillButton tone="danger" onClick={onClose} disabled={busy}>
              ปิด
            </PillButton>
          </div>
        </div>

        {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}

        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/45 flex flex-wrap items-center justify-between gap-3">
          <div>เคล็ดลับ: Step 2 ใช้รูปจาก choose เป็น master เท่านั้น และ Step 3 จะใช้ตัวอักษร A-Z ตามลำดับที่จัดไว้</div>
          <div className="flex items-center gap-2">
            <PillButton onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))} disabled={step === 1}>
              Back
            </PillButton>
            <PillButton
              onClick={() => {
                if (step === 1) {
                  if (!canGoStep2) return;
                  setStep(2);
                  return;
                }
                if (step === 2) {
                  if (!canGoStep3) return;
                  setStep(3);
                  return;
                }
                void saveReportImages();
              }}
              disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3) || busy}
            >
              {step === 3 ? "Save" : "Next"}
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
}
