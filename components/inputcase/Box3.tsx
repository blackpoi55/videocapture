"use client";

import React from "react";

/**
 * PRE-DIAGNOSIS (Dx1–Dx3)
 * Layout + inputs to match screenshot
 * Standalone component for report pages
 */
export default function CRPreDiagnosisBlock() {
  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
  return (
    <section className="w-[920px] rounded-[24px] border border-white/10 bg-slate-900/70 px-6 py-4 text-[12px] shadow-[0_18px_50px_rgba(2,6,23,0.55)]">
      <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/50">Pre-diagnosis</div>
      <div className="grid grid-cols-[180px_1fr_28px] gap-y-3 items-center">
        {/* Dx1 */}
        <Label required>Pre-diagnosis (Dx1)</Label>
        <input
          className={inputClass}
          defaultValue="Enteroinvasive Escherichia coli infection - A04.2"
        />
        <Icon />

        {/* Dx2 */}
        <Label>Pre-diagnosis (Dx2)</Label>
        <input className={inputClass} defaultValue="Dyspepsia (ท้องอืด)" />
        <Icon />

        {/* Dx3 */}
        <Label>Pre-diagnosis (Dx3)</Label>
        <input className={inputClass} defaultValue="Dyspepsia (ท้องอืด)" />
        <Icon />
      </div>
    </section>
  );
}

/* ===== helpers ===== */
function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="text-left pr-2 text-white/70">
      {required && <span className="mr-1 text-rose-400">*</span>}
      {children}
    </div>
  );
}

function Icon() {
  return (
    <div className="flex items-center justify-start">
      <div className="h-4 w-4 rounded-sm border border-white/10 bg-slate-950" />
    </div>
  );
}
