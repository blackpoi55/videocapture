"use client";

import React from "react";

type Props = {
  data: any;
};

export default function SecondCRPage({ data }: Props) {
  const fullName = `${data?.data?.prefix_name || ""}${data?.data?.firstname || ""} ${data?.data?.lastname || ""}`;

  return (
    <main>
      <div className="bg-white w-[210mm] min-h-[297mm] mx-auto p-6 shadow text-[9px] text-gray-800">

        {/* TOP HEADER */}
        <div className="text-center mb-2">
          <div className="text-lg font-bold">Colonoscopy Report</div>
          <div className="text-xs font-semibold">
            Gastrointestinal and Liver Center, Vibhavadi Hospital
          </div>
          <div className="text-xs">
            ศูนย์โรคระบบทางเดินอาหาร โรงพยาบาลวิภาวดี
          </div>
        </div>

        <div className="border border-black p-2">

          {/* NAME / AGE / AN */}
          <div className="flex gap-6">
            <Field label="NAME" value={fullName} />
            <Field label="AGE" value={data?.data?.age} />
            <Field label="AN" value={data?.data?.an} />
          </div>

          {/* HN / SEX / OPD */}
          <div className="flex gap-4 mt-1">
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

          {/* IMAGE GRID */}
          <div className="grid grid-cols-3 gap-3 mt-3">

            <ImageBox label="F. Splenic Flexure" />
            <ImageBox label="G. Sigmoid Colon" />
            <ImageBox label="H. Rectum" />

            <ImageBox label="I. Rectum" />
            <ImageBox label="J. Anal Canal" />
            <ImageBox label="K. Anal Canal" />

          </div>

          {/* INTERPRETATION */}
          <div className="mt-6">
            <Field label="INTERPRETATION" value={data?.data?.histopathology_name} />
          </div>

          {/* SIGNATURE */}
          <div className="mt-60">
            SIGNATURE ________________________________
          </div>

          {/* FOOTER */}
          <div className="text-blue-900 mt-6 text-[10px]">
            ศูนย์โรคระบบทางเดินอาหาร โรงพยาบาลวิภาวดี<br />
            51/3 ถนน งามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900<br />
            โทร. 02-561-1111 Fax. 02-561-1466
          </div>

        </div>

        <div className="text-right text-[10px] mt-2">
          PAGE - 2
        </div>

      </div>
    </main>
  );
}

/* ---------- Small Components ---------- */

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center">
      <div className="font-semibold text-blue-900 whitespace-nowrap">
        {label} :
      </div>
      <div className="border-b border-black min-h-[14px]">
        {value || ""}
      </div>
    </div>
  );
}

function ImageBox({
  label,
  src,
}: {
  label: string;
  src?: string;
}) {
  return (
    <div>
      <div className="border h-[180px] flex items-center justify-center text-gray-400">
        {src ? (
          <img
            src={src}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          "รอดึงรูป"
        )}
      </div>
      <div className="text-[11px] mt-1">{label}</div>
    </div>
  );
}
