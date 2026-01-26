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
      <div className="min-h-[14px]">
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
      <div className="ml-3 text-green-800 leading-relaxed text-[10px]">
        {children}
      </div>
    </div>
  );
}

/* ---------- Main Component ---------- */

export default function FindingsSection({ data }: { data: any }) {
  return (
    <div className="space-y-1 text-[10px] text-green-800">

      <Section title="FINDINGS">
        OROPHARYNX : {data?.data?.finding_oropharynx || ""} <br />
        ESOPHAGUS : {data?.data?.finding_esophagus || ""} <br />
        EG JUNCTION : {data?.data?.finding_egjunction || ""} <br />

        STOMACH <br />
        ㅤCARDIA : {data?.data?.finding_cardia || ""} <br />
        ㅤFUNDUS : {data?.data?.finding_fundus || ""} <br />
        ㅤBODY : {data?.data?.finding_body || ""} <br />
        ㅤINCISURA : {data?.data?.finding_incisura || ""} <br />
        ㅤANTRUM : {data?.data?.finding_antrum || ""} <br />
        ㅤPYLORUS : {data?.data?.finding_pylorus || ""} <br />

        DUODENUM <br />
        ㅤBULB : {data?.data?.finding_duodenum_bulb || ""} <br />
        ㅤ2nd PORTION : {data?.data?.finding_duodenum_second || ""} <br />
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
        (Dx1) : {data?.data?.prediagnosisdx1_name || ""} <br />
        {data?.data?.prediagnosisdx2_name
          ? `(Dx2) : ${data?.data?.prediagnosisdx2_name}`
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
