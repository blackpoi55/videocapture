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
  an: string;
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

export default function ReportClient() {
  const [data, setData] = useState<ReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagesState, setImagesState] = useState<ReportImageItem[]>([]);
  const [originalImages, setOriginalImages] = useState<ReportImageItem[]>([]);
  const [printedAt, setPrintedAt] = useState<Date | null>(null);
  const [isReady, setIsReady] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsReady(false);
    setError(null);
    setPrintedAt(new Date());

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
        setData(null);
        setImagesState([]);
        setOriginalImages([]);
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
      setData(null);
      setImagesState([]);
      setOriginalImages([]);
    } finally {
      setIsReady(true);
    }
  }, [searchParams]);

  const moveImage = useCallback((id: string, direction: -1 | 1) => {
    setImagesState((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1) return prev;

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

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
        if (img.id !== id) return img;
        const nf = !img.featured;
        toggledOn = nf;
        return { ...img, featured: nf };
      });

      if (!toggledOn) return next;

      const featuredCount = next.filter((i) => i.featured).length;
      if (featuredCount <= 2) return next;

      const keep = new Set<string>([id]);
      for (const img of next) {
        if (keep.size >= 2) break;
        if (img.featured && img.id !== id) keep.add(img.id);
      }

      return next.map((img) =>
        img.featured && !keep.has(img.id)
          ? { ...img, featured: false }
          : img
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
    if (imagesState.length !== originalImages.length) return true;
    for (let i = 0; i < imagesState.length; i++) {
      const c = imagesState[i];
      const o = originalImages[i];
      if (!o || c.id !== o.id || c.featured !== o.featured) return true;
    }
    return false;
  }, [imagesState, originalImages]);

  const images = imagesState;

  const {
    featuredImages,
    firstPageImages,
    firstPageLimit,
    extraPages,
    extraCount,
  } = useMemo(() => {
    const featured = images.filter((i) => i.featured).slice(0, 2);
    const ids = new Set(featured.map((i) => i.id));
    const remain = images.filter((i) => !ids.has(i.id));

    const limit =
      featured.length === 2 ? 0 : featured.length === 1 ? 3 : 6;

    const first = remain.slice(0, limit);
    const rest = remain.slice(limit);

    const pages: ReportImageItem[][] = [];
    for (let i = 0; i < rest.length; i += 6) {
      pages.push(rest.slice(i, i + 6));
    }

    return {
      featuredImages: featured,
      firstPageImages: first,
      firstPageLimit: limit,
      extraPages: pages,
      extraCount: rest.length,
    };
  }, [images]);

  const firstPageSlots = useMemo(() => {
    if (firstPageLimit === 0) return [];
    if (!images.length)
      return Array.from({ length: firstPageLimit }, () => null);
    return firstPageImages;
  }, [firstPageImages, firstPageLimit, images.length]);

  const featuredCount = useMemo(
    () => imagesState.filter((i) => i.featured).length,
    [imagesState]
  );

  const totalPages = useMemo(
    () => 2 + extraPages.length,
    [extraPages.length]
  );

  const an = data?.an || "000000";

  const reportId = useMemo(() => {
    if (!printedAt) return `IV-${an}-`;
    const d = printedAt;
    const ds = `${d.getFullYear().toString().slice(-2)}${String(
      d.getMonth() + 1
    ).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `IV-${an}-${ds}`;
  }, [printedAt, an]);

  const safeDate = data?.date || "-";
  const safeHN = data?.hn || "-";
  const safeAN = data?.an || "-";

  const printStamp = useMemo(
    () => (printedAt ? printedAt.toLocaleString("th-TH") : "-"),
    [printedAt]
  );

  if (!isReady) {
    return (
      <main className="min-h-screen bg-[#eef2f6] text-slate-700">
        <div className="fixed inset-0 flex items-center justify-center">
          Loading...
        </div>
      </main>
    );
  }

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
              <Field label="AN" value={safeAN} />
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
            <span>หน้า 1 / {totalPages}</span>
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

          {firstPageLimit > 0 && (
            <div className="images-grid">
              {firstPageSlots.map((img, idx) => (
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
          )}

          {extraCount > 0 && (
            <div className="extra-note">มีภาพเพิ่มเติมต่อในหน้าถัดไปอีก {extraCount} รายการ</div>
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
            <span>หน้า 2 / {totalPages}</span>
          </footer>
        </section>

        {extraPages.map((page, index) => (
          <section key={`report-images-${index}`} className="report-page">
            <header className="report-header compact">
              <div>
                <div className="section-title">ภาพบันทึกการตรวจ (ต่อ)</div>
                <div className="subtle">Image Documentation / เลือกจากโฟลเดอร์ choose</div>
              </div>
              <div className="chip">HN: {safeHN}</div>
            </header>

            <div className="images-grid">
              {page.map((img) => (
                <figure key={img.id} className="image-card small">
                  <img src={img.dataUrl} alt={img.name} />
                  <figcaption>{img.name}</figcaption>
                </figure>
              ))}
            </div>

            <footer className="page-footer">
              <span>Confidential Medical Report</span>
              <span>หน้า {index + 3} / {totalPages}</span>
            </footer>
          </section>
        ))}
      </div>
    </main>
  );
}
