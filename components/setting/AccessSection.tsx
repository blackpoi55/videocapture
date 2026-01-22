"use client";

export const AccessSection = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold">Access</h2>
      <p className="text-sm text-slate-500">จัดการสิทธิ์และผู้ใช้งาน</p>
    </div>

    <div className="space-y-3">
      {[
        { name: "Admin", detail: "เข้าถึงทุกเมนู และจัดการระบบ" },
        { name: "Staff", detail: "ใช้งานถ่ายภาพและจัดการรายงาน" },
        { name: "Viewer", detail: "ดูรายงานเท่านั้น" },
      ].map((role) => (
        <div
          key={role.name}
          className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3"
        >
          <div>
            <div className="text-sm font-semibold text-slate-700">{role.name}</div>
            <div className="text-xs text-slate-500">{role.detail}</div>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 hover:border-teal-300 hover:text-teal-600"
          >
            จัดการ
          </button>
        </div>
      ))}
    </div>
  </div>
);
