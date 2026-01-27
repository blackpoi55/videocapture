"use client";

import React from "react";

export default function RecommendationSpecimenSection() {
  return (
    <div className="space-y-4 text-[10px] text-gray-800 w-[800px]">

      {/* ================= RECOMMENDATION (FORM) ================= */}
      <div className="bg-[#b7cbe3] p-3 space-y-2">
        <div className="font-semibold text-blue-900 mb-1">
          RECOMMENDATION
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">

          <Checkbox label="Await for cytology result" />
          <Checkbox label="Medical treatment" />

          <div className="flex items-center gap-2">
            <Checkbox label="Stent exchange every" />
            <input className="input-xs w-12" />
            <span>month</span>
          </div>

          <Checkbox label="Consider for cholecystectomy" />

          <div className="flex items-center gap-2 col-span-2">
            <Checkbox label="Follow up" />
            <input className="input-xs w-16" />
            <span>within</span>
            <input className="input-xs w-16" />
            <Checkbox label="Review" />
            <input className="input-xs w-24" />
            <span>for abdomen</span>
          </div>

          <div className="flex items-center gap-2 col-span-2">
            <Checkbox label="Plan for" />
            <input className="input-xs w-24" />
            <span>in the</span>
            <input className="input-xs w-24" />
            <span>due to</span>
            <input className="input-xs flex-1" />
          </div>

          <div className="col-span-2">
            <Checkbox label="Other" />
            <textarea className="textarea-xs mt-1" rows={2} />
          </div>

        </div>
      </div>

      {/* ================= RECOMMENDATION (FREE TEXT) ================= */}
      <div>
        <div className="font-semibold text-blue-900 mb-1">
          RECOMMENDATION
        </div>
        <textarea className="textarea-xs" rows={3} />
      </div>

      {/* ================= SPECIMENS ================= */}
      <div className="bg-[#d9b88f] p-3 space-y-2">
        <div className="font-semibold text-gray-800">
          SPECIMENS
        </div>

        <div className="grid grid-cols-4 gap-y-2">
          <Checkbox label="Forceps biopsy" />
          <Checkbox label="Brush biopsy" />
          <Checkbox label="BAL" />
          <Checkbox label="TBB" />

          <Checkbox label="Gram stain" />
          <Checkbox label="AFB" />
          <Checkbox label="KOH" />
          <Checkbox label="Fungal c/s" />

          <Checkbox label="Routine culture" />
          <Checkbox label="TB c/s" />
          <Checkbox label="PCR for TB" />
          <Checkbox label="lipid laden macrophage" />

          <Checkbox label="hemosiderin laden macrophage" />
          <div className="flex items-center gap-2 col-span-2">
            <Checkbox label="Pathology" />
            <input className="input-xs flex-1" />
          </div>

          <div className="col-span-4 flex items-center gap-2">
            <Checkbox label="Other" />
            <input className="input-xs flex-1" />
          </div>
        </div>
      </div>

      {/* ================= BLOOD LOSS ================= */}
      <div className="bg-[#b7cbe3] p-3 flex items-center gap-2">
        <span className="text-red-600 font-semibold">*</span>
        <span>Estimated blood loss</span>
        <input className="input-xs w-16 text-center" defaultValue="0" />
        <span>ml.</span>
      </div>

      {/* ================= NOTE / COMMENTS ================= */}
      <div>
        <div className="font-semibold text-blue-900 mb-1">
          NOTE / COMMENTS
        </div>
        <textarea className="textarea-xs" rows={3} />
      </div>

      {/* ================= SIGNATURE ================= */}
      <div className="bg-[#b7cbe3] p-4 flex items-center justify-between">
        <div>
          Signature ....................................................
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" />
          Digital Sign
        </label>
      </div>

    </div>
  );
}

/* ================= SMALL UI ================= */

function Checkbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-1 whitespace-nowrap">
      <input type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

/* Tailwind helpers (ใช้ class เดียวกันทั้งหน้า) */
/*
.input-xs {
  @apply border px-1 py-[2px] text-[10px] bg-white;
}
.textarea-xs {
  @apply w-full border px-2 py-1 text-[10px] bg-white resize-none;
}
*/
