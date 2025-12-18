"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ReportImage = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type ReportPayload = {
  date: string;
  hn: string;
  vn: string;
  images: ReportImage[];
};

type ReportImageItem = ReportImage & {
  id: string;
  featured: boolean;
};

const REPORT_STORAGE_KEY = "vcapture_report_payload";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="field-value">{value}</div>
    </div>
  );
}

export default function ReportPage() {
  const [data, setData] = useState<ReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagesState, setImagesState] = useState<ReportImageItem[]>([]);
  const [originalImages, setOriginalImages] = useState<ReportImageItem[]>([]);
  const printedAt = useMemo(() => new Date(), []);
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const payloadKey = searchParams.get("payload") || "";
      let raw: string | null = null;
      if (payloadKey) {
        raw = localStorage.getItem(payloadKey);
      }
      if (!raw) {
        raw = sessionStorage.getItem(REPORT_STORAGE_KEY);
      }
      if (!raw) {
        raw = localStorage.getItem(REPORT_STORAGE_KEY);
      }
      if (!raw) {
        setError("ไม่พบข้อมูลรีพอร์ท");
        return;
      }
      const parsed = JSON.parse(raw) as ReportPayload;
      const rawImages = Array.isArray(parsed.images) ? parsed.images : [];
      const prepared = rawImages.map((img, idx) => ({
        ...img,
        id: `${idx}-${img.name}-${img.size}`,
        featured: false,
      }));
      setData(parsed);
      setImagesState(prepared);
      setOriginalImages(prepared.map((img) => ({ ...img })));
      sessionStorage.setItem(REPORT_STORAGE_KEY, raw);
      if (payloadKey) {
        localStorage.removeItem(payloadKey);
      }
    } catch {
      setError("อ่านข้อมูลรีพอร์ทไม่สำเร็จ");
    }
  }, [searchParams]);

  const moveImage = useCallback((id: string, direction: -1 | 1) => {
    setImagesState((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1) {
        return prev;
      }
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.splice(nextIndex, 0, picked);
      return next;
    });
  }, []);

  const toggleFeatured = useCallback((id: string) => {
    setImagesState((prev) => {
      let toggledOn = false;
      const next = prev.map((img) => {
        if (img.id !== id) {
          return img;
        }
        const nextFeatured = !img.featured;
        toggledOn = nextFeatured;
        return { ...img, featured: nextFeatured };
      });

      if (!toggledOn) {
        return next;
      }

      const featuredCount = next.filter((img) => img.featured).length;
      if (featuredCount <= 2) {
        return next;
      }

      const keep = new Set<string>([id]);
      for (const img of next) {
        if (keep.size >= 2) {
          break;
        }
        if (img.featured && img.id !== id) {
          keep.add(img.id);
        }
      }

      return next.map((img) =>
        img.featured && !keep.has(img.id) ? { ...img, featured: false } : img
      );
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setImagesState((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const resetImages = useCallback(() => {
    setImagesState(originalImages.map((img) => ({ ...img })));
  }, [originalImages]);

  const isDirty = useMemo(() => {
    if (!imagesState.length && !originalImages.length) {
      return false;
    }
    if (imagesState.length !== originalImages.length) {
      return true;
    }
    for (let i = 0; i < imagesState.length; i += 1) {
      const current = imagesState[i];
      const original = originalImages[i];
      if (!original) {
        return true;
      }
      if (current.id !== original.id || current.featured !== original.featured) {
        return true;
      }
    }
    return false;
  }, [imagesState, originalImages]);

  const images = imagesState;
  const { featuredImages, pageImages, extraCount, smallLimit } = useMemo(() => {
    const featured = images.filter((img) => img.featured);
    const featuredLimited = featured.slice(0, 2);
    const featuredIds = new Set(featuredLimited.map((img) => img.id));
    const remaining = images.filter((img) => !featuredIds.has(img.id));
    const limit =
      featuredLimited.length === 2 ? 0 : featuredLimited.length === 1 ? 3 : 6;
    const page = remaining.slice(0, limit);
    const extra = Math.max(0, images.length - (featuredLimited.length + page.length));
    return {
      featuredImages: featuredLimited,
      pageImages: page,
      extraCount: extra,
      smallLimit: limit,
    };
  }, [images]);

  const smallSlots = useMemo(() => {
    const slots: Array<ReportImageItem | null> = [...pageImages];
    const missing = Math.max(0, smallLimit - slots.length);
    for (let i = 0; i < missing; i += 1) {
      slots.push(null);
    }
    return slots;
  }, [pageImages, smallLimit]);

  const featuredCount = useMemo(
    () => imagesState.filter((img) => img.featured).length,
    [imagesState]
  );

  const reportId = `IV-${data?.vn || "000000"}-${printedAt.getFullYear().toString().slice(-2)}${String(
    printedAt.getMonth() + 1
  ).padStart(2, "0")}${String(printedAt.getDate()).padStart(2, "0")}`;

  const safeDate = data?.date || "-";
  const safeHN = data?.hn || "-";
  const safeVN = data?.vn || "-";
  const printStamp = printedAt.toLocaleString("th-TH");

  return (
    <main className="report-root">
      <div className="report-toolbar">
        <button type="button" className="print-btn" onClick={() => window.print()}>
          PDF Print
        </button>
      </div>

      {error && <div className="report-error">{error}</div>}

      <div className="report-editor">
        <div className="editor-head">
          <div>
            <div className="editor-title">จัดการรูปในรีพอร์ท</div>
            <div className="editor-subtitle">
              เรียงลำดับ, เลือกรูปใหญ่ (สูงสุด 2), หรือลบรูปที่ไม่ต้องการก่อนพิมพ์
            </div>
          </div>
          <button
            type="button"
            className="editor-btn reset-btn"
            onClick={resetImages}
            disabled={!isDirty}
          >
            คืนค่า
          </button>
        </div>
        {imagesState.length === 0 ? (
          <div className="editor-empty">ไม่มีรูปสำหรับรีพอร์ท</div>
        ) : (
          <div className="editor-list">
            {imagesState.map((img, idx) => (
              <div key={img.id} className="editor-item">
                <img className="editor-thumb" src={img.dataUrl} alt={img.name} />
                <div className="editor-info">
                  <div className="editor-name">{img.name}</div>
                  <div className="editor-meta">{Math.max(1, Math.round(img.size / 1024))} KB</div>
                </div>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="editor-btn"
                    onClick={() => moveImage(img.id, -1)}
                    disabled={idx === 0}
                  >
                    ขึ้น
                  </button>
                  <button
                    type="button"
                    className="editor-btn"
                    onClick={() => moveImage(img.id, 1)}
                    disabled={idx === imagesState.length - 1}
                  >
                    ลง
                  </button>
                  <button
                    type="button"
                    className={`editor-btn ${img.featured ? "active" : ""}`}
                    onClick={() => toggleFeatured(img.id)}
                  >
                    {img.featured ? "ใหญ่แล้ว" : "รูปใหญ่"}
                  </button>
                  <button
                    type="button"
                    className="editor-btn danger"
                    onClick={() => removeImage(img.id)}
                  >
                    เอาออก
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="editor-foot">
          <span>ทั้งหมด {imagesState.length} รูป</span>
          <span>รูปใหญ่ {featuredCount}/2</span>
        </div>
      </div>

      <div className="report-pages">
        <section className="report-page">
          <header className="report-header">
            <div className="brand">
              <div className="brand-mark">IV</div>
              <div className="brand-text">
                <div className="brand-title">INTRAVIEW MEDICAL</div>
                <div className="brand-subtitle">รายงานผลการตรวจภายใน</div>
              </div>
            </div>
            <div className="header-meta">
              <div className="meta-row">
                <span>Report ID</span>
                <strong>{reportId}</strong>
              </div>
              <div className="meta-row">
                <span>Report Date</span>
                <strong>{safeDate}</strong>
              </div>
              <div className="meta-row">
                <span>Printed</span>
                <strong>{printStamp}</strong>
              </div>
            </div>
          </header>

          <section className="section">
            <div className="section-head">
              <div className="section-title">ข้อมูลผู้ป่วย</div>
              <div className="chip">Internal Exam</div>
            </div>
            <div className="grid-3">
              <Field label="HN" value={safeHN} />
              <Field label="VN" value={safeVN} />
              <Field label="วันที่ตรวจ" value={safeDate} />
              <Field label="ชื่อผู้ป่วย" value="นางสาวกุลธิดา กุลชัย" />
              <Field label="อายุ" value="34 ปี" />
              <Field label="เพศ" value="หญิง" />
              <Field label="แพทย์ผู้ตรวจ" value="นพ. ธีรณัฐ วชิรานนท์" />
              <Field label="แผนก" value="สูติ-นรีเวช" />
              <Field label="สิทธิ" value="ชำระเงินสด" />
            </div>
          </section>

          <section className="section two-col">
            <div className="panel">
              <div className="section-title">รายละเอียดการตรวจ</div>
              <ul className="list">
                <li>วิธีการตรวจ: ตรวจภายใน + Ultrasound ช่องคลอด</li>
                <li>ข้อบ่งชี้: ปวดท้องน้อยเรื้อรัง, ประจำเดือนผิดปกติ</li>
                <li>เครื่องมือ: Transvaginal probe 7.5 MHz</li>
                <li>การให้ยา: ไม่ได้รับยาระงับความรู้สึก</li>
              </ul>
            </div>
            <div className="panel">
              <div className="section-title">สัญญาณชีพก่อนตรวจ</div>
              <div className="grid-2">
                <Field label="BP" value="118/72 mmHg" />
                <Field label="HR" value="78 bpm" />
                <Field label="Temp" value="36.7 C" />
                <Field label="SpO2" value="98%" />
                <Field label="น้ำหนัก" value="52.4 kg" />
                <Field label="ส่วนสูง" value="160 cm" />
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-title">ผลการตรวจ (Findings)</div>
            <div className="findings">
              <div className="finding">
                มดลูกขนาดปกติ แนวแกนปกติ รูปร่างสม่ำเสมอ
              </div>
              <div className="finding">
                เยื่อบุโพรงมดลูกหนา 7 มม. ไม่พบก้อนหรือสิ่งแปลกปลอม
              </div>
              <div className="finding">
                พบถุงน้ำรังไข่ขวาขนาดประมาณ 2.1 ซม. ลักษณะ simple cyst
              </div>
              <div className="finding">
                รังไข่ซ้ายปกติ ไม่พบ free fluid ในช่องท้อง
              </div>
              <div className="finding">
                ปากมดลูกปกติ ไม่พบรอยโรคหรือเลือดออกผิดปกติ
              </div>
            </div>
          </section>

          <section className="section summary">
            <div className="section-title">สรุป / วินิจฉัย</div>
            <div className="summary-box">
              ภาวะถุงน้ำรังไข่ขวาขนาดเล็ก (simple ovarian cyst) ไม่พบภาวะแทรกซ้อนเร่งด่วน
            </div>
          </section>

          <section className="section">
            <div className="section-title">แผนการรักษาและคำแนะนำ</div>
            <div className="grid-2">
              <div className="note-box">
                ติดตามอาการและทำอัลตราซาวด์ซ้ำใน 4-6 สัปดาห์
              </div>
              <div className="note-box">
                หากมีอาการปวดท้องรุนแรง เลือดออกผิดปกติ หรือไข้ ให้มาพบแพทย์ทันที
              </div>
            </div>
          </section>

          <div className="signature">
            <div>
              <div className="signature-line" />
              <div className="signature-label">แพทย์ผู้รายงาน</div>
            </div>
            <div>
              <div className="signature-line" />
              <div className="signature-label">ผู้ช่วยแพทย์/พยาบาล</div>
            </div>
          </div>

          <footer className="page-footer">
            <span>Intraview Medical Center</span>
            <span>หน้า 1 / 2</span>
          </footer>
        </section>

        <section className="report-page">
          <header className="report-header compact">
            <div>
              <div className="section-title">ภาพบันทึกการตรวจ</div>
              <div className="subtle">Image Documentation / เลือกจากโฟลเดอร์ choose</div>
            </div>
            <div className="chip">HN: {safeHN}</div>
          </header>

          {featuredImages.length > 0 && (
            <div className="featured-block">
              <div className="featured-label">ภาพใหญ่</div>
              <div className="images-featured">
                {featuredImages.map((img) => (
                  <figure key={img.id} className="image-card large">
                    <img src={img.dataUrl} alt={img.name} />
                    <figcaption>{img.name}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}

          <div className="images-grid">
            {smallSlots.map((img, idx) => (
              <figure key={img ? img.id : `slot-${idx}`} className="image-card small">
                {img ? (
                  <img src={img.dataUrl} alt={img.name} />
                ) : (
                  <div className="image-placeholder">Image</div>
                )}
                <figcaption>{img ? img.name : "ภาพประกอบ"}</figcaption>
              </figure>
            ))}
          </div>

          {extraCount > 0 && (
            <div className="extra-note">มีภาพเพิ่มเติมอีก {extraCount} รายการ (แสดงเฉพาะหน้า 2)</div>
          )}

          <section className="section">
            <div className="section-title">สรุปนัดหมาย</div>
            <div className="grid-3">
              <Field label="วันนัดถัดไป" value="ภายใน 4-6 สัปดาห์" />
              <Field label="แผนกติดตาม" value="สูติ-นรีเวช" />
              <Field label="เบอร์โทรติดต่อ" value="02-888-8888" />
            </div>
          </section>

          <footer className="page-footer">
            <span>Confidential Medical Report</span>
            <span>หน้า 2 / 2</span>
          </footer>
        </section>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap");
        :root {
          --report-ink: #0b1020;
          --report-muted: #536079;
          --report-accent: #0f766e;
          --report-accent-2: #14b8a6;
          --report-line: #d9e1ea;
          --report-paper: #fdfcf8;
          --report-title-font: "Playfair Display", "Noto Sans Thai", serif;
          --report-body-font: "Noto Sans Thai", serif;
        }
        .report-root {
          min-height: 100vh;
          background: radial-gradient(1200px 600px at 15% -10%, rgba(20, 184, 166, 0.18), transparent),
            radial-gradient(900px 500px at 90% 15%, rgba(250, 204, 21, 0.12), transparent),
            #eef2f6;
          color: var(--report-ink);
          padding: 24px;
          font-family: var(--report-body-font);
        }
        .report-toolbar {
          max-width: 900px;
          margin: 0 auto 16px;
          display: flex;
          justify-content: flex-end;
        }
        .print-btn {
          border: 1px solid rgba(15, 118, 110, 0.35);
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(15, 118, 110, 0.3));
          color: #0b1020;
          padding: 10px 16px;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
        }
        .report-error {
          max-width: 900px;
          margin: 0 auto 16px;
          color: #b91c1c;
          font-weight: 600;
        }
        .report-editor {
          width: min(210mm, 100%);
          margin: 0 auto 20px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(15, 118, 110, 0.2);
          border-radius: 16px;
          padding: 12px 14px;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
        }
        .editor-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .editor-title {
          font-family: var(--report-title-font);
          font-size: 14px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--report-accent);
        }
        .editor-subtitle {
          font-size: 12px;
          color: var(--report-muted);
          margin-top: 4px;
        }
        .editor-list {
          display: grid;
          gap: 8px;
          margin-top: 12px;
          max-height: 260px;
          overflow: auto;
          padding-right: 4px;
        }
        .editor-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 8px;
          border-radius: 12px;
          border: 1px solid rgba(15, 118, 110, 0.14);
          background: rgba(255, 255, 255, 0.9);
        }
        .editor-thumb {
          width: 54px;
          height: 54px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid var(--report-line);
        }
        .editor-name {
          font-size: 12px;
          font-weight: 600;
        }
        .editor-meta {
          font-size: 11px;
          color: var(--report-muted);
        }
        .editor-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
        }
        .editor-btn {
          border: 1px solid rgba(15, 118, 110, 0.25);
          background: #fff;
          color: var(--report-ink);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          cursor: pointer;
        }
        .editor-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .editor-btn.active {
          background: rgba(20, 184, 166, 0.18);
          border-color: rgba(15, 118, 110, 0.45);
          color: var(--report-accent);
          font-weight: 600;
        }
        .editor-btn.danger {
          border-color: rgba(185, 28, 28, 0.45);
          color: #b91c1c;
        }
        .editor-btn.reset-btn {
          white-space: nowrap;
          background: rgba(15, 118, 110, 0.1);
          font-weight: 600;
        }
        .editor-empty {
          margin-top: 12px;
          padding: 12px;
          border: 1px dashed var(--report-line);
          border-radius: 12px;
          color: var(--report-muted);
          font-size: 12px;
          text-align: center;
        }
        .editor-foot {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--report-muted);
        }
        .report-pages {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }
        .report-page {
          width: 210mm;
          height: 297mm;
          background: linear-gradient(180deg, rgba(20, 184, 166, 0.05), rgba(253, 252, 248, 0) 40%), var(--report-paper);
          border: 1px solid var(--report-line);
          border-radius: 18px;
          padding: 16mm 14mm;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 10mm;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid rgba(15, 118, 110, 0.2);
          padding-bottom: 6mm;
        }
        .report-header.compact {
          padding-bottom: 4mm;
          border-bottom-style: dashed;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-mark {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: white;
          display: grid;
          place-items: center;
          font-family: var(--report-title-font);
          font-size: 18px;
          letter-spacing: 0.08em;
        }
        .brand-title {
          font-family: var(--report-title-font);
          font-size: 20px;
          letter-spacing: 0.06em;
        }
        .brand-subtitle {
          color: var(--report-muted);
          font-size: 13px;
          margin-top: 2px;
        }
        .header-meta {
          text-align: right;
          font-size: 12px;
          color: var(--report-muted);
        }
        .meta-row {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .meta-row strong {
          color: var(--report-ink);
        }
        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .section-title {
          font-family: var(--report-title-font);
          font-size: 13px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--report-accent);
        }
        .chip {
          border: 1px solid rgba(15, 118, 110, 0.3);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          color: var(--report-accent);
          background: rgba(20, 184, 166, 0.12);
          font-weight: 600;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px 16px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 16px;
        }
        .field-label {
          font-size: 11px;
          color: var(--report-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .field-value {
          font-size: 13px;
          font-weight: 600;
          margin-top: 2px;
        }
        .section.two-col {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 16px;
        }
        .panel {
          background: rgba(15, 118, 110, 0.05);
          border: 1px solid rgba(15, 118, 110, 0.12);
          padding: 12px;
          border-radius: 12px;
        }
        .list {
          padding-left: 16px;
          color: var(--report-muted);
          font-size: 13px;
          line-height: 1.6;
        }
        .findings {
          display: grid;
          gap: 8px;
          color: var(--report-ink);
          font-size: 13px;
        }
        .finding {
          border-left: 3px solid rgba(15, 118, 110, 0.5);
          padding-left: 10px;
        }
        .summary-box {
          background: rgba(15, 118, 110, 0.08);
          border: 1px solid rgba(15, 118, 110, 0.2);
          padding: 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
        }
        .note-box {
          background: #fff;
          border: 1px dashed rgba(15, 118, 110, 0.25);
          padding: 10px;
          border-radius: 10px;
          font-size: 12px;
          color: var(--report-muted);
        }
        .signature {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-top: auto;
        }
        .signature-line {
          border-bottom: 1px solid var(--report-line);
          height: 18px;
        }
        .signature-label {
          font-size: 11px;
          color: var(--report-muted);
          margin-top: 6px;
        }
        .featured-block {
          display: grid;
          gap: 6px;
          margin-bottom: 6px;
        }
        .featured-label {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--report-muted);
        }
        .images-featured {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .images-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .image-card {
          border: 1px solid var(--report-line);
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          display: flex;
          flex-direction: column;
        }
        .image-card img {
          width: 100%;
          height: 110px;
          object-fit: contain;
          background: #fff;
          display: block;
        }
        .image-placeholder {
          width: 100%;
          height: 110px;
          background: linear-gradient(135deg, rgba(15, 118, 110, 0.12), rgba(14, 116, 144, 0.08));
          display: grid;
          place-items: center;
          color: var(--report-muted);
          font-size: 12px;
        }
        .image-card.large img,
        .image-card.large .image-placeholder {
          height: 400px;
        }
        .image-card figcaption {
          padding: 6px 8px;
          font-size: 11px;
          color: var(--report-muted);
          border-top: 1px solid var(--report-line);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .extra-note {
          font-size: 12px;
          color: var(--report-muted);
          margin-top: 6px;
        }
        .subtle {
          font-size: 12px;
          color: var(--report-muted);
        }
        .page-footer {
          position: absolute;
          left: 14mm;
          right: 14mm;
          bottom: 10mm;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--report-muted);
        }
        @media (max-width: 900px) {
          .report-page {
            width: 100%;
            border-radius: 14px;
          }
          .report-editor {
            width: 100%;
          }
          .editor-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .editor-item {
            grid-template-columns: auto 1fr;
          }
          .editor-actions {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
          .images-featured {
            grid-template-columns: 1fr;
          }
          .grid-3,
          .grid-2,
          .section.two-col {
            grid-template-columns: 1fr;
          }
          .images-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: #fff !important;
            margin: 0 !important;
          }
          .report-root {
            padding: 0;
            background: #fff;
          }
          .report-pages {
            gap: 0;
          }
          .report-toolbar,
          .report-error,
          .report-editor {
            display: none !important;
          }
          .report-page {
            break-after: page;
            page-break-after: always;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .report-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .grid-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .grid-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .section.two-col {
            grid-template-columns: 1.3fr 1fr !important;
          }
          .images-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .images-featured {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
