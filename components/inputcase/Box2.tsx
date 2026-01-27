"use client";

import React from "react";

/**
 * ANESTHESIA + MEDICATION + INDICATION
 * Layout-only but with real inputs (match screenshot)
 * Can be imported as a standalone block
 */
export default function CRAnesthesiaMedicationBlock() {
  return (
    <section className="w-[800px] text-[11px]">
      {/* ANESTHESIA */}
      <div className="bg-[#b7cbe3] px-4 py-3">
        <div className="mb-2 font-semibold uppercase text-gray-600">Anesthesia</div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600">
          <Check label="Topical" defaultChecked />
          <Check label="IV sedation" defaultChecked />
          <Check label="ET intubation" />
          <Check label="Tracheostomy" />
        </div>

        <div className="mt-2 flex items-center gap-2 text-gray-600">
          <Check label="Other" />
          <input className="input w-[360px] bg-white shadow-sm" />
        </div>
      </div>

      {/* MEDICATION */}
      <div className="bg-[#6f7f8e] px-4 py-3 text-gray-600 ">
        <div className="mb-2 font-semibold uppercase">Medication</div>

        <div className="grid grid-cols-3 gap-y-2">
          <MedRow label="Buscopan" unit="mg." checked value="15" />
          <MedRow label="Domicum" unit="mg." />
          <MedRow label="Propofol" unit="mg." />

          <MedRow label="Pethidine" unit="mg." />
          <MedRow label="Fentanyl" unit="mcg." />
          <MedRow label="" unit="" />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Check label="Other" />
          <input className="input w-full bg-white shadow-sm" />
        </div>
      </div>

      {/* INDICATION */}
      <div className="bg-[#b7cbe3] px-4 py-3">
        <div className="mb-1 font-semibold text-gray-600">
          <span className="mr-1 text-red-600">*</span>
          INDICATION
        </div>
        <input
          className="input w-full bg-white shadow-sm text-red-300"
          defaultValue="Enteroinvasive Escherichia coli infection A04.2"
        />
      </div>
    </section>
  );
}

/* ===== helpers ===== */
function Check({
  label,
  defaultChecked,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-1">
      <input type="checkbox" defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}

function MedRow({
  label,
  unit,
  checked,
  value,
}: {
  label: string;
  unit: string;
  checked?: boolean;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {label && <input type="checkbox" defaultChecked={checked} />}
      <span className="w-[70px]">{label}</span>
      <input
        className="input w-[40px] text-black"
        defaultValue={value}
      />
      <span className="w-[30px]">{unit}</span>
    </div>
  );
}

/* Tailwind helper (global)
.input { @apply rounded-sm border px-1 py-0.5 text-[11px]; }
*/