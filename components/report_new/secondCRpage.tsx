"use client";

import React from "react";
import Nameconsent from "./nameconsent-compo";
import FindhisCR from "./findhis-compoCR";

export default function ColonoscopyReportPage() {
    return (
        <main >
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

                {/* INFO + IMAGE COLUMN */}
                <div className="border border-black p-2">

                    {/* NAME / AGE / AN */}
                    <div className="flex gap-6">
                        <Field label="NAME" />
                        <Field label="AGE" />
                        <Field label="AN" />
                    </div>

                    {/* HN / SEX / OPD */}
                    <div className="flex gap-4 mt-1">
                        <Field label="HN" />
                        <Field label="SEX" />
                        <Field label="OPD" />
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

                    <div className="mt-6">
                        <Field label="INTERPRETATION" />
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
            <div className="border h-[180px] flex items-center justify-center text-gray-400">
                รอดึงรูป
            </div>
            <div className="text-[11px] mt-1">{label}</div>
        </div>
    );
}
