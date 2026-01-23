"use client";
import React from "react";

/* ---------- Small Components ---------- */

function Field({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-1">
      <div className="font-semibold text-blue-900 whitespace-nowrap">
        {label} :
      </div>
      <div className="border-b border-black min-h-[14px]">
        {value || ""}
      </div>
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
    <div className="mt-2">
      <div className="font-semibold text-blue-900">
        {title}
      </div>
      <div className="ml-3 text-green-800 leading-relaxed text-[9px]">
        {children}
      </div>
    </div>
  );
}

/* ---------- Main Component ---------- */

export default function FindingsSection({ data }: { data: any }) {
  return (
    <div className="space-y-1 text-[9px] text-green-800 ">

      <Section title="FINDINGS">
        ANAL CANAL : {data?.data?.finding_anal || ""} <br />
        RECTUM : {data?.data?.finding_rectum || ""} <br />
        SIGMOID COLON : {data?.data?.finding_sigmoid || ""} <br />
        DESCENDING COLON : {data?.data?.finding_descending || ""} <br />
        SPLENIC FLEXURE : {data?.data?.finding_splenic || ""} <br />
        TRANSVERSE COLON : {data?.data?.finding_transverse || ""} <br />
        HEPATIC FLEXURE : {data?.data?.finding_hepatic || ""} <br />
        ASCENDING COLON : {data?.data?.finding_ascending || ""} <br />
        CECUM : {data?.data?.finding_cecum || ""} <br />
        TERMINAL ILEUM : {data?.data?.finding_terminal_ileum || ""}
      </Section>

      <Field
        label="PROCEDURES"
        value={`${data?.data?.mainprocedure_name || ""} ${data?.data?.subprocedure_name || ""}`}
      />

      <Field
        label="PRINCIPAL PROCEDURE"
        value={data?.data?.mainprocedure_name}
      />

      <Section title="POST-DIAGNOSIS">
        (Dx1) {data?.data?.prediagnosisdx1_name || "Normal colonoscopy"}
        <br />
        {data?.data?.prediagnosisdx2_name
          ? `(Dx2) ${data?.data?.prediagnosisdx2_name}`
          : ""}
      </Section>

      <Field
        label="COMPLICATION"
        value={data?.data?.complication || "-"}
      />

      <Field
        label="HISTOPATHOLOGY"
        value={data?.data?.histopathology_name}
      />

    </div>
  );
}
