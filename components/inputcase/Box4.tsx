"use client";

import React from "react";

/**
 * PRE-DIAGNOSIS (Dx1–Dx3)
 * Layout + inputs to match screenshot
 * Standalone component for report pages
 */
export default function CRPreDiagnosisBlock() {
    const inputClass =
        "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
    return (
        <>
            <section className="w-[920px] rounded-[24px] border border-white/10 bg-slate-900/70 px-6 py-4 text-[12px] shadow-[0_18px_50px_rgba(2,6,23,0.55)]">
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/50">History</div>
                <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3 items-start">
                    {/* Dx1 */}
                    <Label required>BRIEF HISTORY</Label>
                    <textarea
                        className={`${inputClass} resize-none`}
                        defaultValue="Enteroinvasive Escherichia coli infection - A04.2"
                        rows={2}
                    />
                    <Label required>Consent</Label>
                    <textarea
                        className={`${inputClass} resize-none`}
                        defaultValue="Dyspepsia (ท้องอืด)"
                        rows={2}
                    />
                </div>
            </section>
            <div className="mt-4 w-[920px] space-y-4 rounded-[24px] border border-white/10 bg-slate-900/70 px-6 py-4 text-[12px] shadow-[0_18px_50px_rgba(2,6,23,0.55)]">

                {/* BOWEL PREPARATION REGIMEN */}
                <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2">
                        BOWEL PREPARATION REGIMEN
                    </div>
                    <textarea
                        className={inputClass}
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
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/50 mb-2">
                        BOWEL PREPARATION RESULT
                    </div>
                    <textarea
                        className={`${inputClass} resize-none`}
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
        <div className="text-left pr-2 text-white/70">
            {required && <span className="mr-1 text-rose-400">*</span>}
            {children}
        </div>
    );
}
