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
    <div className="border bg-[#b7cbe3] w-[800px]">

      {/* HEADER */}
      <div className="flex items-center justify-between bg-[#c9d8ea] px-3 py-1 text-[11px] font-semibold text-slate-700">
        <span>FINDINGS #</span>

        <label className="flex items-center gap-2 font-normal">
          <input
            type="checkbox"
            checked={allCopy}
            onChange={(e) => setAllCopy(e.target.checked)}
          />
          All copy
        </label>
      </div>

      {/* BODY */}
      <div className="p-3 space-y-2 bg-white">

        {/* FINDING LIST */}
        {FINDING_FIELDS.map((label) => (
          <div
            key={label}
            className="grid grid-cols-[150px_1fr] items-start gap-2"
          >
            <div className="text-[10px] text-slate-600 pt-[3px]">
              {label}
            </div>

            <textarea
              rows={1}
              className="w-full border border-gray-300 px-2 py-1
                         text-[10px] text-gray-800 resize-none
                         leading-[14px] focus:outline-none"
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
          <div className="text-[10px] text-red-600 font-semibold mb-1">
            * PRINCIPAL PROCEDURE
          </div>
          <textarea
            rows={2}
            className="w-full border border-gray-300 px-2 py-1
                       text-[10px] text-gray-800 resize-none
                       leading-[14px] focus:outline-none"
            value={values["Principal"] || ""}
            onChange={(e) => {
              handleChange("Principal", e.target.value);
              autoResize(e);
            }}
          />
        </div>

        {/* SUPPLEMENTAL PROCEDURE */}
        <div>
          <div className="text-[10px] text-slate-500 font-semibold mb-1">
            SUPPLEMENTAL PROCEDURE
          </div>
          <textarea
            rows={2}
            className="w-full border border-gray-300 px-2 py-1
                       text-[10px] text-gray-800 resize-none
                       leading-[14px] focus:outline-none"
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
