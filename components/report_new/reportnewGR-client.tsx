"use client";

import React from "react";
import Nameconsent from "./nameconsent-compo";
import FindhisGR from "./findhis-compoGR";

export default function GastroscopyReportPage() {
    return (
        <main>
            <div className="bg-white w-[210mm] min-h-[297mm] mx-auto p-6 shadow text-[9px] text-gray-800">

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

                {/* INFO + IMAGE COLUMN */}
                <div className="grid grid-cols-[2fr_1fr] gap-2">

                    {/* LEFT PANEL */}
                    <div className="border border-black p-2 space-y-1">

                        {/* ให้ NAME, HN, AGE อยู่บรรทัดเดียวกัน */}
                        <Nameconsent />


                        <FindhisGR />

                        <div className="font-semibold text-blue-900 whitespace-nowrap">
                            RAPID UREASE TEST 
                        </div>

                        <div className="flex gap-4 text-gray-700">

                            <Checkbox label="DONE" />
                            <Checkbox label="POSITIVE" />
                            <Checkbox label="NEGATIVE" />
                            <Checkbox label="PENDING" />

                        </div>

                        <Field label="ESTIMATED BLOOD LOSS" />

                        <Field label="THERAPY" />

                        <Field label="RECOMMENDATION" />



                        <div className="mt-14">
                            SIGNATURE ________________________________
                        </div>

                        <div className="text-blue-900  mt-6">
                            ศูนย์โรคระบบทางเดินอาหาร โรงพยาบาลวิภาวดี<br />
                            51/3 ถนน งามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900<br />
                            โทร. 02-561-1111 Fax. 02-561-1466
                        </div>



                    </div>

                    {/* RIGHT IMAGE PANEL */}
                    <div className="space-y-2">

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

function Field({ label }: { label: string }) {
    return (
        <div className="grid grid-cols-[160px_1fr] items-center">
            <div className="font-semibold text-blue-900 whitespace-nowrap">{label} :</div>
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

function Checkbox({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-3 h-3 border border-black"></div>
      <span>{label}</span>
    </div>
  );
}
