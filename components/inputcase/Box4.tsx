"use client";

import React from "react";

/**
 * PRE-DIAGNOSIS (Dx1–Dx3)
 * Layout + inputs to match screenshot
 * Standalone component for report pages
 */
export default function CRPreDiagnosisBlock() {
    return (
        <>
            <section className="w-[800px] bg-white px-4 py-3 text-[11px]">
                <div className="grid grid-cols-[160px_1fr_24px] gap-y-2 items-center">
                    {/* Dx1 */}
                    <Label required>BRIEF HISTORY</Label>
                    <textarea
                        className="input text-gray-700 bg-white text-left resize-none"
                        defaultValue="Enteroinvasive Escherichia coli infection - A04.2"
                        rows={2}
                    />
                    <br />
                    <Label required>Consent</Label>
                    <textarea
                        className="input text-gray-700 bg-white text-left resize-none"
                        defaultValue="Dyspepsia (ท้องอืด)"
                        rows={2}
                    />


                </div>


            </section>
            <div className="space-y-3 px-8 pt-2 bg-[#b7cbe3] w-[800px]">

                {/* BOWEL PREPARATION REGIMEN */}

                <div>
                    <div className="text-[11px] font-semibold text-gray-700 mb-1">
                        BOWEL PREPARATION REGIMEN
                    </div>
                    <textarea
                        className="w-full border px-2 py-1 text-gray-700 bg-white"
                        defaultValue="BOWELPREPARATIONREGIMEN1"
                        rows={2}
                        onInput={(e) => {
                            const el = e.currentTarget;
                            el.style.height = "auto";
                            el.style.height = el.scrollHeight + "px";
                        }}
                    />
                </div>

                {/* BOWEL PREPARATION RESULT */}
                <div>
                    <div className="text-[11px] font-semibold text-gray-700 mb-1">
                        BOWEL PREPARATION RESULT
                    </div>
                    <textarea
                        className="w-full border px-2 py-1 text-gray-700 bg-white resize-none"
                        defaultValue="BOWELPREPARATIONRESULT2"
                        rows={2}
                        onInput={(e) => {
                            const el = e.currentTarget;
                            el.style.height = "auto";
                            el.style.height = el.scrollHeight + "px";
                        }}
                    />
                </div>

            </div>
        </>
    );
}

/* ===== helpers ===== */
function Label({
    children,
    required,
}: {
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <div className="text-left pr-2 text-gray-700">
            {required && <span className="mr-1 text-red-600"></span>}
            {children}
        </div>
    );
}

function Icon() {
    return (
        <div className="flex items-center justify-start">
            <div className="h-4 w-4 rounded-sm border bg-white" />
        </div>
    );
}

/* Tailwind helper (global)
.input { @apply w-full rounded-sm border px-2 py-1 text-[11px]; }
*/