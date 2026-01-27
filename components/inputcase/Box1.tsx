"use client";

import React from "react";

/**
 * Highlighted Yellow Block – STRUCTURE + INPUTS (match original layout)
 * No data binding, no API, just exact layout + controls
 */
export default function HighlightedInputBlock() {
  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
  return (
    <section className="w-[860px] rounded-[28px] border border-white/10 bg-slate-900/70 shadow-[0_30px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl">
      
      {/* Content */}
      <div className="grid gap-6 px-6 py-6 text-white/80">
        {/* LEFT */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {/* Financial */}
          <Field label="Financial">
            <input className={inputClass} defaultValue="ผู้ป่วย VIP Test" />
          </Field>

          {/* Appointment */}
          <Field label="Appointment date">
            <input className={inputClass} defaultValue="12/09/2568 15:40" />
          </Field>

          {/* Endoscopist-1 */}
          <Field label="Endoscopist-1" required>
            <select className={inputClass}>
              <option>ชาญ เทพอานนท์</option>
            </select>
          </Field>

          {/* Endoscopist-2 */}
          <Field label="Endoscopist-2">
            <select className={inputClass}>
              <option></option>
            </select>
          </Field>

          {/* Consultant */}
          <Field label="Consultant" required>
            <select className={inputClass}>
              <option>ชาญ เทพอานนท์</option>
            </select>
          </Field>

          {/* Nurse-1 */}
          <Field label="Nurse-1">
            <select className={inputClass}>
              <option>สุเนตร บุญศรี</option>
            </select>
          </Field>

          {/* Nurse-2 */}
          <Field label="Nurse-2">
            <select className={inputClass}>
              <option>คุม กิจจิริปัญญา</option>
            </select>
          </Field>

          {/* Instrument */}
          <Field label="Instrument" required>
            <select className={inputClass}>
              <option>PT_S24FE</option>
            </select>
          </Field>

          {/* Anesthesist */}
          <Field label="Anesthesist" required>
            <select className={inputClass}>
              <option>ชาญ พงษ์เทพ</option>
            </select>
          </Field>

          {/* Operation Time */}
          <div className="col-span-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">Operation Time</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
              <span>From</span>
              <input type="time" className={`${inputClass} w-[120px]`} defaultValue="15:58" />
              <span>To</span>
              <input type="time" className={`${inputClass} w-[120px]`} defaultValue="16:00" />
              <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-200">Auto</span>
            </div>
          </div>
        </div>
 
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
        {required && <span className="mr-1 text-rose-500">*</span>}
        {label}
      </div>
      {children}
    </div>
  );
}
