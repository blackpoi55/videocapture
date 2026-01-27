"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { alertErr, alertOk, confirmSwal } from "./alerts";
import Swal from "sweetalert2";
import { deleteEntry, humanSize, isImageType, listFiles, writeFile } from "./file-utils";
import type { DirHandle, FileItem } from "./types";
import { PillButton } from "./ui";
import { Thumb } from "./Thumb";
import {
  getvaluebyselecttypeid,
  getvaluebyselecttypeidonlyactive,
  postreportimage,
  putreportimage,
  uploadMultiple,
} from "@/action/api";

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

type SelectOption = {
  id: string;
  code: string;
  label: string;
};
type TemplateWord = {
  id: string;
  text: string;
  x: number;
  y: number;
};

const TEMPLATE_SRC = "/images/type/OPERATIVETEMPLATE1IMAGE.jpg";

const getLabelForIndex = (index: number) => (index >= 0 && index < 26 ? String.fromCharCode(65 + index) : "?");
const normalizeText = (value: unknown) => (value == null ? "" : String(value));
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

export function ImagePickerModal(props: {
  open: boolean;
  onClose: () => void;
  originalDir: DirHandle | null;
  chooseDir: DirHandle | null;
  onRefreshAfter: () => Promise<void>;
  onEditChosen: (file: FileItem) => void;
  onExportReport: () => Promise<void>;
  refreshSignal?: { tick: number; mode: "single" | "all"; fileName?: string };
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
  const [descriptionOptions, setDescriptionOptions] = useState<SelectOption[]>([]);
  const [loadingDescriptionOptions, setLoadingDescriptionOptions] = useState(false);
  const [templateWordOptions, setTemplateWordOptions] = useState<SelectOption[]>([]);
  const [loadingTemplateWordOptions, setLoadingTemplateWordOptions] = useState(false);
  const [templateWords, setTemplateWords] = useState<TemplateWord[]>([]);
  const [templateMenuQuery, setTemplateMenuQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    posX: number;
    posY: number;
    mode: "add" | "delete";
    wordId?: string;
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reportPreview, setReportPreview] = useState<{ type: "template" | "file"; file?: FileItem } | null>(null);
  const [reportPreviewUrl, setReportPreviewUrl] = useState<string | null>(null);
  const [previewLightbox, setPreviewLightbox] = useState(false);
  const [lightboxImageBox, setLightboxImageBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const lightboxWrapRef = useRef<HTMLDivElement | null>(null);
  const lightboxImgRef = useRef<HTMLImageElement | null>(null);
  const lastRefreshSignalRef = useRef<number | undefined>(undefined);
  const [reportForm, setReportForm] = useState({
    estimatedBloodLoss: "",
    therapy: "",
    recommendation: "",
    note: "",
  });
  const appliedPicturesRef = useRef<string | null>(null);

  const chosenNames = useMemo(() => new Set(right.map((x) => x.name)), [right]);
  const chooseMap = useMemo(() => new Map(right.map((item) => [item.name, item])), [right]);
  const stepLabels = useMemo(() => selected.map((_, index) => getLabelForIndex(index)), [selected]);
  const templateMenuOptions = useMemo(
    () => {
      const items = [
        ...templateWordOptions.map((option) => ({ id: `word-${option.id}`, label: option.label })),
        ...stepLabels.map((label) => ({ id: `label-${label}`, label })),
      ];
      const query = templateMenuQuery.trim().toLowerCase();
      if (!query) return items;
      return items.filter((item) => item.label.toLowerCase().includes(query));
    },
    [templateWordOptions, stepLabels, templateMenuQuery]
  );
  const selectionPayload = useMemo(
    () =>
      selected.map((item, index) => ({
        label: getLabelForIndex(index),
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
        words: templateWords.map((item) => ({
          text: item.text,
          x: Number(item.x.toFixed(2)),
          y: Number(item.y.toFixed(2)),
        })),
      },
    }),
    [selectionPayload, placementPayload, resolvedTemplateSrc, caseNumber, templateWords]
  );
  const hasExistingPictures = useMemo(() => (initialPictures?.length ?? 0) > 0, [initialPictures]);

  const refresh = useCallback(async () => {
    if (!originalDir || !chooseDir) return;
    const [a, b] = await Promise.all([listFiles(originalDir), listFiles(chooseDir)]);
    setLeft(a.filter((x) => isImageType(x.type, x.name)));
    setRight(b.filter((x) => isImageType(x.type, x.name)));
  }, [originalDir, chooseDir]);

  const uploadFileToApi = useCallback(async (file: File, force = false) => {
    if (!force && uploadMap[file.name]) return;
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
    setReportForm({
      estimatedBloodLoss: "",
      therapy: "",
      recommendation: "",
      note: "",
    });
    setPreviewFile(null);
    setPreviewUrl(null);
    setReportPreview(null);
    setReportPreviewUrl(null);
    setPreviewLightbox(false);
    setLightboxImageBox(null);
    setTemplateWords([]);
    setContextMenu(null);
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    refresh().catch(() => {});
  }, [open, refresh, refreshSignal?.tick]);

  useEffect(() => {
    if (!open || !chooseDir) return;
    const tick = refreshSignal?.tick;
    if (tick == null) return;
    if (lastRefreshSignalRef.current === tick) return;
    lastRefreshSignalRef.current = tick;
    let cancelled = false;
    const reupload = async () => {
      if (refreshSignal?.mode === "single" && refreshSignal.fileName) {
        try {
          const handle = await chooseDir.getFileHandle(refreshSignal.fileName);
          const f = await handle.getFile();
          if (!cancelled) await uploadFileToApi(f, true);
        } catch {
          return;
        }
        return;
      }
      const files = (await listFiles(chooseDir)).filter((it) => isImageType(it.type, it.name));
      await Promise.all(
        files.map(async (item) => {
          const f = await item.handle.getFile();
          if (!cancelled) await uploadFileToApi(f, true);
        })
      );
    };
    reupload().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, chooseDir, refreshSignal, uploadFileToApi]);

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
    if (!open) return;
    let cancelled = false;
    const loadOptions = async () => {
      try {
        setLoadingDescriptionOptions(true);
        const response = await getvaluebyselecttypeidonlyactive("53");
        const raw = (response as { data?: unknown })?.data ?? response;
        const parsed = parseSelectOptions(raw);
        if (!cancelled) setDescriptionOptions(parsed);
      } catch {
        if (!cancelled) setDescriptionOptions([]);
      } finally {
        if (!cancelled) setLoadingDescriptionOptions(false);
      }
    };
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadTemplateWords = async () => {
      try {
        setLoadingTemplateWordOptions(true);
        const response = await getvaluebyselecttypeid("57");
        const raw = (response as { data?: unknown })?.data ?? response;
        const parsed = parseSelectOptions(raw);
        if (!cancelled) setTemplateWordOptions(parsed);
      } catch {
        if (!cancelled) setTemplateWordOptions([]);
      } finally {
        if (!cancelled) setLoadingTemplateWordOptions(false);
      }
    };
    void loadTemplateWords();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null);
      return;
    }
    let alive = true;
    let currentUrl: string | null = null;
    (async () => {
      try {
        const file = await previewFile.handle.getFile();
        const url = URL.createObjectURL(file);
        if (!alive) return;
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = url;
        setPreviewUrl(url);
      } catch {
        if (alive) setPreviewUrl(null);
      }
    })();
    return () => {
      alive = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [previewFile]);

  useEffect(() => {
    if (!reportPreview || reportPreview.type === "template") {
      setReportPreviewUrl(null);
      return;
    }
    const previewFile = reportPreview.file;
    if (!previewFile) {
      setReportPreviewUrl(null);
      return;
    }
    let alive = true;
    let currentUrl: string | null = null;
    (async () => {
      try {
        const file = await previewFile.handle.getFile();
        const url = URL.createObjectURL(file);
        if (!alive) return;
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = url;
        setReportPreviewUrl(url);
      } catch {
        if (alive) setReportPreviewUrl(null);
      }
    })();
    return () => {
      alive = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [reportPreview]);

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
    if (step !== 2 || !activeLabel) return;
    const index = activeLabel.charCodeAt(0) - 65;
    if (index < 0 || index >= selected.length) return;
    const item = selected[index];
    const file = item ? chooseMap.get(item.name) : null;
    if (file) setPreviewFile(file);
  }, [activeLabel, selected, chooseMap, step]);

  useEffect(() => {
    if (step !== 2) return;
    setSelected((prev) => {
      const descriptionMap = new Map(prev.map((item) => [item.name, item.description]));
      const rightNames = new Set(right.map((item) => item.name));
      const kept = prev.filter((item) => rightNames.has(item.name));
      const keptNames = new Set(kept.map((item) => item.name));
      const added = right
        .filter((item) => !keptNames.has(item.name))
        .map((item) => ({ name: item.name, description: descriptionMap.get(item.name) || "" }));
      return [...kept, ...added];
    });
    void Promise.all(right.map(async (item) => uploadFileToApi(await item.handle.getFile()))).catch(() => {});
    if (right.length === 0) {
      setPreviewFile(null);
      return;
    }
    setPreviewFile((prev) => (prev && right.some((item) => item.name === prev.name) ? prev : right[0]));
  }, [step, right, uploadFileToApi]);

  useEffect(() => {
    if (step !== 3) return;
    setReportPreview({ type: "template" });
  }, [step]);

  useEffect(() => {
    if (!previewLightbox || reportPreview?.type !== "template") return;
    const wrap = lightboxWrapRef.current;
    const img = lightboxImgRef.current;
    if (!wrap || !img) return;

    const update = () => {
      const wrapRect = wrap.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      setLightboxImageBox({
        x: imgRect.left - wrapRect.left,
        y: imgRect.top - wrapRect.top,
        w: imgRect.width,
        h: imgRect.height,
      });
    };

    update();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => update());
      resizeObserver.observe(wrap);
    }
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      resizeObserver?.disconnect();
    };
  }, [previewLightbox, reportPreview?.type]);

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

  const removeFromSelection = useCallback((name: string) => {
    setSelected((prev) => prev.filter((item) => item.name !== name));
  }, []);

  const moveSelection = useCallback((name: string, direction: -1 | 1) => {
    setSelected((prev) => {
      const index = prev.findIndex((item) => item.name === name);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const fromLabel = getLabelForIndex(index);
      const toLabel = getLabelForIndex(nextIndex);
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      setPlacements((prevPlacements) => {
        if (fromLabel === toLabel) return prevPlacements;
        const next = { ...prevPlacements };
        const fromPos = prevPlacements[fromLabel];
        const toPos = prevPlacements[toLabel];
        if (fromPos) {
          next[toLabel] = fromPos;
        } else {
          delete next[toLabel];
        }
        if (toPos) {
          next[fromLabel] = toPos;
        } else {
          delete next[fromLabel];
        }
        return next;
      });
      setActiveLabel((prevLabel) => {
        if (prevLabel === fromLabel) return toLabel;
        if (prevLabel === toLabel) return fromLabel;
        return prevLabel;
      });
      return copy;
    });
  }, []);

  const updateSelectiondescription = useCallback((name: string, description: string) => {
    setSelected((prev) => prev.map((item) => (item.name === name ? { ...item, description } : item)));
  }, []);

  const updateReportField = useCallback(
    (key: "estimatedBloodLoss" | "therapy" | "recommendation" | "note", value: string) => {
      setReportForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

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

  const handleTemplateContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const clickedWord = (event.target as HTMLElement | null)?.closest?.(
        "[data-template-word-id]"
      ) as HTMLElement | null;
      const posX = ((event.clientX - rect.left) / rect.width) * 100;
      const posY = ((event.clientY - rect.top) / rect.height) * 100;
      setContextMenu({
        open: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        posX,
        posY,
        mode: clickedWord ? "delete" : "add",
        wordId: clickedWord?.dataset?.templateWordId,
      });
      setTemplateMenuQuery("");
    },
    []
  );

  const addTemplateWord = useCallback(
    (option: SelectOption) => {
      if (!contextMenu) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setTemplateWords((prev) => [
        ...prev,
        { id, text: option.label, x: contextMenu.posX, y: contextMenu.posY },
      ]);
      setContextMenu(null);
    },
    [contextMenu]
  );

  const removeTemplateWord = useCallback(() => {
    if (!contextMenu?.wordId) return;
    setTemplateWords((prev) => prev.filter((item) => item.id !== contextMenu.wordId));
    setContextMenu(null);
  }, [contextMenu]);

  const stepTitle =
    step === 1
      ? "Step 1: Original -> Choose"
      : step === 2
        ? "Step 2: Order + Template"
        : "Step 3: Report";
  const stepDesc =
    step === 1
      ? "Drag images from original to choose"
      : step === 2
        ? "Order images and place labels on the template"
        : "Fill in report details";
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
    <div className="flex-1 grid grid-cols-[35%_35%_30%] gap-0 overflow-hidden">
      <datalist id="image-desc-options">
        {descriptionOptions.map((option) => (
          <option key={option.id} value={option.label} />
        ))}
      </datalist>
      <div className="flex flex-col min-h-0">
        {renderTemplateSection()}
      </div>
      <div className="border-r border-white/10 flex flex-col min-h-0">
        <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
          <span>Preview</span>
          {previewFile && <span className="text-xs text-white/50">{previewFile.name}</span>}
        </div>
        <div className="flex-1 overflow-auto px-5 pb-5 space-y-3">
          {previewFile ? (
            <>
              <div className="rounded-3xl border border-white/10 bg-black/30 overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt={previewFile.name} className="w-full h-auto object-contain" />
                ) : (
                  <div className="h-48 flex items-center justify-center text-xs text-white/40">Loading image...</div>
                )}
              </div>
              <div className="text-sm text-white/80 break-all">{previewFile.name}</div>
              <div className="text-xs text-white/50">{humanSize(previewFile.size)}</div>
              <PillButton onClick={() => onEditChosen(previewFile)} disabled={busy}>
                Edit
              </PillButton>
            </>
          ) : (
            <div className="text-sm text-white/50">Click an item in Order to preview</div>
          )}
        </div>
      </div>

      <div className="flex flex-col min-h-0 border-r border-white/10">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Order</span>
              <span className="text-xs text-white/50">{selected.length} selected</span>
            </div>
            {/* <div className="flex gap-2">
              <PillButton onClick={addAllToSelection} disabled={right.length === 0}>
                Select all
              </PillButton>
              <PillButton tone="danger" onClick={clearSelection} disabled={selected.length === 0}>
                Clear
              </PillButton>
            </div> */}
          </div>
          <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
            {selected.length === 0 && <div className="text-sm text-white/50 px-1">No selection yet</div>}
            {selected.map((item, index) => {
              const file = chooseMap.get(item.name);
              const label = getLabelForIndex(index);
              const active = activeLabel === label;
              return (
                <div
                  key={item.name}
                  className={`rounded-2xl border p-3 flex items-center gap-3 bg-white/[0.04] border-white/10 cursor-pointer transition ${
                    active ? "border-green-400 bg-green-500/10 ring-2 ring-green-400" : "hover:border-white/30"
                  }`}
                  onClick={() => {
                    if (file) setPreviewFile(file);
                    setActiveLabel(label);
                  }}
                >
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
                      onClick={(e) => e.stopPropagation()}
                      list="image-desc-options"
                      aria-busy={loadingDescriptionOptions}
                      placeholder="Add description..."
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/90 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <PillButton
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSelection(item.name, -1);
                      }}
                      disabled={index === 0}
                    >
                      Up
                    </PillButton>
                    <PillButton
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSelection(item.name, 1);
                      }}
                      disabled={index === selected.length - 1}
                    >
                      Down
                    </PillButton>
                    <PillButton
                      tone="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromSelection(item.name);
                      }}
                    >
                      Remove
                    </PillButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
    </div>
  );

  const renderTemplateSection = () => (
    <div
      className="flex-1 flex flex-col min-h-0"
      onClick={() => {
        if (contextMenu?.open) setContextMenu(null);
      }}
    >
      <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
        <span>Template</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">{activeLabel ? `Placing ${activeLabel}` : "Select from Order then click template"}</span>
          <PillButton
            tone="danger"
            onClick={() => {
              setPlacements({});
              setTemplateWords([]);
            }}
            disabled={Object.keys(placements).length === 0 && templateWords.length === 0}
          >
            Clear positions
          </PillButton>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-5 pb-5">
        <div className="h-full w-full flex items-center justify-center">
          <div
            className="relative aspect-square w-full max-w-[900px] max-h-full overflow-visible"
            onClick={handleTemplateClick}
            onContextMenu={handleTemplateContextMenu}
          >
            <div className="absolute inset-0 rounded-3xl border border-white/10 bg-black/30 overflow-hidden">
              <img src={resolvedTemplateSrc} alt="template" className="block h-full w-full object-contain select-none" />
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
              {templateWords.map((item) => (
                <div
                  key={item.id}
                  data-template-word-id={item.id}
                  className="absolute text-red-500 text-sm font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {item.text}
                </div>
              ))}
            </div>
            {contextMenu?.open && (
              <div
                className="absolute z-10 min-w-[180px] rounded-2xl border border-white/10 bg-slate-950/95 p-2 text-xs text-white/90 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                {contextMenu.mode === "delete" ? (
                  <button
                    type="button"
                    onClick={removeTemplateWord}
                    className="w-full rounded-xl px-2 py-2 text-left hover:bg-white/10 text-red-200"
                  >
                    Delete text
                  </button>
                ) : (
                  <>
                    <input
                      value={templateMenuQuery}
                      onChange={(e) => setTemplateMenuQuery(e.target.value)}
                      placeholder="Search..."
                      className="mb-2 w-full rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 text-xs text-white/90 outline-none"
                    />
                    {loadingTemplateWordOptions && <div className="px-2 py-2 text-white/60">Loading...</div>}
                    {!loadingTemplateWordOptions && templateMenuOptions.length === 0 && (
                      <div className="px-2 py-2 text-white/60">No options</div>
                    )}
                    {!loadingTemplateWordOptions &&
                      (templateMenuOptions.length > 0 ? (
                        <div className="max-h-48 overflow-auto space-y-1 pr-1">
                          {templateMenuOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => addTemplateWord({ id: option.id, code: option.label, label: option.label })}
                              className="w-full rounded-xl px-2 py-2 text-left hover:bg-white/10"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null)}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* <div className="border-t border-white/10 px-5 py-3 text-xs text-white/50">
        <div className="mb-2">JSON (payload)</div>
        <pre className="max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-white/70">
          {JSON.stringify(combinedPayload, null, 2)}
        </pre>
      </div> */}
    </div>
  );

  const renderStep3 = () => (
    <div className="flex-1 grid grid-cols-[360px_1fr] gap-0 overflow-hidden">
      <div className="border-r border-white/10 flex flex-col min-h-0">
        <div className="px-5 py-3 text-sm text-white/80 flex items-center justify-between">
          <span>Preview</span>
          {reportPreview?.type === "file" && reportPreview.file && (
            <span className="text-xs text-white/50">{reportPreview.file.name}</span>
          )}
          {reportPreview?.type === "template" && <span className="text-xs text-white/50">Template</span>}
        </div>
        <div className="flex-1 overflow-auto px-5 pb-5 space-y-3">
          <div
            className="rounded-3xl border border-white/10 bg-black/30 overflow-hidden cursor-zoom-in"
            onClick={() => setPreviewLightbox(true)}
          >
            <div
              className={`relative w-full ${reportPreview?.type === "template" ? "aspect-square max-h-[60vh]" : ""}`}
            >
              {reportPreview?.type === "template" ? (
                <>
                  <img src={resolvedTemplateSrc} alt="template" className="h-full w-full object-contain" />
                  {Object.entries(placements).map(([label, pos]) => (
                    <div
                      key={`preview-${label}`}
                      className="absolute text-red-500 text-base font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {label}
                    </div>
                  ))}
                  {templateWords.map((item) => (
                    <div
                      key={`preview-word-${item.id}`}
                      className="absolute text-red-500 text-sm font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                      style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {item.text}
                    </div>
                  ))}
                </>
              ) : reportPreviewUrl ? (
                <img
                  src={reportPreviewUrl}
                  alt={reportPreview?.file?.name || "preview"}
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                  Loading image...
                </div>
              )}
            </div>
          </div>
          {reportPreview?.type === "file" && reportPreview.file && (() => {
            const item = selected.find((entry) => entry.name === reportPreview.file?.name);
            const description = item?.description?.trim();
            return (
              <>
                <div className="text-sm text-white/80 break-all">{description || reportPreview.file.name}</div>
                <div className="text-xs text-white/50">{humanSize(reportPreview.file.size)}</div>
              </>
            );
          })()}
        </div>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/60">คลิกเพื่อดูภาพด้านล่าง</div>
        <div className="max-h-[260px] overflow-auto px-4 pb-4 space-y-2">
          <button
            type="button"
            onClick={() => setReportPreview({ type: "template" })}
            className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
              reportPreview?.type === "template"
                ? "border-rose-400/70 bg-rose-500/15 text-rose-100"
                : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                <img src={resolvedTemplateSrc} alt="template" className="h-full w-full object-contain" />
                {Object.entries(placements).map(([label, pos]) => (
                  <div
                    key={`thumb-${label}`}
                    className="absolute text-red-500 text-[8px] font-semibold"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {label}
                  </div>
                ))}
                {templateWords.map((item) => (
                  <div
                    key={`thumb-word-${item.id}`}
                    className="absolute text-red-500 text-[7px] font-semibold"
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
              <span className="truncate">Template</span>
            </div>
          </button>
          {right.map((file) => {
            const description = selected.find((item) => item.name === file.name)?.description?.trim();
            return (
            <button
              key={file.name}
              type="button"
              onClick={() => setReportPreview({ type: "file", file })}
              className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
                reportPreview?.type === "file" && reportPreview.file?.name === file.name
                  ? "border-rose-400/70 bg-rose-500/15 text-rose-100"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <Thumb file={file} />
                <span className="truncate">{description || file.name}</span>
              </div>
            </button>
          )})}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="max-w-[900px] space-y-5">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Estimated Blood Loss</div>
            <input
              value={reportForm.estimatedBloodLoss}
              onChange={(e) => updateReportField("estimatedBloodLoss", e.target.value)}
              placeholder="เช่น 50 ml"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90 outline-none"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Therapy</div>
            <textarea
              value={reportForm.therapy}
              onChange={(e) => updateReportField("therapy", e.target.value)}
              placeholder="รายละเอียดการรักษา"
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90 outline-none"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Recommendation</div>
            <textarea
              value={reportForm.recommendation}
              onChange={(e) => updateReportField("recommendation", e.target.value)}
              placeholder="คำแนะนำเพิ่มเติม"
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90 outline-none"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Note</div>
            <textarea
              value={reportForm.note}
              onChange={(e) => updateReportField("note", e.target.value)}
              placeholder="บันทึกอื่นๆ"
              rows={3}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/90 outline-none"
            />
          </div>
        </div>
      </div>
      {previewLightbox && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPreviewLightbox(false)}
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center"
            onClick={() => setPreviewLightbox(false)}
          >
            {reportPreview?.type === "template" ? (
              <div
                ref={lightboxWrapRef}
                className="relative aspect-square w-full max-w-[90vh] max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  ref={lightboxImgRef}
                  src={resolvedTemplateSrc}
                  alt="template"
                  className="h-full w-full object-contain"
                  onLoad={() => {
                    const wrap = lightboxWrapRef.current;
                    const img = lightboxImgRef.current;
                    if (!wrap || !img) return;
                    const wrapRect = wrap.getBoundingClientRect();
                    const imgRect = img.getBoundingClientRect();
                    setLightboxImageBox({
                      x: imgRect.left - wrapRect.left,
                      y: imgRect.top - wrapRect.top,
                      w: imgRect.width,
                      h: imgRect.height,
                    });
                  }}
                />
                {lightboxImageBox && (
                  <div
                    className="absolute"
                    style={{
                      left: lightboxImageBox.x,
                      top: lightboxImageBox.y,
                      width: lightboxImageBox.w,
                      height: lightboxImageBox.h,
                    }}
                  >
                    {Object.entries(placements).map(([label, pos]) => (
                      <div
                        key={`lightbox-${label}`}
                        className="absolute text-red-500 text-2xl font-semibold drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {label}
                      </div>
                    ))}
                    {templateWords.map((item) => (
                      <div
                        key={`lightbox-word-${item.id}`}
                        className="absolute text-red-500 text-lg font-semibold drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
                        style={{
                          left: `${item.x}%`,
                          top: `${item.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {item.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : reportPreviewUrl ? (
              <img
                src={reportPreviewUrl}
                alt={reportPreview?.file?.name || "preview"}
                className="max-h-[95vh] max-w-[95vw] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="text-white/70" onClick={(e) => e.stopPropagation()}>
                Loading image...
              </div>
            )}
            <button
              type="button"
              onClick={() => setPreviewLightbox(false)}
              className="absolute top-0 right-0 translate-x-4 -translate-y-4 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs text-white/80 hover:bg-black/80"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[1900px] h-[86vh] rounded-3xl border border-white/10 bg-slate-950 shadow-[0_40px_120px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col">
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
          <div>Tip: Step 2 uses choose images as master and places labels on the template. Step 3 is report details.</div>
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
