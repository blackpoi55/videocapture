"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getcamerapreset, getpersonhistorybyid, getSelectTypes, getvaluebyselecttypeid, updateCamera } from "@/action/api";
import { alertErr, alertInfo, alertOk, confirmSwal } from "@/components/capture/alerts";
import { CameraAdjustModal } from "@/components/capture/CameraAdjustModal";
import { ImageEditorModal } from "@/components/capture/ImageEditorModal";
import { ImagePickerModal } from "@/components/capture/ImagePickerModal";
import { Thumb } from "@/components/capture/Thumb";
import { deleteEntry, ensureDir, humanSize, isImageType, isVideoType, listDirs, listFiles, writeFile } from "@/components/capture/file-utils";
import type { DirHandle, FileItem } from "@/components/capture/types";
import { GlassCard, IconButton, PillButton } from "@/components/capture/ui";
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

type CameraPresetValues = {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  cropBottom: number;
};

type CameraPresetOption = {
  id: string;
  name: string;
  values: CameraPresetValues;
};

type CaseCameraData = {
  presetId: string;
  cameraName: string;
  values: CameraPresetValues;
};

type SelectTypeKey = keyof typeof SELECT_TYPE_IDS;

const DEFAULT_CAMERA_VALUES: CameraPresetValues = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 50,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0,
};

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

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseValuesObject = (value: unknown): Record<string, unknown> | null => {
  if (isRecordValue(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isRecordValue(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const clampCameraValue = (value: unknown, min: number, max: number, fallback: number) => {
  const base = toNumber(value, fallback);
  return Math.min(max, Math.max(min, base));
};

const parseCameraPresetOptions = (raw: unknown): CameraPresetOption[] => {
  const rows = Array.isArray(raw) ? raw : isRecordValue(raw) ? [raw] : [];
  return rows
    .map((item, index) => {
      const row = isRecordValue(item) ? item : {};
      const valuesObject =
        parseValuesObject(row.values ?? row.value ?? row.config ?? row.setting ?? row.settings) ?? {};
      const source = { ...row, ...valuesObject };
      const id = normalizeText(
        row.id ?? row.cameraid ?? row.camera_id ?? row.cameraId ?? row.presetid ?? row.cameraPresetId
      ).trim();
      const name =
        normalizeText(row.name ?? row.camera_name ?? row.cameraName ?? row.presetname ?? row.label ?? row.title).trim() ||
        `Preset ${index + 1}`;
      if (!id) return null;
      const values: CameraPresetValues = {
        brightness: clampCameraValue(source.brightness ?? source.bright, 0, 200, DEFAULT_CAMERA_VALUES.brightness),
        contrast: clampCameraValue(source.contrast, 50, 200, DEFAULT_CAMERA_VALUES.contrast),
        saturation: clampCameraValue(source.saturation ?? source.saturate, 0, 200, DEFAULT_CAMERA_VALUES.saturation),
        sharpness: clampCameraValue(source.sharpness, 0, 100, DEFAULT_CAMERA_VALUES.sharpness),
        cropLeft: clampCameraValue(source.cropLeft ?? source.crop_left ?? source.cropleft, 0, 40, DEFAULT_CAMERA_VALUES.cropLeft),
        cropRight: clampCameraValue(source.cropRight ?? source.crop_right ?? source.cropright, 0, 40, DEFAULT_CAMERA_VALUES.cropRight),
        cropTop: clampCameraValue(source.cropTop ?? source.crop_top ?? source.croptop, 0, 40, DEFAULT_CAMERA_VALUES.cropTop),
        cropBottom: clampCameraValue(source.cropBottom ?? source.crop_bottom ?? source.cropbottom, 0, 40, DEFAULT_CAMERA_VALUES.cropBottom),
      };
      return { id, name, values };
    })
    .filter(Boolean) as CameraPresetOption[];
};

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
  camera_id: string;
  camera_name: string;
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
  const [cameraPresetOptions, setCameraPresetOptions] = useState<CameraPresetOption[]>([]);
  const [cameraPresetId, setCameraPresetId] = useState("");
  const [cameraPresetMode, setCameraPresetMode] = useState<"preset" | "edit">("preset");
  const [cameraPresetName, setCameraPresetName] = useState("");
  const [cameraPresetLoading, setCameraPresetLoading] = useState(false);
  const [cameraPresetError, setCameraPresetError] = useState<string | null>(null);
  const [caseCameraData, setCaseCameraData] = useState<CaseCameraData | null>(null);
  const caseCameraAppliedRef = useRef<string | null>(null);
  const [camAdjustOpen, setCamAdjustOpen] = useState(false);
  const camFilterRef = useRef("brightness(100%) contrast(100%) saturate(100%)");
  const camCropRef = useRef({ left: 0, right: 0, top: 0, bottom: 0 });
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const renderLoopRef = useRef<number | null>(null);
  const applyCameraValues = useCallback(
    (values: CameraPresetValues) => {
      setCamBrightness(clampCameraValue(values.brightness, 0, 200, camDefaults.brightness));
      setCamContrast(clampCameraValue(values.contrast, 50, 200, camDefaults.contrast));
      setCamSaturation(clampCameraValue(values.saturation, 0, 200, camDefaults.saturation));
      setCamSharpness(clampCameraValue(values.sharpness, 0, 100, camDefaults.sharpness));
      setCamCropLeft(clampCameraValue(values.cropLeft, 0, 40, camDefaults.cropLeft));
      setCamCropRight(clampCameraValue(values.cropRight, 0, 40, camDefaults.cropRight));
      setCamCropTop(clampCameraValue(values.cropTop, 0, 40, camDefaults.cropTop));
      setCamCropBottom(clampCameraValue(values.cropBottom, 0, 40, camDefaults.cropBottom));
    },
    [camDefaults]
  );

  const markCameraEdit = useCallback(() => {
    if (cameraPresetMode === "edit") return;
    setCameraPresetMode("edit");
    setCameraPresetName("edit");
    if (caseIdParam) caseCameraAppliedRef.current = caseIdParam;
  }, [cameraPresetMode, caseIdParam]);

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
    let active = true;
    const loadCameraPresets = async () => {
      setCameraPresetLoading(true);
      setCameraPresetError(null);
      try {
        const response = await getcamerapreset();
        if ((response as { error?: unknown })?.error) {
          throw new Error((response as { message?: string })?.message || "โหลดพรีเซ็ตไม่สำเร็จ");
        }
        const raw = (response as { data?: unknown })?.data ?? response;
        const presets = parseCameraPresetOptions(raw);
        if (!active) return;
        setCameraPresetOptions(presets);
      } catch (err) {
        if (!active) return;
        setCameraPresetOptions([]);
        setCameraPresetError(err instanceof Error ? err.message : "โหลดพรีเซ็ตไม่สำเร็จ");
      } finally {
        if (active) setCameraPresetLoading(false);
      }
    };
    loadCameraPresets();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!caseIdParam) {
      setCaseDetail(null);
      setCasePrefill(null);
      setCaseCameraData(null);
      caseCameraAppliedRef.current = null;
      return;
    }
    casePrefillAppliedRef.current = null;
    caseCameraAppliedRef.current = null;
    let active = true;
    (async () => {
      const response = await getpersonhistorybyid(caseIdParam);
      if (!active) return;
      if ((response as { error?: unknown })?.error) {
        alertErr("ดึงข้อมูลเคสไม่สำเร็จ", (response as { message?: string })?.message || "โปรดลองใหม่อีกครั้ง");
        return;
      }
      const data = (response as { data?: unknown })?.data ?? response;
      const row = data as Record<string, unknown> | null;
      if (!row) return;
      const hn = normalizeText(row.hn);
      const an = normalizeText(row.an);
      const registerDate = normalizeText(row.registerdate);
      const registerTime = normalizeText(row.registertime);
      const appointmentDate = normalizeText(row.appointmentdate);
      const appointmentTime = normalizeText(row.appointmenttime);
      const caseDate = normalizeText(row.casedate);
      const timeFrom = normalizeText(row.casetimefrom);
      const timeTo = normalizeText(row.casetimeto);
      const procedureRoom = normalizeText(row.room_name);
      const procedure = normalizeText(row.mainprocedure_name);
      const physician = normalizeText(row.physician_name);
      const note = normalizeText(row.note);
      const caseNo = normalizeText(row.casenumber);
      const date = parseApiDate(row.casedate);
      const cameraId = normalizeText(row.camera_id ?? row.cameraId ?? row.cameraid);
      const cameraName = normalizeText(row.camera_name);
      const presetId = normalizeText(row.preset);
      const cameraValues: CameraPresetValues = {
        brightness: clampCameraValue(row.brightness, 0, 200, camDefaults.brightness),
        contrast: clampCameraValue(row.contrast, 50, 200, camDefaults.contrast),
        saturation: clampCameraValue(row.saturation, 0, 200, camDefaults.saturation),
        sharpness: clampCameraValue(row.sharpness, 0, 100, camDefaults.sharpness),
        cropLeft: clampCameraValue(row.cropLeft, 0, 40, camDefaults.cropLeft),
        cropRight: clampCameraValue(row.cropRight, 0, 40, camDefaults.cropRight),
        cropTop: clampCameraValue(row.cropTop, 0, 40, camDefaults.cropTop),
        cropBottom: clampCameraValue(row.cropBottom, 0, 40, camDefaults.cropBottom),
      };
      const prefill: CasePrefill = { caseId: caseIdParam, hn, an, date };
      setCasePrefill(prefill);
      setCaseCameraData({ presetId, cameraName, values: cameraValues });
      setCaseDetail({
        caseId: caseIdParam,
        camera_id: cameraId,
        camera_name: cameraName,
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

  useEffect(() => {
    if (!caseIdParam || !caseCameraData) return;
    if (caseCameraAppliedRef.current === caseIdParam) return;

    const cameraName = caseCameraData.cameraName.trim().toLowerCase();
    const presetId = caseCameraData.presetId;

    if (cameraName && cameraName !== "edit" && presetId) {
      const preset = cameraPresetOptions.find((opt) => opt.id === presetId);
      if (preset) {
        setCameraPresetMode("preset");
        setCameraPresetId(preset.id);
        setCameraPresetName(preset.name);
        applyCameraValues(preset.values);
        caseCameraAppliedRef.current = caseIdParam;
        return;
      }
      if (cameraPresetLoading) return;
    }

    setCameraPresetMode("edit");
    setCameraPresetName("edit");
    setCameraPresetId(presetId);
    applyCameraValues(caseCameraData.values);
    caseCameraAppliedRef.current = caseIdParam;
  }, [caseCameraData, cameraPresetOptions, caseIdParam, applyCameraValues, cameraPresetLoading]);

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
      const srcW = vid.videoWidth || 1280;
      const srcH = vid.videoHeight || 720;
      const targetW = 3840;
      const targetH = 2160;
      renderCanvasRef.current.width = targetW;
      renderCanvasRef.current.height = targetH;

      const ctx = renderCtxRef.current;
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.filter = camFilterRef.current;
      const { sx, sy, sw, sh } = getCropPixels(srcW, srcH);
      ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, targetW, targetH);
      ctx.filter = "none";

      renderLoopRef.current = requestAnimationFrame(draw);
    };

    stopRenderLoop();
    renderLoopRef.current = requestAnimationFrame(draw);
  }, [getCropPixels, stopRenderLoop]);

  const CameraAdjustControls = ({ onClose }: { onClose: () => void }) => {
    const presetValue = cameraPresetMode === "edit" ? "edit" : cameraPresetId;

    const handlePresetChange = (nextId: string) => {
      if (nextId === "edit") {
        setCameraPresetMode("edit");
        setCameraPresetName("edit");
        return;
      }
      if (!nextId) {
        setCameraPresetId("");
        setCameraPresetName("");
        return;
      }
      const preset = cameraPresetOptions.find((opt) => opt.id === nextId);
      if (!preset) return;
      setCameraPresetMode("preset");
      setCameraPresetId(preset.id);
      setCameraPresetName(preset.name);
      applyCameraValues(preset.values);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      applyCameraAdjust(preset.values.brightness, preset.values.sharpness);
    };

    const handleSaveCameraAdjust = () => {
      const deviceId = deviceSelected?.value;
      if (!deviceId) {
        alertErr("ต้องเลือกกล้องก่อนบันทึก");
        return;
      }
      const payload = {
        caseId: caseIdParam || "",
        camera_id: caseDetailView.camera_id || "",
        camera_name: caseDetailView.camera_name || "",
        brightness: camBrightness,
        contrast: camContrast,
        saturation: camSaturation,
        sharpness: camSharpness,
        cropLeft: camCropLeft,
        cropRight: camCropRight,
        cropTop: camCropTop,
        cropBottom: camCropBottom,
      };
      console.log(payload)

      try {
        updateCamera(payload);
        onClose();
        alertOk("บันทึกค่ากล้องแล้ว");
      } catch (err) {
        alertErr("บันทึกไม่สำเร็จ", err instanceof Error ? err.message : String(err));
      }
    };

    return (
      <div className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] text-white/70 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="uppercase tracking-[0.08em] text-[10px] text-white/60">Preset</span>
            <span className="text-white/40">{cameraPresetMode === "edit" ? "Edit" : cameraPresetName || "Preset"}</span>
          </div>
          {/* <select
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/90 outline-none"
            value={presetValue}
            onChange={(e) => handlePresetChange(e.target.value)}
            disabled={cameraPresetLoading}
          >
            <option value="" style={{ color: "#0f172a" }}>
              {cameraPresetLoading ? "กำลังโหลด..." : "เลือกพรีเซ็ต"}
            </option>
            <option value="edit" style={{ color: "#0f172a" }}>
              แก้ไขเอง
            </option>
            {cameraPresetOptions.map((opt) => (
              <option key={opt.id} value={opt.id} style={{ color: "#0f172a" }}>
                {opt.name}
              </option>
            ))}
          </select> */}
          {cameraPresetError && <div className="mt-2 text-[10px] text-rose-300">{cameraPresetError}</div>}
        </div>

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
                markCameraEdit();
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
              onChange: (v: number) => {
                markCameraEdit();
                setCamContrast(v);
              },
              suffix: "%",
            },
            {
              label: "Saturate",
              value: camSaturation,
              min: 0,
              max: 200,
              onChange: (v: number) => {
                markCameraEdit();
                setCamSaturation(v);
              },
              suffix: "%",
            },
            {
              label: "Sharp",
              value: camSharpness,
              min: 0,
              max: 100,
              onChange: (v: number) => {
                markCameraEdit();
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
              onChange: (v: number) => {
                markCameraEdit();
                setCamCropLeft(v);
              },
              suffix: "%",
            },
            {
              label: "Crop R",
              value: camCropRight,
              min: 0,
              max: 40,
              onChange: (v: number) => {
                markCameraEdit();
                setCamCropRight(v);
              },
              suffix: "%",
            },
            {
              label: "Crop T",
              value: camCropTop,
              min: 0,
              max: 40,
              onChange: (v: number) => {
                markCameraEdit();
                setCamCropTop(v);
              },
              suffix: "%",
            },
            {
              label: "Crop B",
              value: camCropBottom,
              min: 0,
              max: 40,
              onChange: (v: number) => {
                markCameraEdit();
                setCamCropBottom(v);
              },
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
        <div className="mt-3 flex items-center justify-end gap-2">
          <PillButton onClick={handleSaveCameraAdjust}>บันทึก</PillButton>
        </div>
      </div>
    );
  };

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
      const srcW = v.videoWidth || 1280;
      const srcH = v.videoHeight || 720;
      const targetW = 3840;
      const targetH = 2160;
      c.width = targetW;
      c.height = targetH;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.filter = camFilterRef.current;
      const { sx, sy, sw, sh } = getCropPixels(srcW, srcH);
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, targetW, targetH);
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
    camera_id: caseDetail?.camera_id || "",
    camera_name: caseDetail?.camera_name || "",
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
              onClick={savePhoto}
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
              <PillButton onClick={savePhoto} disabled={!streamRef.current || !canSave  || camAdjustOpen || videoCountdown !== null}>
                ถ่ายรูป (PNG)
              </PillButton>

              {!isRecording ? (
                <PillButton onClick={startVideo} disabled={!streamRef.current || !canSave || camAdjustOpen  || videoCountdown !== null}>
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
          <CameraAdjustControls onClose={() => setCamAdjustOpen(false)} />
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
