"use client";
import React from "react";

/* ---------- Small Components ---------- */

type FieldProps = {
  label: string;
};

const Field = ({ label }: FieldProps) => {
  return (
    <div className="grid grid-cols-[110px_1fr]">
      <div className="font-semibold text-blue-900">
        {label} :
      </div>
      {/* <div className="border-b border-black h-5" /> */}
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

export default function PatientInfoSection() {
  return (
    <div className=" p-2 space-y-1 text-[9px]">

      {/* NAME / AGE / AN */}
      <div className="flex gap-6">
        <Field label="NAME" />
        <Field label="AGE" />
        <Field label="AN" />
      </div>

      {/* HN / SEX / OPD */}
      <div className="flex gap-4">
        <Field label="HN" />
        <Field label="SEX" />
        <Field label="OPD" />
      </div>

      <Field label="FINANCIAL" />
      <Field label="ENDOSCOPIST" />
      <Field label="CONSULTANT" />
      <Field label="NURSE-1" />
      <Field label="NURSE-2" />
      <Field label="ANESTHESIST" />
      <Field label="DATE/TIME" />
      <Field label="INSTRUMENT" />
      <Field label="ANESTHESIA" />
      <Field label="MEDICATION" />

      <Field label="INDICATION" />

      <Section title="PRE-DIAGNOSIS">
        (Dx1) ............................................................. <br />
        (Dx2) .............................................................
      </Section>

      <Field label="BRIEF HISTORY" />
      <Field label="CONSENT" />

    </div>
  );
}
