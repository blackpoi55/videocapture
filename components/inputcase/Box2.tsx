"use client";

import React from "react";

/**
 * ANESTHESIA + MEDICATION + INDICATION
 * Layout-only but with real inputs (match screenshot)
 * Can be imported as a standalone block
 */
export default function CRAnesthesiaMedicationBlock() {
  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
  const sectionTitle =
    "text-[11px] uppercase tracking-[0.22em] text-white/50 font-semibold";
  return (
    <section className="w-[860px] text-[12px]">
      {/* ANESTHESIA */}
      <div className="rounded-t-[24px] border border-white/10 bg-slate-900/70 px-6 py-4 shadow-[0_18px_50px_rgba(2,6,23,0.5)]">
        <div className={sectionTitle}>Anesthesia</div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-white/70">
          <Check label="Topical" defaultChecked />
          <Check label="IV sedation" defaultChecked />
          <Check label="ET intubation" />
          <Check label="Tracheostomy" />
        </div>

        <div className="mt-3 flex items-center gap-2 text-white/70">
          <Check label="Other" />
          <input className={`${inputClass} w-[360px]`} />
        </div>
      </div>

      {/* MEDICATION */}
      <div className="border-x border-white/10 bg-slate-950/70 px-6 py-4 text-white/70">
        <div className={sectionTitle}>Medication</div>

        <div className="mt-3 grid grid-cols-3 gap-y-3">
          <MedRow label="Buscopan" unit="mg." checked value="15" />
          <MedRow label="Domicum" unit="mg." />
          <MedRow label="Propofol" unit="mg." />

          <MedRow label="Pethidine" unit="mg." />
          <MedRow label="Fentanyl" unit="mcg." />
          <MedRow label="" unit="" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Check label="Other" />
          <input className={inputClass} />
        </div>
      </div>

      {/* INDICATION */}
      <div className="rounded-b-[24px] border border-white/10 bg-slate-900/70 px-6 py-4 shadow-[0_18px_50px_rgba(2,6,23,0.5)]">
        <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/50">
          <span className="mr-1 text-rose-400">*</span>
          INDICATION
        </div>
        <input
          className={`${inputClass} text-rose-200`}
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
    <label className="flex items-center gap-2 text-[12px] text-white/70">
      <input type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 rounded border-white/20 accent-teal-500" />
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
    <div className="flex items-center gap-2 text-[12px] text-white/70">
      {label && <input type="checkbox" defaultChecked={checked} className="h-4 w-4 rounded border-white/20 accent-teal-500" />}
      <span className="w-[80px]">{label}</span>
      <input
        className="w-[60px] rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        defaultValue={value}
      />
      <span className="w-[36px] text-white/50">{unit}</span>
    </div>
  );
}
