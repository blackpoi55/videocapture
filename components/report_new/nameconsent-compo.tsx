"use client";
import React from "react";

/* ---------- Helpers ---------- */

const formatDateTime = (date?: string, time?: string) => {
  if (!date && !time) return "-";

  const d = date ? new Date(date).toLocaleDateString("th-TH") : "";
  const t = time
    ? new Date(time).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return [d, t].filter(Boolean).join(" ");
};

/* ---------- Small Components ---------- */

type FieldProps = {
  label: string;
  value?: React.ReactNode;
};

const Field = ({ label, value }: FieldProps) => {
  return (
    <div className="grid grid-cols-[60px_1fr] gap-1">
      <div className="font-semibold text-blue-900 whitespace-nowrap">
        {label} :
      </div>
      <div className="border-b border-black min-h-[14px]">
        {value || ""}
      </div>
    </div>
  );
};

type SectionProps = {
  title: string;
  children?: React.ReactNode;
};

const Section = ({ title, children }: SectionProps) => {
  return (
    <div className="mt-2">
      <div className="font-semibold text-blue-900">
        {title}
      </div>
      <div className="ml-3 text-gray-600 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
};

/* ---------- Main Component ---------- */

export default function PatientInfoSection({ data }: { data: any }) {
  console.log("Patient Info Data:", data);
  const fullName = `${data?.data?.prefix_name || ""}${data?.data?.firstname || ""} ${data?.data?.lastname || ""}`;
  console.log("Full Name:", fullName);
  return (
    <div className="p-2 space-y-1 text-[9px]">

      {/* NAME / AGE / AN */}
      <div className="flex gap-6">
        <Field label="NAME" value={fullName} />
        <Field label="AGE" value={data?.data?.age} />
        <Field label="AN" value={data?.data?.an} />
      </div>

      {/* HN / SEX / OPD */}
      <div className="flex gap-4">
        <Field label="HN" value={data?.data?.hn} />
        <Field label="SEX" value={data?.data?.sex_name} />
        <Field
          label="OPD"
          value={
            data?.data?.patienttypeopd_name ||
            data?.data?.patienttypeward_name ||
            "-"
          }
        />
      </div>

      <Field label="FINANCIAL" value={data?.data?.financial_name} />
      <Field label="ENDOSCOPIST" value={data?.data?.physician_name} />
      <Field label="CONSULTANT" value={data?.data?.physiciansc_name || "-"} />
      <Field label="NURSE-1" value={data?.data?.nurse_name} />
      <Field label="NURSE-2" value={data?.data?.nurse2_name} />
      <Field label="ANESTHESIST" value={data?.data?.anesthetist_name} />

      <Field
        label="DATE / TIME"
        value={formatDateTime(data?.data?.casedate, data?.data?.casetimefrom)}
      />

      <Field label="INSTRUMENT" value={data?.data?.instrument_name || "-"} />
      <Field label="ANESTHESIA" value={data?.data?.anesthesiamethod_name} />
      <Field label="MEDICATION" value={data?.data?.rapidtestresult_name} />

      <Field label="INDICATION" value={data?.data?.indication_name} />

      <Section title="PRE-DIAGNOSIS">
        (Dx1) {data?.data?.prediagnosisdx1_name || "................................................"} <br />
        (Dx2) {data?.data?.prediagnosisdx2_name || "................................................"}
      </Section>

      <Field label="BRIEF HISTORY" value={data?.data?.subprocedure_name} />
      <Field label="CONSENT" value="Yes" />

    </div>
  );
}
