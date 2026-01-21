"use client";

import React from "react";

export default function ColonoscopyReportPage() {
    return (
        <main className="bg-gray-100 py-10 print:bg-white">
            <div className="bg-white w-[210mm] min-h-[297mm] mx-auto p-6 shadow text-[12px] text-gray-800">

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
                <div className="grid grid-cols-[2fr_1fr] gap-2">

                    {/* LEFT PANEL */}
                    <div className="border border-black p-2 space-y-1">

                        {/* ให้ NAME, HN, AGE อยู่บรรทัดเดียวกัน */}
                        <div className="flex gap-4">
                            <Field label="NAME" />
                            <Field label="AGE" />
                            <Field label="AN" />
                        </div>
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
                            (Dx1) .............................................................<br />
                            (Dx2) .............................................................
                        </Section>

                        <Field label="BRIEF HISTORY" />


                        <Field label="CONSENT" />

                        <Field label="BOWELPREPARATIONREGIMEN" />

                        <Field label="BOWELPREPARATIONRESULTS" />
  

                        <Section title="FINDINGS">
                            Anal canal : ......................................................<br />
                            Rectum : ......................................................<br />
                            Sigmoid colon : ......................................................<br />
                            Descending colon : ......................................................<br />
                            Splenic flexure : ......................................................<br />
                            Transverse colon : ......................................................<br />
                            Hepatic flexure : ......................................................<br />
                            Ascending colon : ......................................................<br />
                            Cecum : ......................................................<br />
                            Terminal ileum : ......................................................
                        </Section>

                        <Field label="PROCEDURES" />


                        <Field label="PRINCIPAL PROCEDURE" />

                        <Section title="POST-DIAGNOSIS">
                            (Dx1) Normal colonoscopy
                        </Section>

                        <Field label="COMPLICATION" />

                        <Field label="HISTOPATHOLOGY" />

                        <Field label="ESTIMATED BLOOD LOSS" />

                        <Field label="THERAPY" />

                        <Field label="RECOMMENDATION" />

                        <Field label="NOTES / COMMENTS" />

                        <div className="mt-6">
                            SIGNATURE ________________________________
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

function Field({ label }: { label: string }) {
    return (
        <div className="grid grid-cols-[110px_1fr]">
            <div className="font-semibold text-blue-900">{label} :</div>
            
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
            <div className="border h-[120px] flex items-center justify-center text-gray-400">
                รอดึงรูป
            </div>
            <div className="text-[11px] mt-1">{label}</div>
        </div>
    );
}
