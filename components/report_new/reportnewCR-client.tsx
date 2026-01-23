"use client";

import React from "react";
import Nameconsent from "./nameconsent-compo";
import FindhisCR from "./findhis-compoCR";

type Props = {
    data: any;
};

export default function ColonoscopyReportPage({ data }: Props) {
    console.log("Colonoscopy Report Data:", data);
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

                <div className="grid grid-cols-[2fr_1fr] gap-2">

                    {/* LEFT PANEL */}
                    <div className="border border-black p-2 space-y-1">

                        {/* ส่ง data ลงไป */}
                        <Nameconsent data={data} />

                        <Field label="BOWEL PREPARATION REGIMEN" value={data?.data?.bowelPreparationRegimen} />
                        <Field label="BOWEL PREPARATION RESULTS" value={data?.data?.bowelPreparationResults} />

                        <FindhisCR data={data} />

                        <Field label="ESTIMATED BLOOD LOSS" value={data?.data?.estimatedBloodLoss} />
                        <Field label="THERAPY" value={data?.data?.therapy} />
                        <Field label="RECOMMENDATION" value={data?.data?.recommendation} />
                        <Field label="NOTES / COMMENTS" value={data?.data?.comments} />

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
                    <div className="space-y-2">
                        <ImageBox label="A. Terminal ileum" />
                        <ImageBox label="B. appendix orifice" />
                        <ImageBox label="C. Cecum" />
                        <ImageBox label="D. Hepatic Flexure" />
                        <ImageBox label="E. Transverse Colon" />
                    </div>

                </div>

                <div className="text-right text-[10px] mt-2">
                    PAGE - 1
                </div>

            </div>
        </main>
    );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start">
      <div className="font-semibold text-blue-900 whitespace-nowrap">
        {label} :
      </div>
      <div className="text-gray-700">
        {value || "-"}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-2">
            <div className="font-semibold text-blue-900">{title}</div>
            <div className="ml-3 text-gray-600">{children}</div>
        </div>
    );
}

function ImageBox({ label }: { label: string }) {
    return (
        <div>
            <div className="border h-[160px] flex items-center justify-center text-gray-400">
                รอดึงรูป
            </div>
            <div className="text-[11px] mt-1">{label}</div>
        </div>
    );
}
