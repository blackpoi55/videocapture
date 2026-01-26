"use client";

import React from "react";

export default function SecondGRPage({ data }: { data: any }) {
  return (
    <main>
      <div className="bg-white w-[210mm] min-h-[297mm] mx-auto p-6 shadow text-[10px] text-gray-800">

        {/* TOP HEADER */}
        <div className="text-center mb-2">
          <div className="text-lg font-bold">Gastroscopy Report</div>
          <div className="text-xs font-semibold">
            Gastrointestinal and Liver Center, Vibhavadi Hospital
          </div>
          <div className="text-xs">
            ศูนย์โรคระบบทางเดินอาหาร โรงพยาบาลวิภาวดี
          </div>
        </div>

        <div className=" p-2">

          {/* NAME / AGE */}
          <div className="flex gap-6">
            <Field label="NAME" value={data?.data?.fullname_en} />
            <Field label="AGE" value={data?.data?.age} />
          </div>

          {/* HN / SEX / AN */}
          <div className="flex gap-4 mt-1">
            <Field label="HN" value={data?.data?.hn} />
            <Field label="SEX" value={data?.data?.sex} />
            <Field label="AN" value={data?.data?.an} />
          </div>

          {/* IMAGE GRID */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <ImageBox label="F. Body" src={data?.data?.img_body} />
            <ImageBox label="G. Incisura Angularis" src={data?.data?.img_incisura} />
            <ImageBox label="H. Antrum" src={data?.data?.img_antrum} />

            <ImageBox label="I. Pylorus" src={data?.data?.img_pylorus1} />
            <ImageBox label="J. Pylorus" src={data?.data?.img_pylorus2} />
            <ImageBox label="K. Bulb" src={data?.data?.img_bulb} />

            <ImageBox label="L. 2nd Portion" src={data?.data?.img_duodenum2} />
            <ImageBox label="M. 3rd Portion" src={data?.data?.img_duodenum3} />
          </div>

          {/* INTERPRETATION */}
          <div className="mt-6">
            <Field
              label="INTERPRETATION"
              value={data?.data?.interpretation}
              full
            />
          </div>

          {/* SIGNATURE */}
          <div className="mt-40">
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

function Field({
  label,
  value,
  full = false,
}: {
  label: string;
  value?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`grid ${
        full ? "grid-cols-[70px_1fr]" : "grid-cols-[80px_1fr]"
      } items-center gap-1`}
    >
      <div className="font-semibold text-blue-900 whitespace-nowrap">
        {label} :
      </div>
      <div className=" min-h-[14px]">
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
      <div className="border h-[180px] flex items-center justify-center overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={label}
            className="object-contain h-full w-full"
          />
        ) : (
          <span className="text-gray-400">รอดึงรูป</span>
        )}
      </div>
      <div className="text-[11px] mt-1">{label}</div>
    </div>
  );
}
