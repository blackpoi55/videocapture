"use client";
import React from "react";

/* ---------- Reuse from before ---------- */

function Field({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr]">
      <div className="font-semibold text-blue-900">
        {label} :
      </div>
      {/* <div className="border-b border-black h-5" /> */}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 ">
      <div className="font-semibold text-blue-900">
        {title}
      </div>
      <div className="ml-3 text-green-600 text-sm leading-relaxed text-[9px]">
        {children}
      </div>
    </div>
  );
}

/* ---------- FINDINGS PART ---------- */

export default function FindingsSection() {
  return (
    <div className="space-y-1 text-[9px] text-green-800">

      <Section title="FINDINGS">
        ANAL CANAL :  <br />
        RECTUM :  <br />
        SIGMOID COLON :  <br />
        DESCENDING COLON :  <br />
        SPLENIC FLEXURE :  <br />
        TRANSVERSE COLON :  <br />
        HEPATIC FLEXURE :  <br />
        ASCENDING COLON :  <br />
        CECUM :  <br />
        TERMINAL ILEUM : 
      </Section>

      <Field label="PROCEDURES" />
      <Field label="PRINCIPAL PROCEDURE" />

      <Section title="POST-DIAGNOSIS">
        (Dx1) Normal colonoscopy
      </Section>

      <Field label="COMPLICATION" />
      <Field label="HISTOPATHOLOGY" />

    </div>
  );
}
