"use client";

import React from "react";

export default function RecommendationSpecimenSection() {
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
  const textareaClass =
    "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3.5 py-3 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20 resize-none";
  const labelClass = "text-[11px] uppercase tracking-[0.18em] text-white/50";
  return (
    <div className="relative mx-auto w-full max-w-[920px] text-[12px] text-white/80">
      <div className="pointer-events-none absolute -top-20 left-0 h-[240px] w-[240px] rounded-full bg-emerald-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-[260px] w-[260px] rounded-full bg-indigo-500/15 blur-[140px]" />

      <div className="relative rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_30px_80px_rgba(2,6,23,0.6)] backdrop-blur-[24px]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className={labelClass}>Endoscopy Report</div>
            <h2 className="text-[22px] font-semibold text-white">Recommendation & Specimens</h2>
          </div>
          <div className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/60">
            Summary
          </div>
        </div>

        {/* ================= RECOMMENDATION (FORM) ================= */}
        <Section title="Recommendation (form)">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">

            <Checkbox label="Await for cytology result" />
            <Checkbox label="Medical treatment" />

            <div className="flex items-center gap-2">
              <Checkbox label="Stent exchange every" />
              <input className={`${inputClass} w-16 text-center`} />
              <span className="text-white/60">month</span>
            </div>

            <Checkbox label="Consider for cholecystectomy" />

            <div className="flex items-center gap-2 col-span-2">
              <Checkbox label="Follow up" />
              <input className={`${inputClass} w-20`} />
              <span className="text-white/60">within</span>
              <input className={`${inputClass} w-20`} />
              <Checkbox label="Review" />
              <input className={`${inputClass} w-28`} />
              <span className="text-white/60">for abdomen</span>
            </div>

            <div className="flex items-center gap-2 col-span-2">
              <Checkbox label="Plan for" />
              <input className={`${inputClass} w-28`} />
              <span className="text-white/60">in the</span>
              <input className={`${inputClass} w-28`} />
              <span className="text-white/60">due to</span>
              <input className={`${inputClass} flex-1`} />
            </div>

            <div className="col-span-2">
              <Checkbox label="Other" />
              <textarea className={`${textareaClass} mt-2 min-h-[80px]`} rows={2} />
            </div>

          </div>
        </Section>

        {/* ================= RECOMMENDATION (FREE TEXT) ================= */}
        <Section title="Recommendation (free text)">
          <textarea className={`${textareaClass} min-h-[90px]`} rows={3} />
        </Section>

        {/* ================= SPECIMENS ================= */}
        <Section title="Specimens">
          <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
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
              <input className={`${inputClass} flex-1`} />
            </div>

            <div className="col-span-2 flex items-center gap-2 sm:col-span-3 lg:col-span-4">
              <Checkbox label="Other" />
              <input className={`${inputClass} flex-1`} />
            </div>
          </div>
        </Section>

        {/* ================= BLOOD LOSS ================= */}
        <Section title="Blood loss">
          <div className="flex items-center gap-3">
            <span className="text-rose-300 font-semibold">*</span>
            <span>Estimated blood loss</span>
            <input className={`${inputClass} w-20 text-center`} defaultValue="0" />
            <span className="text-white/60">ml.</span>
          </div>
        </Section>

        {/* ================= NOTE / COMMENTS ================= */}
        <Section title="Note / comments">
          <textarea className={`${textareaClass} min-h-[90px]`} rows={3} />
        </Section>

        {/* ================= SIGNATURE ================= */}
        <Section title="Signature">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white/70">Signature ....................................................</div>
            <label className="flex items-center gap-2 text-white/70">
              <input type="checkbox" className="h-4 w-4 rounded border-white/20 accent-teal-500" />
              Digital Sign
            </label>
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ================= SMALL UI ================= */

function Checkbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-white/70">
      <input type="checkbox" className="h-4 w-4 rounded border-white/20 accent-teal-500" />
      <span>{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-white/70">{title}</div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">{children}</div>
    </div>
  );
}
