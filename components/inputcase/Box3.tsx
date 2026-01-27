"use client";

import React from "react";

/**
 * PRE-DIAGNOSIS (Dx1–Dx3)
 * Layout + inputs to match screenshot
 * Standalone component for report pages
 */
export default function CRPreDiagnosisBlock() {
  return (
    <section className="w-[800px] bg-[#b7cbe3] px-4 py-3 text-[11px]">
      <div className="grid grid-cols-[160px_1fr_24px] gap-y-2 items-center">
        {/* Dx1 */}
        <Label required>Pre-diagnosis (Dx1)</Label>
        <input
          className="input text-gray-700 bg-white text-left"
          defaultValue="Enteroinvasive Escherichia coli infection - A04.2"
        />
        <Icon />

        {/* Dx2 */}
        <Label>Pre-diagnosis (Dx2)</Label>
        <input className="input text-gray-700 bg-white text-left" defaultValue="Dyspepsia (ท้องอืด)" />
        <Icon />

        {/* Dx3 */}
        <Label>Pre-diagnosis (Dx3)</Label>
        <input className="input text-gray-700 bg-white text-left" defaultValue="Dyspepsia (ท้องอืด)" />
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
    <div className="text-left pr-2 text-gray-700">
      {required && <span className="mr-1 text-red-600">*</span>}
      {children}
    </div>
  );
}

function Icon() {
  return (
    <div className="flex items-center justify-start">
      <div className="h-4 w-4 rounded-sm border bg-white" />
    </div>
  );
}

/* Tailwind helper (global)
.input { @apply w-full rounded-sm border px-2 py-1 text-[11px]; }
*/