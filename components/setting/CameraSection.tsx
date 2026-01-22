"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { deletecamerapreset, getcamerapreset, postcamerapreset, putcamerapreset } from "@/action/api";

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

type CameraPreset = {
  id: string;
  name: string;
  values: CameraPresetValues;
  origin?: "local" | "remote";
};

const DEFAULT_CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "default",
    name: "Default",
    origin: "local",
    values: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sharpness: 50,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
    },
  },
  {
    id: "soft",
    name: "Soft Light",
    origin: "local",
    values: {
      brightness: 110,
      contrast: 90,
      saturation: 95,
      sharpness: 40,
      cropLeft: 4,
      cropRight: 4,
      cropTop: 2,
      cropBottom: 2,
    },
  },
];

const cloneCameraPreset = (preset: CameraPreset): CameraPreset => ({
  ...preset,
  values: { ...preset.values },
});

const getDefaultCameraPresets = () => DEFAULT_CAMERA_PRESETS.map(cloneCameraPreset);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseValuesObject = (value: unknown): Record<string, unknown> | null => {
  if (isRecord(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : null;
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

const toText = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
};

const normalizeCameraPreset = (
  row: Record<string, unknown>,
  index: number,
  fallbackValues: CameraPresetValues
): CameraPreset => {
  const valuesObject =
    parseValuesObject(row.values ?? row.value ?? row.config ?? row.setting ?? row.settings) ?? {};
  const source = { ...row, ...valuesObject };
  const values: CameraPresetValues = {
    brightness: toNumber(source.brightness ?? source.bright, fallbackValues.brightness),
    contrast: toNumber(source.contrast, fallbackValues.contrast),
    saturation: toNumber(source.saturation ?? source.saturate, fallbackValues.saturation),
    sharpness: toNumber(source.sharpness, fallbackValues.sharpness),
    cropLeft: toNumber(source.cropLeft ?? source.crop_left ?? source.cropleft, fallbackValues.cropLeft),
    cropRight: toNumber(source.cropRight ?? source.crop_right ?? source.cropright, fallbackValues.cropRight),
    cropTop: toNumber(source.cropTop ?? source.crop_top ?? source.croptop, fallbackValues.cropTop),
    cropBottom: toNumber(source.cropBottom ?? source.crop_bottom ?? source.cropbottom, fallbackValues.cropBottom),
  };
  const id =
    toText(row.id ?? row.cameraid ?? row.presetid ?? row.cameraPresetId) || `preset-${index + 1}`;
  const name = toText(row.name ?? row.presetname ?? row.label ?? row.title) || `Preset ${index + 1}`;
  return { id, name, values, origin: "remote" };
};

const normalizeCameraPresets = (data: unknown): CameraPreset[] => {
  const rows = Array.isArray(data) ? data : isRecord(data) ? [data] : [];
  if (rows.length === 0) return getDefaultCameraPresets();
  const fallbackValues = DEFAULT_CAMERA_PRESETS[0]?.values ?? {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 50,
    cropLeft: 0,
    cropRight: 0,
    cropTop: 0,
    cropBottom: 0,
  };
  const mapped = rows.map((row, index) =>
    normalizeCameraPreset(isRecord(row) ? row : {}, index, fallbackValues)
  );
  return mapped.length ? mapped : getDefaultCameraPresets();
};

const detectCameraPresetShape = (rows: Record<string, unknown>[]) => {
  let sawNested = false;
  let sawFlat = false;
  let keyMode: "camel" | "snake" = "camel";
  let nameKey: "name" | "presetname" = "name";
  const flatKeys = [
    "brightness",
    "contrast",
    "saturation",
    "sharpness",
    "cropLeft",
    "cropRight",
    "cropTop",
    "cropBottom",
    "crop_left",
    "crop_right",
    "crop_top",
    "crop_bottom",
  ];
  for (const row of rows) {
    const valuesObject = parseValuesObject(row.values ?? row.value ?? row.config ?? row.setting ?? row.settings);
    if (valuesObject) sawNested = true;
    if (flatKeys.some((key) => key in row)) sawFlat = true;
    const keySource = valuesObject ?? row;
    if ("crop_left" in keySource || "crop_right" in keySource || "crop_top" in keySource || "crop_bottom" in keySource) {
      keyMode = "snake";
    }
    if (!("name" in row) && "presetname" in row) {
      nameKey = "presetname";
    }
  }
  const payloadMode: "flat" | "nested" = sawNested ? "nested" : sawFlat ? "flat" : "nested";
  return { payloadMode, keyMode, nameKey };
};

const serializePresetValues = (values: CameraPresetValues, keyMode: "camel" | "snake") => {
  if (keyMode === "snake") {
    return {
      brightness: values.brightness,
      contrast: values.contrast,
      saturation: values.saturation,
      sharpness: values.sharpness,
      crop_left: values.cropLeft,
      crop_right: values.cropRight,
      crop_top: values.cropTop,
      crop_bottom: values.cropBottom,
    };
  }
  return { ...values };
};

export const CameraSection = ({ active }: { active: boolean }) => {
  const [cameraPresets, setCameraPresets] = useState<CameraPreset[]>(() => getDefaultCameraPresets());
  const [activePresetId, setActivePresetId] = useState("default");
  const activePreset = useMemo(
    () => cameraPresets.find((preset) => preset.id === activePresetId) ?? cameraPresets[0],
    [activePresetId, cameraPresets]
  );
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [payloadMode, setPayloadMode] = useState<"flat" | "nested">("nested");
  const [keyMode, setKeyMode] = useState<"camel" | "snake">("camel");
  const [nameKey, setNameKey] = useState<"name" | "presetname">("name");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const autoStartedRef = useRef(false);
  const presetsLoadedRef = useRef(false);

  const updateActivePresetValue = (key: keyof CameraPresetValues, value: number) => {
    setCameraPresets((prev) =>
      prev.map((preset) =>
        preset.id === activePresetId ? { ...preset, values: { ...preset.values, [key]: value } } : preset
      )
    );
  };

  const loadCameraPresets = useCallback(async () => {
    setPresetLoading(true);
    setPresetError(null);
    try {
      const response = await getcamerapreset();
      if ((response as { error?: unknown })?.error) {
        setPresetError((response as { message?: string })?.message || "Unable to load presets.");
        return;
      }
      const raw = (response as { data?: unknown })?.data ?? response;
      const rows = Array.isArray(raw) ? raw : isRecord(raw) ? [raw] : [];
      if (rows.length === 0) return;
      const recordRows = rows.filter(isRecord);
      if (recordRows.length > 0) {
        const shape = detectCameraPresetShape(recordRows);
        setPayloadMode(shape.payloadMode);
        setKeyMode(shape.keyMode);
        setNameKey(shape.nameKey);
      }
      const normalized = normalizeCameraPresets(rows);
      setCameraPresets(normalized);
      setActivePresetId((prev) => normalized.find((preset) => preset.id === prev)?.id ?? normalized[0]?.id ?? "");
    } finally {
      setPresetLoading(false);
    }
  }, []);

  const buildPresetPayload = useCallback(
    (preset: CameraPreset) => {
      const values = serializePresetValues(preset.values, keyMode);
      const nameField = nameKey === "presetname" ? "presetname" : "name";
      if (payloadMode === "flat") {
        return { [nameField]: preset.name, ...values };
      }
      return { [nameField]: preset.name, values };
    },
    [keyMode, nameKey, payloadMode]
  );

  const handleSavePreset = useCallback(async () => {
    if (!activePreset) return;
    setPresetError(null);
    setPresetSaving(true);
    Swal.fire({
      title: "กำลังบันทึก...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const payload = buildPresetPayload(activePreset);
      const response =
        activePreset.origin === "remote"
          ? await putcamerapreset(activePreset.id, payload)
          : await postcamerapreset(payload);
      if ((response as { error?: unknown })?.error) {
        const message = (response as { message?: string })?.message || "Unable to save preset.";
        setPresetError(message);
        Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: message });
        return;
      }
      const raw = (response as { data?: unknown })?.data ?? response;
      if (Array.isArray(raw)) {
        const normalized = normalizeCameraPresets(raw);
        setCameraPresets(normalized);
        setActivePresetId((prev) => normalized.find((preset) => preset.id === prev)?.id ?? normalized[0]?.id ?? "");
        Swal.fire({ icon: "success", title: "บันทึกเรียบร้อย" });
        return;
      }
      if (isRecord(raw)) {
        const normalized = normalizeCameraPreset(raw, 0, activePreset.values);
        setCameraPresets((prev) =>
          prev.map((preset) => (preset.id === activePreset.id ? normalized : preset))
        );
        setActivePresetId(normalized.id);
        Swal.fire({ icon: "success", title: "บันทึกเรียบร้อย" });
        return;
      }
      setCameraPresets((prev) =>
        prev.map((preset) =>
          preset.id === activePreset.id ? { ...preset, origin: "remote" } : preset
        )
      );
      Swal.fire({ icon: "success", title: "บันทึกเรียบร้อย" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save preset.";
      setPresetError(message);
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: message });
    } finally {
      setPresetSaving(false);
    }
  }, [activePreset, buildPresetPayload]);

  const handleDeletePreset = useCallback(async () => {
    if (!activePreset || cameraPresets.length <= 1) return;
    const confirm = await Swal.fire({
      title: "ลบพรีเซ็ตนี้?",
      text: activePreset.name,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirm.isConfirmed) return;

    setPresetError(null);
    setPresetSaving(true);
    Swal.fire({
      title: "กำลังลบ...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      if (activePreset.origin === "remote") {
        const response = await deletecamerapreset(activePreset.id);
        if ((response as { error?: unknown })?.error) {
          const message = (response as { message?: string })?.message || "Unable to delete preset.";
          setPresetError(message);
          Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: message });
          return;
        }
      }

      setCameraPresets((prev) => {
        const next = prev.filter((preset) => preset.id !== activePreset.id);
        const safeNext = next.length ? next : getDefaultCameraPresets();
        setActivePresetId(safeNext[0]?.id ?? "");
        return safeNext;
      });
      Swal.fire({ icon: "success", title: "ลบเรียบร้อย" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete preset.";
      setPresetError(message);
      Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: message });
    } finally {
      setPresetSaving(false);
    }
  }, [activePreset, cameraPresets.length]);

  useEffect(() => {
    if (!active || presetsLoadedRef.current) return;
    presetsLoadedRef.current = true;
    void loadCameraPresets();
  }, [active, loadCameraPresets]);

  const previewFilter = useMemo(() => {
    const values = activePreset?.values;
    if (!values) return "none";
    return `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturation}%)`;
  }, [activePreset]);

  const previewCropTransform = useMemo(() => {
    const values = activePreset?.values;
    if (!values) return "none";
    const clamp = (v: number) => Math.max(0, Math.min(60, v));
    const l = clamp(values.cropLeft) / 100;
    const r = clamp(values.cropRight) / 100;
    const t = clamp(values.cropTop) / 100;
    const b = clamp(values.cropBottom) / 100;
    const wFactor = Math.max(0.05, 1 - l - r);
    const hFactor = Math.max(0.05, 1 - t - b);
    const sx = 1 / wFactor;
    const sy = 1 / hFactor;
    const tx = -l * sx * 100;
    const ty = -t * sy * 100;
    return `translate(${tx}%, ${ty}%) scale(${sx}, ${sy})`;
  }, [activePreset]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  const listDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const cams = all.filter((device) => device.kind === "videoinput");
    console.log("cams", cams);
    setDevices(cams);
    if (!deviceId && cams[0]) setDeviceId(cams[0].deviceId);
  }, [deviceId]);

  const startCamera = useCallback(
    async (overrideId?: string) => {
      try {
        setCameraError(null);
        stopCamera();
        const targetId = overrideId ?? deviceId;
        const constraints: MediaStreamConstraints = {
          video: targetId ? { deviceId: { exact: targetId } } : true,
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const track = stream.getVideoTracks()[0];
        const actualId = track?.getSettings().deviceId;
        if (actualId && actualId !== deviceId) setDeviceId(actualId);
        setCameraOn(true);
        await listDevices();
      } catch (err) {
        console.error(err);
        setCameraError("ไม่สามารถเปิดกล้องได้");
        stopCamera();
      }
    },
    [deviceId, listDevices, stopCamera]
  );

  useEffect(() => {
    listDevices();
    const handler = () => listDevices();
    navigator.mediaDevices?.addEventListener("devicechange", handler);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", handler);
  }, [listDevices]);

  useEffect(() => {
    if (!active) {
      stopCamera();
      autoStartedRef.current = false;
      return;
    }
    if (!autoStartedRef.current) {
      autoStartedRef.current = true;
      startCamera();
    }
  }, [active, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Camera Preset</h2>
        <p className="text-sm text-slate-500">ค่าเริ่มต้นเมื่อเปิดกล้องเพื่อถ่ายภาพ</p>
        {presetLoading && <p className="mt-2 text-xs text-slate-400">Loading presets...</p>}
        {presetError && <p className="mt-2 text-xs text-rose-500">{presetError}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.26em] text-slate-400">
            <span>Presets</span>
            <span>{cameraPresets.length}</span>
          </div>
          <div className="space-y-2">
            {cameraPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setActivePresetId(preset.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${preset.id === activePresetId
                  ? "border-teal-400/60 bg-white text-slate-900 shadow-[0_12px_24px_rgba(20,184,166,0.18)]"
                  : "border-transparent bg-transparent text-slate-600 hover:border-white hover:bg-white/70"
                  }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const nextId = `preset-${Date.now()}`;
              const base = activePreset ?? cameraPresets[0];
              setCameraPresets((prev) => [
                ...prev,
                { id: nextId, name: `Preset ${prev.length + 1}`, values: { ...base.values }, origin: "local" },
              ]);
              setActivePresetId(nextId);
            }}
            className="w-full rounded-full border border-teal-300/50 bg-teal-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-700 hover:bg-teal-500/20"
          >
            เพิ่มพรีเซ็ต
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr] xl:grid-cols-[460px_1fr]">
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.26em] text-slate-400">
              <span>Live Preview</span>
              <button
                type="button"
                onClick={() => (cameraOn ? stopCamera() : startCamera())}
                className="rounded-full border border-teal-300/50 bg-teal-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-700 hover:bg-teal-500/20"
              >
                {cameraOn ? "หยุดกล้อง" : "เปิดกล้อง"}
              </button>
            </div>

            <label className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              เลือกกล้อง
              <select
                value={deviceId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setDeviceId(nextId);
                  if (cameraOn) startCamera(nextId);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
              >
                {devices.length === 0 && <option value="">ไม่พบกล้อง</option>}
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>

            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400">
                  Camera Off
                </div>
              )}
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                style={{ transform: previewCropTransform, transformOrigin: "top left", filter: previewFilter }}
                muted
                playsInline
              />
            </div>
            {cameraError && <div className="text-[11px] text-rose-500">{cameraError}</div>}
          </div>

          <div className="space-y-5">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
              ชื่อพรีเซ็ต
              <input
                type="text"
                value={activePreset?.name ?? ""}
                onChange={(e) => {
                  const name = e.target.value;
                  setCameraPresets((prev) =>
                    prev.map((preset) => (preset.id === activePresetId ? { ...preset, name } : preset))
                  );
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
              />
            </label>

            <div className="grid gap-4">
              {[
                { id: "brightness", label: "Brightness", min: 0, max: 200, suffix: "%" },
                { id: "contrast", label: "Contrast", min: 50, max: 200, suffix: "%" },
                { id: "saturation", label: "Saturation", min: 50, max: 200, suffix: "%" },
                { id: "sharpness", label: "Sharpness", min: 0, max: 100, suffix: "" },
                { id: "cropLeft", label: "Crop L", min: 0, max: 40, suffix: "%" },
                { id: "cropRight", label: "Crop R", min: 0, max: 40, suffix: "%" },
                { id: "cropTop", label: "Crop T", min: 0, max: 40, suffix: "%" },
                { id: "cropBottom", label: "Crop B", min: 0, max: 40, suffix: "%" },
              ].map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {activePreset?.values[item.id as keyof CameraPresetValues]}
                      {item.suffix}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_70px] items-center gap-3">
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      value={activePreset?.values[item.id as keyof CameraPresetValues] ?? 0}
                      onChange={(e) =>
                        updateActivePresetValue(item.id as keyof CameraPresetValues, Number(e.target.value))
                      }
                      className="w-full accent-teal-500"
                    />
                    <input
                      type="number"
                      min={item.min}
                      max={item.max}
                      value={activePreset?.values[item.id as keyof CameraPresetValues] ?? 0}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        if (Number.isNaN(raw)) return;
                        const clamped = Math.min(item.max, Math.max(item.min, raw));
                        updateActivePresetValue(item.id as keyof CameraPresetValues, clamped);
                      }}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-right text-xs outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={presetSaving || !activePreset}
                className="rounded-full border border-teal-300/50 bg-teal-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-700 hover:bg-teal-500/20"
              >
                บันทึกพรีเซ็ต
              </button>
              <button
                type="button"
                onClick={handleDeletePreset}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 hover:border-slate-300"
                disabled={presetSaving || cameraPresets.length <= 1}
              >
                ลบพรีเซ็ต
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
