"use client";

import React, { useState } from "react";

export default function ColonoscopyResultPage() {
    return (
        <div className="bg-white w-[210mm] min-h-[297mm] mx-auto text-[10px] text-gray-800">

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
                    <input className="input-line" />
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
                    <input className="input-line" />
                </div>
            </Section>

            {/* ================= POST DIAGNOSIS ================= */}
            <Section title="POST-DIAGNOSIS">
                {["Dx1", "Dx2", "Dx3", "Dx4", "Dx5"].map((dx, i) => (
                    <div
                        key={dx}
                        className="grid grid-cols-[120px_1fr_24px] items-center gap-2 mb-1"
                    >
                        <div className={i === 0 ? "text-red-600 font-semibold" : ""}>
                            Post-diagnosis ({dx})
                        </div>
                        <input className="input-line" />
                        <span className="text-blue-600">📋</span>
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
                    <select className="input-line" />
                </div>

                <div className="mt-2">
                    <div className="text-red-600">Free Text</div>
                    <textarea className="textarea-box" />
                </div>
            </Section>

            {/* ================= RAPID UREASE TEST ================= */}
            <Section title="RAPID UREASE TEST">
                <CheckRow items={["Not done", "Done", "Positive", "Negative"]} />
                <textarea className="textarea-box mt-1 w-full" />
                <select className="input-line mb-1 w-full bg-gray-100" />
                <div>
                    <div className="text-red-600">Free Text</div>
                    <textarea className="textarea-box w-full" />
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
                <textarea className="textarea-box" />
            </Section>
        </div>
    );
}

/* ================= Small UI ================= */

function Section({ title, children }: any) {
    return (
        <div className="bg-[#b7cbe3] p-3 mb-2">
            <div className="font-semibold mb-2">{title}</div>
            <div className="bg-white p-3">{children}</div>
        </div>
    );
}

function CheckGrid({ items }: { items: string[] }) {
    return (
        <div className="grid grid-cols-4 gap-y-1">
            {items.map((i) => (
                <label key={i} className="flex items-center gap-1">
                    <input type="checkbox" />
                    {i}
                </label>
            ))}
        </div>
    );
}

function CheckRow({ items }: { items: string[] }) {
    return (
        <div className="flex flex-wrap gap-4">
            {items.map((i) => (
                <label key={i} className="flex items-center gap-1">
                    <input type="checkbox" />
                    {i}
                </label>
            ))}
        </div>
    );
}

function CheckWithInput({ label, unit }: any) {
    return (
        <div className="grid grid-cols-[1fr_60px_30px] gap-2 items-center">
            <label className="flex items-center gap-1">
                <input type="checkbox" />
                {label}
            </label>
            <input className="input-line" />
            <span>{unit}</span>
        </div>
    );
}

function CheckWithSelect({ label }: any) {
    return (
        <div className="grid grid-cols-[1fr_1fr] gap-2 items-center">
            <label className="flex items-center gap-1">
                <input type="checkbox" />
                {label}
            </label>
            <select className="input-line" />
        </div>
    );
}

function CheckWithAmount({ label }: any) {
    return (
        <div className="grid grid-cols-[1fr_1fr_40px_1fr_40px] gap-2 items-center">
            <label className="flex items-center gap-1">
                <input type="checkbox" />
                {label}
            </label>
            <select className="input-line" />
            <span>Amount</span>
            <input className="input-line" />
            <span>cc.</span>
        </div>
    );
}

/* ================= styles ================= */

const base =
    "border px-2 py-1 text-[10px] text-gray-700 w-full";

function inputStyle(extra = "") {
    return `${base} ${extra}`;
}

