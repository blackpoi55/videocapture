"use client";

import React from "react";
import Nameconsent from "./nameconsent-compo";
import FindhisGR from "./findhis-compoGR";

type Props = {
  data: any;
};

export default function GastroscopyReportPage({ data }: Props) {
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

        <div className="grid grid-cols-[2fr_1fr] gap-2">

          {/* LEFT PANEL */}
          <div className="p-2">

            {/* ===== GRID: TEXT | DIAGRAM ===== */}
            <div className="grid grid-cols-[1fr_180px] gap-3 items-start">

              {/* LEFT: TEXT CONTENT */}
              <div className="space-y-1">
                <Nameconsent data={data} />

                <FindhisGR data={data} />

                <div className="font-semibold text-blue-900 whitespace-nowrap mt-1">
                  RAPID UREASE TEST
                </div>

                <div className="flex gap-4 text-gray-700">
                  <Checkbox
                    label="DONE"
                    checked={!!data?.data?.rapidtestresult_name}
                  />
                  <Checkbox
                    label="POSITIVE"
                    checked={data?.data?.rapidtestresult_name === "Positive"}
                  />
                  <Checkbox
                    label="NEGATIVE"
                    checked={data?.data?.rapidtestresult_name === "Negative"}
                  />
                  <Checkbox
                    label="PENDING"
                    checked={data?.data?.rapidtestresult_name === "Pending"}
                  />
                </div>
              </div>

              {/* RIGHT: DIAGRAM (ตำแหน่งวงน้ำเงิน) */}
              <div className="flex justify-center mt-6">
                <div className="w-[170px] text-center">
                                   <img
                                        src={data?.data?.operativetemplateimagepath || ""}
                                        alt="Operative Template Diagram"
                                        className="w-full object-contain"
                                    />
                  <div className="text-[10px] font-semibold mt-1">
                    LOWER GI TRACT
                  </div>
                </div>
              </div>

            </div>
            {/* ===== END GRID ===== */}

            <Field
              label="ESTIMATED BLOOD LOSS"
              value={data?.data?.estimatedBloodLoss}
            />

            <Field
              label="THERAPY"
              value={data?.data?.therapy}
            />

            <Field
              label="RECOMMENDATION"
              value={data?.data?.recommendation}
            />

            <div className="mt-14">
              SIGNATURE ________________________________
            </div>

            <div className="text-blue-900 mt-6">
              ศูนย์โรคระบบทางเดินอาหาร โรงพยาบาลวิภาวดี<br />
              51/3 ถนน งามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900<br />
              โทร. 02-561-1111 Fax. 02-561-1466
            </div>

          </div>

          {/* RIGHT IMAGE PANEL */}
          <div className="space-y-2 justify-self-end">
            <ImageBox label="A. Oropharynx" />
            <ImageBox label="B. Esophagus" />
            <ImageBox label="C. EG Junction" />
            <ImageBox label="D. Fundus" />
            <ImageBox label="E. Body" />
          </div>

        </div>

        <div className="text-right text-[10px] mt-2">
          PAGE - 1
        </div>

      </div>
    </main>
  );
}

/* ---------- Small Components ---------- */

function Field({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center">
      <div className="font-semibold text-blue-900 whitespace-nowrap">
        {label} :
      </div>
      <div className="min-h-[14px]">
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
      <div className="border w-[140px] h-[140px] flex items-center justify-center text-gray-400">
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          "รอดึงรูป"
        )}
      </div>
      <div className="text-[11px] mt-1">{label}</div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-3 h-3 border border-black flex items-center justify-center text-[8px]">
        {checked ? "✓" : ""}
      </div>
      <span>{label}</span>
    </div>
  );
}
