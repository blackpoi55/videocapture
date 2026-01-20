"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const sections = [
  { id: "master", title: "Master", subtitle: "ข้อมูลหน่วยงานและแบรนด์" },
  { id: "camera", title: "Camera Preset", subtitle: "พรีเซ็ตปรับภาพเริ่มต้น" },
  { id: "storage", title: "Storage", subtitle: "โฟลเดอร์และรูปแบบไฟล์" },
  { id: "access", title: "Access", subtitle: "สิทธิ์และผู้ใช้งาน" },
] as const;

type SectionId = (typeof sections)[number]["id"];

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
};

const MasterSection = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold">Master</h2>
      <p className="text-sm text-slate-500">ข้อมูลหลักที่ใช้แสดงบนรายงานและเอกสาร</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        ชื่อหน่วยงาน
        <input
          type="text"
          placeholder="Intraview Medical Center"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        สาขา
        <input
          type="text"
          placeholder="Bangkok Clinic"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        เบอร์ติดต่อ
        <input
          type="text"
          placeholder="02-123-4567"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        โลโก้ (URL)
        <input
          type="text"
          placeholder="https://..."
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
    </div>

    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
      ข้อความท้ายรายงาน
      <textarea
        rows={3}
        placeholder="หมายเหตุสำหรับรายงานที่ส่งให้คนไข้..."
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
      />
    </label>
  </div>
);

const StorageSection = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold">Storage</h2>
      <p className="text-sm text-slate-500">ตำแหน่งจัดเก็บและรูปแบบไฟล์</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        โฟลเดอร์ต้นฉบับ
        <input
          type="text"
          placeholder="D:\\Capture\\Original"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        โฟลเดอร์เลือกแล้ว
        <input
          type="text"
          placeholder="D:\\Capture\\Choose"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        รูปแบบชื่อไฟล์
        <input
          type="text"
          placeholder="HN_DATE_SEQ"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        ความละเอียดภาพเริ่มต้น
        <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20">
          <option>1920 x 1080</option>
          <option>1280 x 720</option>
          <option>3840 x 2160</option>
        </select>
      </label>
    </div>
  </div>
);

const AccessSection = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold">Access</h2>
      <p className="text-sm text-slate-500">จัดการสิทธิ์และผู้ใช้งาน</p>
    </div>

    <div className="space-y-3">
      {[
        { name: "Admin", detail: "เข้าถึงทุกเมนู และจัดการระบบ" },
        { name: "Staff", detail: "ใช้งานถ่ายภาพและจัดการรายงาน" },
        { name: "Viewer", detail: "ดูรายงานเท่านั้น" },
      ].map((role) => (
        <div
          key={role.name}
          className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3"
        >
          <div>
            <div className="text-sm font-semibold text-slate-700">{role.name}</div>
            <div className="text-xs text-slate-500">{role.detail}</div>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 hover:border-teal-300 hover:text-teal-600"
          >
            จัดการ
          </button>
        </div>
      ))}
    </div>
  </div>
);

const CameraSection = ({ active }: { active: boolean }) => {
  const [cameraPresets, setCameraPresets] = useState<CameraPreset[]>([
    {
      id: "default",
      name: "Default",
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
  ]);
  const [activePresetId, setActivePresetId] = useState("default");
  const activePreset = useMemo(
    () => cameraPresets.find((preset) => preset.id === activePresetId) ?? cameraPresets[0],
    [activePresetId, cameraPresets]
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const autoStartedRef = useRef(false);

  const updateActivePresetValue = (key: keyof CameraPresetValues, value: number) => {
    setCameraPresets((prev) =>
      prev.map((preset) =>
        preset.id === activePresetId ? { ...preset, values: { ...preset.values, [key]: value } } : preset
      )
    );
  };

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
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  preset.id === activePresetId
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
                { id: nextId, name: `Preset ${prev.length + 1}`, values: { ...base.values } },
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
                className="rounded-full border border-teal-300/50 bg-teal-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-700 hover:bg-teal-500/20"
              >
                บันทึกพรีเซ็ต
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraPresets((prev) => {
                    const next = prev.filter((preset) => preset.id !== activePresetId);
                    const nextActive = next[0]?.id ?? prev[0]?.id ?? activePresetId;
                    setActivePresetId(nextActive);
                    return next;
                  });
                }}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 hover:border-slate-300"
                disabled={cameraPresets.length <= 1}
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
            <button
              type="button"
              className="rounded-full border border-teal-300/50 bg-teal-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-700 hover:bg-teal-500/20"
            >
              บันทึกทั้งหมด
            </button>
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
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
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

            <div className="mt-6 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-xs text-slate-500">
              แก้ไขล่าสุด: วันนี้ · 09:42
            </div>
          </aside>

          <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className={active === "master" ? "block" : "hidden"}>
              <MasterSection />
            </div>
            <div className={active === "camera" ? "block" : "hidden"}>
              <CameraSection active={active === "camera"} />
            </div>
            <div className={active === "storage" ? "block" : "hidden"}>
              <StorageSection />
            </div>
            <div className={active === "access" ? "block" : "hidden"}>
              <AccessSection />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
