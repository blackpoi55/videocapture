"use client";

import React from "react";

/**
 * Highlighted Yellow Block – STRUCTURE + INPUTS (match original layout)
 * No data binding, no API, just exact layout + controls
 */
export default function HighlightedInputBlock() {
  return (
    <section className="w-[800px] rounded border bg-white text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex gap-4">
          <span className="cursor-pointer text-gray-600">collapse</span>
          <span className="cursor-pointer text-black">Expansion</span>
        </div>
        <span className="text-xs">⌃</span>
      </div>

      {/* Content */}
      <div className="grid grid-cols-[1fr_300px] gap-4 px-4 py-3 text-black">
        {/* LEFT */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Financial */}
          <Field label="Financial">
            <input className="input" defaultValue="ผู้ป่วย VIP Test" />
          </Field>

          {/* Appointment */}
          <Field label="Appointment date">
            <input className="input" defaultValue="12/09/2568 15:40" />
          </Field>

          {/* Endoscopist-1 */}
          <Field label="Endoscopist-1" required>
            <select className="input border border-gray-700">
              <option>ชาญ เทพอานนท์</option>
            </select>
          </Field>

          {/* Endoscopist-2 */}
          <Field label="Endoscopist-2">
            <select className="input border border-gray-700">
              <option></option>
            </select>
          </Field>

          {/* Consultant */}
          <Field label="Consultant" required>
            <select className="input border border-gray-700">
              <option>ชาญ เทพอานนท์</option>
            </select>
          </Field>

          {/* Nurse-1 */}
          <Field label="Nurse-1">
            <select className="input border border-gray-700">
              <option>สุเนตร บุญศรี</option>
            </select>
          </Field>

          {/* Nurse-2 */}
          <Field label="Nurse-2">
            <select className="input border border-gray-700">
              <option>คุม กิจจิริปัญญา</option>
            </select>
          </Field>

          {/* Instrument */}
          <Field label="Instrument" required>
            <select className="input border border-gray-700">
              <option>PT_S24FE</option>
            </select>
          </Field>

          {/* Anesthesist */}
          <Field label="Anesthesist" required>
            <select className="input border border-gray-700">
              <option>ชาญ พงษ์เทพ</option>
            </select>
          </Field>

          {/* Operation Time */}
          <div className="col-span-2 flex items-end gap-2">
            <span>Operation time From</span>
            <input type="time" className="input w-[90px] border border-gray-700" defaultValue="15:58" />
            <span>To</span>
            <input type="time" className="input w-[90px] border border-gray-700" defaultValue="16:00" />
            <span className="text-base">✂️</span>
          </div>
        </div>

        {/* RIGHT – IMAGE PLACEHOLDER */}
        <div className="flex flex-col items-center justify-center border">
          <div className="h-[200px] w-full" />
          <div className="mt-1 text-[10px] text-gray-400">Lower GI Tract Image</div>
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
      <div className="mb-0.5 text-[10px]">
        {required && <span className="mr-0.5 text-red-500">*</span>}
        {label}
      </div>
      {children}
    </div>
  );
}

/* Tailwind helper (global)
.input { @apply w-full rounded-sm border px-2 py-1 text-[11px]; }
*/