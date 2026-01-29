"use client";

import React, { useState } from "react";

export default function ColonoscopyResultPage() {
    const inputClass =
        "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3.5 py-3 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
    const lineClass =
        "w-full rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
    const labelClass = "text-[11px] uppercase tracking-[0.18em] text-white/50";
    return (
        <div className="relative mx-auto w-full max-w-[920px] text-[12px] text-white/80">
            <div className="pointer-events-none absolute -top-20 left-0 h-[240px] w-[240px] rounded-full bg-emerald-500/15 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-[260px] w-[260px] rounded-full bg-indigo-500/15 blur-[140px]" />

            <div className="relative rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_30px_80px_rgba(2,6,23,0.6)] backdrop-blur-[24px]">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <div className={labelClass}>Endoscopy Report</div>
                        <h2 className="text-[22px] font-semibold text-white">Colonoscopy Result</h2>
                    </div>
                    <div className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/60">
                        Summary
                    </div>
                </div>

                {/* ================= DIAGNOSTIC ================= */}
                <Section title="Diagnostic">
                    <CheckGrid
                        items={[
                            "None",
                            "Normal IBS",
                            "Colitis unspecified",
                            "Diverticulosis / diverticulitis",
                            "CA colon",
                            "Radiation colitis",
                            "Ulcer unspecified",
                            "Polyps",
                            "PMC",
                            "Angiodysplasia",
                            "Proctitis",
                            "IBD",
                            "Ileal lesions",
                        ]}
                    />

                    <div className="grid grid-cols-[120px_1fr] items-center mt-3 gap-3">
                        <div className={labelClass}>Other</div>
                        <input className={lineClass} />
                    </div>
                </Section>

                <Section title="Therapeutic">
                    <CheckGrid
                        items={[
                            "None",
                            "Polypectomy",
                            "APC",
                            "Glue injection",
                            "Sclerotherapy",
                            "Hemoclip/disposable hemoclip",
                            "EMR",
                            "Adrenaline injection",
                            "Banding ligation",
                            "Heater probe/gold probe",
                            "Stenting",
                            "Snare/detachable",
                            "Dilatation(Prematic_Bougie_Savary)",
                        ]}
                    />

                    <div className="grid grid-cols-[120px_1fr] items-center mt-3 gap-3">
                        <div className={labelClass}>Other</div>
                        <input className={lineClass} />
                    </div>
                </Section>

                {/* ================= POST DIAGNOSIS ================= */}
                <Section title="Post-diagnosis">
                    {["Dx1", "Dx2", "Dx3", "Dx4", "Dx5"].map((dx, i) => (
                        <div
                            key={dx}
                            className="grid grid-cols-[140px_1fr_28px] items-center gap-3 mb-2"
                        >
                            <div className={i === 0 ? "text-rose-300 font-semibold" : "text-white/70"}>
                                Post-diagnosis ({dx})
                            </div>
                            <input className={lineClass} />
                            <span className="text-sky-300">📋</span>
                        </div>
                    ))}
                </Section>

                {/* ================= COMPLICATION ================= */}
                <Section title="Complication">
                    <CheckRow
                        items={[
                            "No immediate complication",
                            "Cardiovascular instability",
                            "Perforation",
                            "Bleeding from",
                            "Colonic redundancy",
                            "Other",
                        ]}
                    />
                </Section>

                {/* ================= HISTOPATHOLOGY ================= */}
                <Section title="Histopathology">
                    <CheckRow items={["Not done", "Done"]} />
                    <CheckRow items={["Biopsy", "Hot biopsy", "Polypectomy", "Other"]} />

                    <div className="grid grid-cols-[80px_1fr] items-center mt-3 gap-3">
                        <div className={labelClass}>From</div>
                        <select className={lineClass} />
                    </div>

                    <div className="mt-3">
                        <div className="text-rose-300 font-semibold">Free Text</div>
                        <textarea className={`${inputClass} min-h-[80px]`} />
                    </div>
                </Section>

                {/* ================= RAPID UREASE TEST ================= */}
                <Section title="Rapid urease test">
                    <CheckRow items={["Not done", "Done", "Positive", "Negative"]} />
                    <textarea className={`${inputClass} mt-2 min-h-[80px]`} />
                    <select className={`${lineClass} mt-2`} />
                    <div className="mt-3">
                        <div className="text-rose-300 font-semibold">Free Text</div>
                        <textarea className={`${inputClass} min-h-[80px]`} />
                    </div>
                </Section>

            {/* ================= THERAPY ================= */}
            {/* <Section title="THERAPY">
                <select className="input-line mb-1" />
                <div>
                    <div className="text-red-600">Free Text</div>
                    <textarea className="textarea-box" />
                </div>
            </Section> */}

                {/* ================= BRONCHOSCOPIC PROCEDURE ================= */}
                <Section title="Bronchoscopic procedure">
                    <div className="space-y-2">
                        <CheckWithInput label="Endobronchial mass far from carina" unit="cm." />
                        <CheckWithSelect label="Bronchial washing at" />
                        <CheckWithAmount label="Bronchoalveolar lavage at" />
                        <CheckWithSelect label="Bronchial biopsy at" />
                        <CheckWithSelect label="Transbronchial biopsy at" />
                        <CheckWithSelect label="Brushing at" />
                    </div>
                </Section>

                {/* ================= RECOMMENDATION ================= */}
                <Section title="Recommendation">
                    <textarea className={`${inputClass} min-h-[100px]`} />
                </Section>
            </div>
        </div>
    );
}

/* ================= Small UI ================= */

function Section({ title, children }: any) {
    return (
        <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-white/70">
                {title}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">{children}</div>
        </div>
    );
}

function CheckGrid({ items }: { items: string[] }) {
    return (
        <div className="grid grid-cols-2 gap-y-2 text-white/70 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((i) => (
                <label key={i} className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-white/20 accent-teal-500" />
                    {i}
                </label>
            ))}
        </div>
    );
}

function CheckRow({ items }: { items: string[] }) {
    return (
        <div className="flex flex-wrap gap-4 text-white/70">
            {items.map((i) => (
                <label key={i} className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-white/20 accent-teal-500" />
                    {i}
                </label>
            ))}
        </div>
    );
}

function CheckWithInput({ label, unit }: any) {
    return (
        <div className="grid grid-cols-[1fr_60px_30px] gap-2 items-center">
            <label className="flex items-center gap-2 text-white/70">
                <input type="checkbox" className="h-4 w-4 rounded border-white/20 accent-teal-500" />
                {label}
            </label>
            <input className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20" />
            <span className="text-white/50">{unit}</span>
        </div>
    );
}

function CheckWithSelect({ label }: any) {
    return (
        <div className="grid grid-cols-[1fr_1fr] gap-2 items-center">
            <label className="flex items-center gap-2 text-white/70">
                <input type="checkbox" className="h-4 w-4 rounded border-white/20 accent-teal-500" />
                {label}
            </label>
            <select className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20" />
        </div>
    );
}

function CheckWithAmount({ label }: any) {
    return (
        <div className="grid grid-cols-[1fr_1fr_40px_1fr_40px] gap-2 items-center">
            <label className="flex items-center gap-2 text-white/70">
                <input type="checkbox" className="h-4 w-4 rounded border-white/20 accent-teal-500" />
                {label}
            </label>
            <select className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20" />
            <span className="text-white/50">Amount</span>
            <input className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-2 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20" />
            <span className="text-white/50">cc.</span>
        </div>
    );
}

/* ================= styles ================= */


