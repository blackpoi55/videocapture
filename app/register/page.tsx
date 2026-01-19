"use client";

import { useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

type PatientForm = {
  hn: string;
  an: string;
  prefix: string;
  firstName: string;
  lastName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  age: string;
  nationality: string;
  sex: string;
  phone: string;
  patientType: {
    op: boolean;
    ward: boolean;
    refer: boolean;
  };
  note: string;
};

const mockRecord: PatientForm = {
  hn: "12345678",
  an: "AN-5099",
  prefix: "นาย",
  firstName: "ปณต",
  lastName: "วีระสุข",
  dobDay: "09",
  dobMonth: "10",
  dobYear: "2539",
  age: "29",
  nationality: "ไทย",
  sex: "ชาย",
  phone: "089-555-1234",
  patientType: { op: true, ward: false, refer: false },
  note: "ผู้ป่วยติดตามตรวจ Intraview ทุก 6 เดือน",
};

const emptyForm: PatientForm = {
  hn: "",
  an: "",
  prefix: "",
  firstName: "",
  lastName: "",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
  age: "",
  nationality: "",
  sex: "",
  phone: "",
  patientType: { op: false, ward: false, refer: false },
  note: "",
};

const prefixOptions = ["นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ."];
const sexOptions = ["ชาย", "หญิง", "ไม่ระบุ"];
const nationalityOptions = ["ไทย", "ต่างชาติ"];

function formatDay(n: number) {
  return String(n).padStart(2, "0");
}

function formatMonth(n: number) {
  return String(n).padStart(2, "0");
}

export default function RegisterPage() {
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [mode, setMode] = useState<"create" | "update">("create");
  const [hnStatus, setHnStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const lastFetchedHnRef = useRef<string | null>(null);

  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => formatDay(i + 1)), []);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => formatMonth(i + 1)), []);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear() + 543;
    return Array.from({ length: 90 }, (_, i) => String(current - i));
  }, []);

  const updateField = (field: keyof PatientForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePatientType = (field: keyof PatientForm["patientType"], value: boolean) => {
    setForm((prev) => ({ ...prev, patientType: { ...prev.patientType, [field]: value } }));
  };

  const toast = (icon: "success" | "error" | "info", title: string, text?: string) =>
    Swal.fire({
      icon,
      title,
      text,
      toast: true,
      position: "top-end",
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    });

  const mockFetchByHn = async (hn: string) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (hn === "12345678") return mockRecord;
    return null;
  };

  const handleHnBlur = async () => {
    const hn = form.hn.replace(/\D/g, "");
    if (!hn) return;
    if (hn.length !== 8) {
      toast("error", "HN ต้องมี 8 หลัก");
      setHnStatus("idle");
      return;
    }
    if (lastFetchedHnRef.current === hn && hnStatus !== "idle") return;

    setHnStatus("loading");
    Swal.fire({
      title: "ค้นหา HN",
      text: "กำลังตรวจสอบข้อมูลในระบบ...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const result = await mockFetchByHn(hn);
    Swal.close();
    lastFetchedHnRef.current = hn;

    if (result) {
      setForm(result);
      setMode("update");
      setHnStatus("found");
      toast("success", "พบข้อมูลเดิมแล้ว", "สามารถแก้ไขและบันทึกได้เลย");
      return;
    }

    setMode("create");
    setHnStatus("notfound");
    setForm({ ...emptyForm, hn });
    toast("info", "ไม่พบข้อมูลเดิม", "กรอกข้อมูลเพิ่มเติมเพื่อเพิ่มผู้ป่วยใหม่");
  };

  const handleSave = async () => {
    const hn = form.hn.replace(/\D/g, "");
    if (hn.length !== 8) {
      toast("error", "กรุณากรอก HN ให้ครบ 8 หลัก");
      return;
    }
    if (!form.firstName || !form.lastName) {
      toast("error", "กรุณากรอกชื่อ-นามสกุล");
      return;
    }

    Swal.fire({
      title: mode === "update" ? "บันทึกข้อมูล" : "เพิ่มข้อมูล",
      text: "กำลังบันทึกข้อมูลผู้ป่วย...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    await new Promise((resolve) => setTimeout(resolve, 900));
    Swal.close();
    toast("success", mode === "update" ? "บันทึกข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ");
  };

  return (
    <main className="register-shell">
      <div className="register-bg">
        <div className="register-orb orb-one" />
        <div className="register-orb orb-two" />
      </div>

      <div className="register-wrap">
        <header className="register-header">
          <div>
            <p className="register-tag">Intraview · Register</p>
            <h1 className="register-title">ลงทะเบียนผู้ป่วย</h1>
            <p className="register-subtitle">กรอกข้อมูลใหม่หรืออัปเดตข้อมูลเดิมจาก HN</p>
          </div>
          <div className={`register-status ${hnStatus}`}>
            {hnStatus === "found" && "พบข้อมูลเดิม"}
            {hnStatus === "notfound" && "ยังไม่พบข้อมูล"}
            {hnStatus === "loading" && "กำลังค้นหา..."}
            {hnStatus === "idle" && "พร้อมกรอกข้อมูล"}
          </div>
        </header>

        <section className="register-card">
          <div className="register-grid">
            <div className="field full">
              <label>
                HN <span className="req">*</span>
              </label>
              <input
                value={form.hn}
                onChange={(e) => updateField("hn", e.target.value.replace(/\D/g, ""))}
                onBlur={handleHnBlur}
                placeholder="เช่น 12345678"
                maxLength={8}
              />
              <span className="hint">กรอก 8 หลัก แล้วระบบจะค้นหาอัตโนมัติ</span>
            </div>

            <div className="field">
              <label>AN</label>
              <input value={form.an} onChange={(e) => updateField("an", e.target.value)} placeholder="AN-0000" />
            </div>

            <div className="field">
              <label>Prefix</label>
              <select value={form.prefix} onChange={(e) => updateField("prefix", e.target.value)}>
                <option value="">เลือกคำนำหน้า</option>
                {prefixOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>
                Firstname <span className="req">*</span>
              </label>
              <input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
            </div>

            <div className="field">
              <label>
                Lastname <span className="req">*</span>
              </label>
              <input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
            </div>

            <div className="field dob">
              <label>Date of Birth</label>
              <div className="dob-row">
                <select value={form.dobDay} onChange={(e) => updateField("dobDay", e.target.value)}>
                  <option value="">DD</option>
                  {dayOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select value={form.dobMonth} onChange={(e) => updateField("dobMonth", e.target.value)}>
                  <option value="">MM</option>
                  {monthOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select value={form.dobYear} onChange={(e) => updateField("dobYear", e.target.value)}>
                  <option value="">YYYY</option>
                  {yearOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Age</label>
              <input value={form.age} onChange={(e) => updateField("age", e.target.value)} />
            </div>

            <div className="field">
              <label>Nationality</label>
              <select value={form.nationality} onChange={(e) => updateField("nationality", e.target.value)}>
                <option value="">เลือกสัญชาติ</option>
                {nationalityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Sex</label>
              <select value={form.sex} onChange={(e) => updateField("sex", e.target.value)}>
                <option value="">เลือกเพศ</option>
                {sexOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="08x-xxx-xxxx" />
            </div>

            <div className="field full">
              <label>Patient type</label>
              <div className="checkbox-row">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.patientType.op}
                    onChange={(e) => updatePatientType("op", e.target.checked)}
                  />
                  OP
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.patientType.ward}
                    onChange={(e) => updatePatientType("ward", e.target.checked)}
                  />
                  Ward
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.patientType.refer}
                    onChange={(e) => updatePatientType("refer", e.target.checked)}
                  />
                  Refer
                </label>
              </div>
            </div>

            <div className="field full">
              <label>Note</label>
              <textarea value={form.note} onChange={(e) => updateField("note", e.target.value)} rows={3} />
            </div>
          </div>

          <div className="register-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setForm(emptyForm);
                setMode("create");
                setHnStatus("idle");
                lastFetchedHnRef.current = null;
              }}
            >
              เคลียร์ฟอร์ม
            </button>
            <button type="button" className="primary" onClick={handleSave}>
              {mode === "update" ? "บันทึกข้อมูล" : "เพิ่มข้อมูล"}
            </button>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap");
      `}</style>
      <style jsx>{`
        .register-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top left, #fef9ef 0%, #f7fbff 45%, #eef6ff 100%);
          color: #0f172a;
          font-family: "Kanit", sans-serif;
          position: relative;
          overflow: hidden;
        }
        .register-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .register-orb {
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 999px;
          filter: blur(140px);
          opacity: 0.75;
        }
        .orb-one {
          top: -120px;
          left: -60px;
          background: rgba(56, 189, 248, 0.45);
        }
        .orb-two {
          bottom: -140px;
          right: -40px;
          background: rgba(16, 185, 129, 0.35);
        }
        .register-wrap {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px 64px;
        }
        .register-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }
        .register-tag {
          text-transform: uppercase;
          letter-spacing: 0.32em;
          font-size: 11px;
          color: rgba(51, 65, 85, 0.7);
        }
        .register-title {
          font-size: 32px;
          font-weight: 600;
          margin-top: 8px;
        }
        .register-subtitle {
          font-size: 14px;
          color: rgba(51, 65, 85, 0.7);
        }
        .register-status {
          padding: 10px 18px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.4);
        }
        .register-status.found {
          border-color: rgba(16, 185, 129, 0.7);
          color: #059669;
        }
        .register-status.notfound {
          border-color: rgba(248, 113, 113, 0.6);
          color: #ef4444;
        }
        .register-status.loading {
          border-color: rgba(59, 130, 246, 0.6);
          color: #2563eb;
        }
        .register-card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 28px;
          padding: 28px;
          backdrop-filter: blur(24px);
          box-shadow: 0 30px 80px rgba(148, 163, 184, 0.35);
        }
        .register-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field.full {
          grid-column: span 4;
        }
        .field.dob {
          grid-column: span 2;
        }
        label {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(51, 65, 85, 0.7);
        }
        input,
        select,
        textarea {
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(248, 250, 252, 0.9);
          color: #0f172a;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
        }
        input:focus,
        select:focus,
        textarea:focus {
          border-color: rgba(14, 165, 233, 0.7);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
        }
        .dob-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .hint {
          font-size: 12px;
          color: rgba(71, 85, 105, 0.7);
        }
        .req {
          color: #f87171;
        }
        .checkbox-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .check {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(15, 23, 42, 0.8);
        }
        .register-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .register-actions button {
          border-radius: 999px;
          padding: 12px 22px;
          border: 1px solid transparent;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .register-actions .ghost {
          background: transparent;
          border-color: rgba(148, 163, 184, 0.4);
          color: rgba(15, 23, 42, 0.6);
        }
        .register-actions .primary {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.9), rgba(16, 185, 129, 0.8));
          color: #0f172a;
        }
        @media (max-width: 1024px) {
          .register-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .field.full {
            grid-column: span 2;
          }
          .field.dob {
            grid-column: span 2;
          }
        }
        @media (max-width: 720px) {
          .register-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .register-grid {
            grid-template-columns: 1fr;
          }
          .field.full,
          .field.dob {
            grid-column: span 1;
          }
          .register-actions {
            flex-direction: column-reverse;
          }
        }
      `}</style>
    </main>
  );
}
