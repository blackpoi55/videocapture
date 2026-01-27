"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteSelectType,
  deleteSelectValue,
  getSelectTypes,
  getvaluebyselecttypeid,
  postSelectType,
  postSelectValue,
  putSelectType,
  putSelectValue,
} from "@/action/api";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const MasterSection = () => {
  const [selectTypes, setSelectTypes] = useState<
    Array<{ id: string; code: string; desc: string; isActive: boolean }>
  >([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [masterForm, setMasterForm] = useState({
    code: "",
    desc: "",
    isActive: false,
    id: "",
  });
  const [valueItems, setValueItems] = useState<
    Array<{ id: string; code: string; desc: string; isActive: boolean }>
  >([]);
  const [valueForm, setValueForm] = useState({ code: "", desc: "", isActive: true });
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [valueModalMode, setValueModalMode] = useState<"add" | "edit" | "delete">("add");
  const [activeValue, setActiveValue] = useState<{ id: string; code: string; desc: string; isActive: boolean } | null>(
    null
  );
  const [typeForm, setTypeForm] = useState({ code: "", desc: "", isActive: true });
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeModalMode, setTypeModalMode] = useState<"add" | "edit" | "delete">("add");
  const [activeType, setActiveType] = useState<{ id: string; code: string; desc: string; isActive: boolean } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [valueFilter, setValueFilter] = useState("");

  const loadTypes = useCallback(
    async (preferredId?: string, fallbackId?: string) => {
      setLoading(true);
      setError(null);
      const response = await getSelectTypes();
      if ((response as { error?: unknown })?.error) {
        setError((response as { message?: string })?.message || "โหลดรายการไม่สำเร็จ");
        setLoading(false);
        return;
      }
      const raw = (response as { data?: unknown })?.data ?? response;
      const items = Array.isArray(raw) ? raw : [];
      const mapped = items
        .map((item) => {
          const row = item as Record<string, unknown>;
          const id = String(row.id ?? row.selecttypeid ?? "").trim();
          const code = String(row.selecttypecode ?? row.code ?? "").trim();
          const desc = String(row.selecttypedesc ?? row.desc ?? "").trim();
          const isActive = Boolean(row.isactive ?? row.isActive);
          return id && code ? { id, code, desc, isActive } : null;
        })
        .filter(Boolean) as Array<{ id: string; code: string; desc: string; isActive: boolean }>;
      setSelectTypes(mapped);
      const nextSelected =
        (preferredId && mapped.find((item) => item.id === preferredId)?.id) ||
        (fallbackId && mapped.find((item) => item.id === fallbackId)?.id) ||
        mapped[0]?.id ||
        "";
      setSelectedTypeId(nextSelected);
      setLoading(false);
    },
    []
  );

  const loadValues = useCallback(
    async (typeId: string) => {
      if (!typeId) return;
      setDetailLoading(true);
      setError(null);
      const response = await getvaluebyselecttypeid(typeId);
      if ((response as { error?: unknown })?.error) {
        setError((response as { message?: string })?.message || "โหลดข้อมูลไม่สำเร็จ");
        setDetailLoading(false);
        return;
      }
      const raw = (response as { data?: unknown })?.data ?? response;
      const rows = Array.isArray(raw) ? raw : isRecord(raw) ? [raw] : [];
      const mappedValues = rows
        .map((item) => {
          const row = item as Record<string, unknown>;
          const id = String(row.id ?? row.valueid ?? "").trim();
          const code = String(row.valuecode ?? row.code ?? row.value ?? "").trim();
          const desc = String(row.valuedesc ?? row.desc ?? row.label ?? "").trim();
          const isActive = Boolean(row.isactive ?? row.isActive ?? true);
          return id && (code || desc) ? { id, code, desc, isActive } : null;
        })
        .filter(Boolean) as Array<{ id: string; code: string; desc: string; isActive: boolean }>;
      setValueItems(mappedValues);
      setEditingValueId(null);
      setValueForm({ code: "", desc: "", isActive: true });
      setDetailLoading(false);
    },
    []
  );

  const openTypeModal = (
    mode: "add" | "edit" | "delete",
    item?: { id: string; code: string; desc: string; isActive: boolean }
  ) => {
    setTypeModalMode(mode);
    setActiveType(item ?? null);
    if (mode === "add") {
      setEditingTypeId(null);
      setTypeForm({ code: "", desc: "", isActive: true });
    }
    if (mode === "edit" && item) {
      setEditingTypeId(item.id);
      setTypeForm({ code: item.code, desc: item.desc, isActive: item.isActive });
    }
    setTypeModalOpen(true);
  };

  const openValueModal = (
    mode: "add" | "edit" | "delete",
    item?: { id: string; code: string; desc: string; isActive: boolean }
  ) => {
    setValueModalMode(mode);
    setActiveValue(item ?? null);
    if (mode === "add") {
      setEditingValueId(null);
      setValueForm({ code: "", desc: "", isActive: true });
    }
    if (mode === "edit" && item) {
      setEditingValueId(item.id);
      setValueForm({ code: item.code, desc: item.desc, isActive: item.isActive });
    }
    setValueModalOpen(true);
  };

  const handleSaveType = useCallback(async () => {
    setError(null);
    if (typeModalMode === "delete" && activeType) {
      setLoading(true);
      const response = await deleteSelectType(activeType.id);
      setLoading(false);
      if ((response as { error?: unknown })?.error) {
        setError((response as { message?: string })?.message || "ลบไม่สำเร็จ");
        return;
      }
      setTypeModalOpen(false);
      const fallbackId = selectedTypeId === activeType.id ? "" : selectedTypeId;
      await loadTypes(undefined, fallbackId);
      return;
    }

    const code = typeForm.code.trim();
    if (!code) return;
    const payload = {
      selecttypecode: code,
      selecttypedesc: typeForm.desc.trim(),
      isactive: typeForm.isActive,
    };
    setLoading(true);
    const response =
      typeModalMode === "edit" && editingTypeId
        ? await putSelectType(editingTypeId, payload)
        : await postSelectType(payload);
    setLoading(false);
    if ((response as { error?: unknown })?.error) {
      setError((response as { message?: string })?.message || "บันทึกไม่สำเร็จ");
      return;
    }
    const raw = (response as { data?: unknown })?.data ?? response;
    const row = raw as Record<string, unknown>;
    const nextId = String(row?.id ?? row?.selecttypeid ?? editingTypeId ?? "").trim();
    setTypeModalOpen(false);
    setEditingTypeId(null);
    setTypeForm({ code: "", desc: "", isActive: true });
    await loadTypes(nextId || undefined, selectedTypeId);
  }, [
    activeType,
    editingTypeId,
    loadTypes,
    selectedTypeId,
    typeForm.code,
    typeForm.desc,
    typeForm.isActive,
    typeModalMode,
  ]);

  const handleSaveValue = useCallback(async () => {
    setError(null);
    if (!selectedTypeId) return;
    if (valueModalMode === "delete" && activeValue) {
      setDetailLoading(true);
      const response = await deleteSelectValue(activeValue.id);
      setDetailLoading(false);
      if ((response as { error?: unknown })?.error) {
        setError((response as { message?: string })?.message || "ลบไม่สำเร็จ");
        return;
      }
      setValueModalOpen(false);
      await loadValues(selectedTypeId);
      return;
    }

    const code = valueForm.code.trim();
    const desc = valueForm.desc.trim();
    if (!code && !desc) return;
    const payload = {
      selecttypeid: selectedTypeId,
      valuecode: code,
      valuedesc: desc,
      isactive: valueForm.isActive,
    };
    setDetailLoading(true);
    const response =
      valueModalMode === "edit" && editingValueId
        ? await putSelectValue(editingValueId, payload)
        : await postSelectValue(payload);
    setDetailLoading(false);
    if ((response as { error?: unknown })?.error) {
      setError((response as { message?: string })?.message || "บันทึกไม่สำเร็จ");
      return;
    }
    setValueModalOpen(false);
    setEditingValueId(null);
    setValueForm({ code: "", desc: "", isActive: true });
    await loadValues(selectedTypeId);
  }, [
    activeValue,
    editingValueId,
    loadValues,
    selectedTypeId,
    valueForm.code,
    valueForm.desc,
    valueForm.isActive,
    valueModalMode,
  ]);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    const selectedType = selectTypes.find((item) => item.id === selectedTypeId);
    if (!selectedType) return;
    setMasterForm({
      id: selectedType.id,
      code: selectedType.code,
      desc: selectedType.desc,
      isActive: selectedType.isActive,
    });
  }, [selectedTypeId, selectTypes]);

  useEffect(() => {
    if (!selectedTypeId) return;
    void loadValues(selectedTypeId);
  }, [selectedTypeId, loadValues]);

  const filteredSelectTypes = useMemo(() => {
    const query = typeFilter.trim().toLowerCase();
    if (!query) return selectTypes;
    return selectTypes.filter((item) => {
      const code = item.code.toLowerCase();
      const desc = item.desc.toLowerCase();
      return code.includes(query) || desc.includes(query);
    });
  }, [selectTypes, typeFilter]);

  const filteredValueItems = useMemo(() => {
    const query = valueFilter.trim().toLowerCase();
    if (!query) return valueItems;
    return valueItems.filter((item) => {
      const code = item.code.toLowerCase();
      const desc = item.desc.toLowerCase();
      return code.includes(query) || desc.includes(query);
    });
  }, [valueItems, valueFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Master Data</h2>
        <p className="text-sm text-white/50">จัดการข้อมูล master สำหรับ dropdown ต่าง ๆ</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[450px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/40">Types</div>
              <div className="text-sm font-semibold text-white/80">Select Type</div>
            </div>
            <div className="flex items-center gap-3">
              {loading && <span className="text-xs text-white/40">กำลังโหลด...</span>}
              <button
                type="button"
                onClick={() => openTypeModal("add")}
                className="rounded-full border border-teal-300/50 bg-teal-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-200 hover:bg-teal-500/20"
              >
                เพิ่ม
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
          <div className="mt-3">
            <input
              type="text"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              placeholder="ค้นหา Type"
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-white/80 outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
            />
          </div>
          <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">
            {filteredSelectTypes.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                ไม่พบรายการ
              </div>
            )}
            {filteredSelectTypes.map((item) => (
              <div
                key={item.id}
                className={`w-full rounded-xl border px-3 py-3 text-left text-xs transition ${
                  selectedTypeId === item.id
                    ? "border-teal-400/60 bg-teal-500/10 text-white shadow-[0_12px_24px_rgba(20,184,166,0.2)]"
                    : "border-transparent bg-transparent text-white/60 hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => setSelectedTypeId(item.id)} className="text-left w-[70%] cursor-pointer">
                    <div className="font-semibold">{item.code}</div>
                    <div className="text-[11px] text-white/40">{item.desc}</div>
                  </button>
                  <div className=" flex flex-wrap items-center justify-end gap-2 w-[30%]">
                    <button
                      type="button"
                      onClick={() => openTypeModal("edit", item)}
                      className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 hover:border-teal-300 hover:text-teal-200"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => openTypeModal("delete", item)}
                      className="rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200 hover:border-rose-300"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/40">รายการของประเภท</div>
              <div className="text-sm font-semibold text-white/80">{masterForm.code || "-"}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/40">{filteredValueItems.length} รายการ</div>
              <button
                type="button"
                onClick={() => openValueModal("add")}
                className="rounded-full border border-teal-300/50 bg-teal-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-200 hover:bg-teal-500/20"
              >
                เพิ่ม
              </button>
            </div>
          </div>
          {detailLoading && <p className="mt-2 text-xs text-white/40">กำลังโหลดข้อมูล...</p>}
          <div className="mt-3">
            <input
              type="text"
              value={valueFilter}
              onChange={(event) => setValueFilter(event.target.value)}
              placeholder="ค้นหารายการ"
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-white/80 outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
            />
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.24em] text-white/40">
                  <th className="border-b border-white/10 px-4 py-3">Code</th>
                  <th className="border-b border-white/10 px-4 py-3">Description</th>
                  <th className="border-b border-white/10 px-4 py-3">Status</th>
                  <th className="border-b border-white/10 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredValueItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-white/40">
                      ไม่พบรายการ
                    </td>
                  </tr>
                )}

                {filteredValueItems.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/5">
                    <td className="border-b border-white/10 px-4 py-3 font-semibold text-white/80">
                      {item.code || "-"}
                    </td>
                    <td className="border-b border-white/10 px-4 py-3 text-white/60">
                      {item.desc || "-"}
                    </td>
                    <td className="border-b border-white/10 px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                          item.isActive
                            ? "bg-teal-500/15 text-teal-200"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="border-b border-white/10 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openValueModal("edit", item)}
                          className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 hover:border-teal-300 hover:text-teal-200"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => openValueModal("delete", item)}
                          className="rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200 hover:border-rose-300"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {typeModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-[0_40px_120px_rgba(2,6,23,0.65)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">Select Type</p>
                <h3 className="text-xl font-semibold text-white">
                  {typeModalMode === "add"
                    ? "เพิ่มประเภท"
                    : typeModalMode === "edit"
                      ? "แก้ไขประเภท"
                      : "ลบประเภท"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTypeModalOpen(false)}
                className="rounded-full border border-teal-400/30 bg-teal-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200 hover:border-teal-300 hover:bg-teal-500/20"
              >
                ปิด
              </button>
            </div>

            <div className="space-y-4 p-6">
              {typeModalMode === "delete" ? (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                  ต้องการลบประเภท <span className="font-semibold">{activeType?.code}</span> ใช่หรือไม่?
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Code
                    <input
                      type="text"
                      value={typeForm.code}
                      onChange={(event) => setTypeForm((prev) => ({ ...prev, code: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white/90 outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Description
                    <input
                      type="text"
                      value={typeForm.desc}
                      onChange={(event) => setTypeForm((prev) => ({ ...prev, desc: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white/90 outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Status
                    <select
                      value={typeForm.isActive ? "active" : "inactive"}
                      onChange={(event) =>
                        setTypeForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white/90 outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-slate-950/60 px-6 py-4">
              <button
                type="button"
                onClick={() => setTypeModalOpen(false)}
                className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 hover:border-white/20"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveType}
                className={`rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white ${
                  typeModalMode === "delete" ? "bg-rose-500 hover:bg-rose-600" : "bg-teal-500 hover:bg-teal-600"
                }`}
              >
                {typeModalMode === "delete" ? "ลบ" : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {valueModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-[0_40px_120px_rgba(2,6,23,0.65)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">Select Value</p>
                <h3 className="text-xl font-semibold text-white">
                  {valueModalMode === "add"
                    ? "เพิ่มรายการ"
                    : valueModalMode === "edit"
                      ? "แก้ไขรายการ"
                      : "ลบรายการ"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setValueModalOpen(false)}
                className="rounded-full border border-teal-400/30 bg-teal-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200 hover:border-teal-300 hover:bg-teal-500/20"
              >
                ปิด
              </button>
            </div>

            <div className="space-y-4 p-6">
              {valueModalMode === "delete" ? (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                  ต้องการลบรายการ <span className="font-semibold">{activeValue?.code}</span> ใช่หรือไม่?
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Code
                    <input
                      type="text"
                      value={valueForm.code}
                      onChange={(event) => setValueForm((prev) => ({ ...prev, code: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white/90 outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Description
                    <input
                      type="text"
                      value={valueForm.desc}
                      onChange={(event) => setValueForm((prev) => ({ ...prev, desc: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white/90 outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                    />
                  </label>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Status
                    <select
                      value={valueForm.isActive ? "active" : "inactive"}
                      onChange={(event) =>
                        setValueForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white/90 outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/20"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-slate-950/60 px-6 py-4">
              <button
                type="button"
                onClick={() => setValueModalOpen(false)}
                className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 hover:border-white/20"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveValue}
                className={`rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white ${
                  valueModalMode === "delete" ? "bg-rose-500 hover:bg-rose-600" : "bg-teal-500 hover:bg-teal-600"
                }`}
              >
                {valueModalMode === "delete" ? "ลบ" : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
