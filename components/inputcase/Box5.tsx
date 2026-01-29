"use client";

import React, { useState } from "react";

const FINDING_FIELDS = [
  "Anal Canal",
  "Rectum",
  "Sigmoid Colon",
  "Descending",
  "Splenic Flexure",
  "Transverse Colon",
  "Hepatic Flexure",
  "Ascending Colon",
  "Cecum",
  "Terminal Ileum",
  "Other",
];

export default function FindingsSection() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [allCopy, setAllCopy] = useState(false);
  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20 resize-none leading-[16px]";

  const handleChange = (key: string, value: string) => {
    if (allCopy && FINDING_FIELDS.includes(key)) {
      const updated = { ...values };
      FINDING_FIELDS.forEach((k) => (updated[k] = value));
      setValues(updated);
    } else {
      setValues((prev) => ({ ...prev, [key]: value }));
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="w-[920px] rounded-[24px] border border-white/10 bg-slate-900/70 shadow-[0_18px_50px_rgba(2,6,23,0.55)]">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-6 py-3 text-[11px] font-semibold text-white/70">
        <span className="uppercase tracking-[0.24em]">Findings</span>

        <label className="flex items-center gap-2 font-normal">
          <input
            type="checkbox"
            checked={allCopy}
            onChange={(e) => setAllCopy(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 accent-teal-500"
          />
          <span className="text-white/60">All copy</span>
        </label>
      </div>

      {/* BODY */}
      <div className="space-y-3 bg-slate-900/70 px-6 py-5 text-white/70">

        {/* FINDING LIST */}
        {FINDING_FIELDS.map((label) => (
          <div
            key={label}
            className="grid grid-cols-[170px_1fr] items-start gap-3"
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 pt-[6px]">
              {label}
            </div>

            <textarea
              rows={1}
              className={inputClass}
              value={values[label] || ""}
              onChange={(e) => {
                handleChange(label, e.target.value);
                autoResize(e);
              }}
            />
          </div>
        ))}

        {/* PRINCIPAL PROCEDURE */}
        <div className="pt-1">
          <div className="text-[10px] uppercase tracking-[0.22em] text-rose-300 font-semibold mb-2">
            * PRINCIPAL PROCEDURE
          </div>
          <textarea
            rows={2}
            className={inputClass}
            value={values["Principal"] || ""}
            onChange={(e) => {
              handleChange("Principal", e.target.value);
              autoResize(e);
            }}
          />
        </div>

        {/* SUPPLEMENTAL PROCEDURE */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 font-semibold mb-2">
            SUPPLEMENTAL PROCEDURE
          </div>
          <textarea
            rows={2}
            className={inputClass}
            value={values["Supplemental"] || ""}
            onChange={(e) => {
              handleChange("Supplemental", e.target.value);
              autoResize(e);
            }}
          />
        </div>

      </div>
    </div>
  );
}
