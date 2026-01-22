"use client";

export const StorageSection = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold">Storage</h2>
      <p className="text-sm text-slate-500">ตำแหน่งจัดเก็บและรูปแบบไฟล์</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        โฟลเดอร์ต้นฉบับ
        <input
          type="text"
          placeholder="D:\\Capture\\Original"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        โฟลเดอร์เลือกแล้ว
        <input
          type="text"
          placeholder="D:\\Capture\\Choose"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        รูปแบบชื่อไฟล์
        <input
          type="text"
          placeholder="HN_DATE_SEQ"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
        />
      </label>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
        ความละเอียดภาพเริ่มต้น
        <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20">
          <option>1920 x 1080</option>
          <option>1280 x 720</option>
          <option>3840 x 2160</option>
        </select>
      </label>
    </div>
  </div>
);
