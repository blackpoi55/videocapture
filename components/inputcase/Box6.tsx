"use client";

import React, { useState } from "react";

export default function ColonoscopyResultPage() {
    const inputClass =
        "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
    const lineClass =
        "w-full rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1 text-[12px] text-white/90 shadow-sm outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20";
    return (
        <div className="bg-slate-950/80 w-[860px] rounded-[28px] border border-white/10 mx-auto text-[12px] text-white/80 shadow-[0_30px_80px_rgba(2,6,23,0.6)] p-4">

            {/* ================= DIAGNOSTIC ================= */}
            <Section title="DIAGNOSTIC">
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

                <div className="grid grid-cols-[100px_1fr] items-center mt-1">
                    <div>Other</div>
                    <input className={lineClass} />
                </div>
            </Section>

            <Section title="THERAPEUTIC">
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

                <div className="grid grid-cols-[100px_1fr] items-center mt-1">
                    <div>Other</div>
                    <input className={lineClass} />
                </div>
            </Section>

            {/* ================= POST DIAGNOSIS ================= */}
            <Section title="POST-DIAGNOSIS">
                {["Dx1", "Dx2", "Dx3", "Dx4", "Dx5"].map((dx, i) => (
                    <div
                        key={dx}
                        className="grid grid-cols-[120px_1fr_24px] items-center gap-2 mb-1"
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
            <Section title="COMPLICATION">
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
            <Section title="HISTOPATHOLOGY">
                <CheckRow items={["Not done", "Done"]} />
                <CheckRow items={["Biopsy", "Hot biopsy", "Polypectomy", "Other"]} />

                <div className="grid grid-cols-[60px_1fr] items-center mt-1">
                    <div>from</div>
                    <select className={lineClass} />
                </div>

                <div className="mt-2">
                    <div className="text-rose-300">Free Text</div>
                    <textarea className={`${inputClass} min-h-[72px]`} />
                </div>
            </Section>

            {/* ================= RAPID UREASE TEST ================= */}
            <Section title="RAPID UREASE TEST">
                <CheckRow items={["Not done", "Done", "Positive", "Negative"]} />
                <textarea className={`${inputClass} mt-1 min-h-[72px]`} />
                <select className={`${lineClass} mb-1`} />
                <div>
                    <div className="text-rose-300">Free Text</div>
                    <textarea className={`${inputClass} min-h-[72px]`} />
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
            <Section title="BRONCHOSCOPIC PROCEDURE">
                <div className="space-y-1 ">
                    <CheckWithInput label="Endobronchial mass far from carina" unit="cm." />
                    <CheckWithSelect label="Bronchial washing at" />
                    <CheckWithAmount label="Bronchoalveolar lavage at" />
                    <CheckWithSelect label="Bronchial biopsy at" />
                    <CheckWithSelect label="Transbronchial biopsy at" />
                    <CheckWithSelect label="Brushing at" />
                </div>
            </Section>

            {/* ================= RECOMMENDATION ================= */}
            <Section title="RECOMMENDATION">
                <textarea className={`${inputClass} min-h-[90px]`} />
            </Section>
        </div>
    );
}

/* ================= Small UI ================= */

function Section({ title, children }: any) {
    return (
<<<<<<< HEAD
        <div className="bg-[#b7cbe3] p-3 mb-2">
            <div className="font-semibold mb-2">{title}</div>
            <div className="bg-white p-3">{children}</div>
=======
        <div className="rounded-[22px] border border-white/10 bg-slate-900/70 p-4 mb-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/50 font-semibold">{title}</div>
            <div className="space-y-2">{children}</div>
>>>>>>> 9cf2f6ee88e9a7cae6adb7a96c3031553334ecb0
        </div>
    );
}

function CheckGrid({ items }: { items: string[] }) {
    return (
        <div className="grid grid-cols-4 gap-y-2 text-white/70">
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
            <input className="rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20" />
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
            <select className="rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20" />
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
            <select className="rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20" />
            <span className="text-white/50">Amount</span>
            <input className="rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1 text-[12px] text-white/90 outline-none transition focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20" />
            <span className="text-white/50">cc.</span>
        </div>
    );
}

/* ================= styles ================= */


