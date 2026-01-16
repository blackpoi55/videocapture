"use client";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, SlotInfo, Views } from "react-big-calendar";
import { addDays, addHours, addMonths, differenceInCalendarDays, format, getDay, parse, startOfWeek, subMonths } from "date-fns";
import th from "date-fns/locale/th";
import "react-big-calendar/lib/css/react-big-calendar.css";

type CaseItem = {
  id: string;
  patient: string;
  doctor: string;
  camera: string;
  time: string;
  date: string;
  procedure: string;
  status: "Confirmed" | "Monitoring" | "Ready" | "Review";
};

type BigCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patient: string;
  camera: string;
  status: CaseItem["status"];
  doctor: string;
  procedure: string;
};

const locales = { th };

const localizer = dateFnsLocalizer({
  format,
  parse: (value, formatString) => parse(value, formatString, new Date()),
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

const isoFromDate = (date: Date | string) => {
  const target = typeof date === "string" ? new Date(date) : date;
  return target.toISOString().slice(0, 10);
};

const toDateSafe = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sampleCases: CaseItem[] = [
  {
    id: "IN-101",
    patient: "ด.ญ. พิมพ์ชีวา บัวแก้ว",
    doctor: "นพ. อภิชาติ",
    camera: "Cam 01 · OR 3",
    time: "08:30",
    date: isoFromDate(new Date()),
    procedure: "ตรวจกล้องภายใน",
    status: "Confirmed",
  },
  {
    id: "IN-102",
    patient: "นาย ยุทธนา พรมเลิศ",
    doctor: "นพ. ไตรภพ",
    camera: "Cam 02 · NICU",
    time: "10:15",
    date: isoFromDate(addDays(new Date(), 1)),
    procedure: "ส่องกล้องหลอดเลือด",
    status: "Monitoring",
  },
  {
    id: "IN-103",
    patient: "น.ส. รัตนา รุ่งเรือง",
    doctor: "นพ. กานต์",
    camera: "Cam 03 · OR 1",
    time: "14:15",
    date: isoFromDate(addDays(new Date(), 2)),
    procedure: "ตรวจกล้องกระดูก",
    status: "Ready",
  },
  {
    id: "IN-104",
    patient: "ด.ช. ปุณณวิชญ์ สำราญ",
    doctor: "นพ. เชิดชัย",
    camera: "Cam 04 · Ward",
    time: "13:20",
    date: isoFromDate(addDays(new Date(), 4)),
    procedure: "ตรวจกล้องช่องท้อง",
    status: "Review",
  },
];

const toCalendarEvent = (item: CaseItem): BigCalendarEvent => {
  const start = new Date(`${item.date}T${item.time}:00`);
  return {
    id: item.id,
    title: `${item.patient} · ${item.camera}`,
    start,
    end: addHours(start, 1),
    patient: item.patient,
    camera: item.camera,
    doctor: item.doctor,
    procedure: item.procedure,
    status: item.status,
  };
};

const statusColors: Record<CaseItem["status"], { bg: string; text: string }> = {
  Confirmed: { bg: "rgba(16, 185, 129, 0.15)", text: "#0fc08c" },
  Monitoring: { bg: "rgba(14, 165, 233, 0.18)", text: "#38bdf8" },
  Ready: { bg: "rgba(251, 191, 36, 0.18)", text: "#fbbf24" },
  Review: { bg: "rgba(244, 114, 182, 0.18)", text: "#f472b6" },
};

const formatThaiDisplay = (value: string) => {
  const parsed = toDateSafe(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
};

export default function Page() {
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState<Date>(today);
  const [filterDate, setFilterDate] = useState<string>(isoFromDate(today));
  const [rangeFrom, setRangeFrom] = useState<string>(isoFromDate(addDays(today, -3)));
  const [rangeTo, setRangeTo] = useState<string>(isoFromDate(addDays(today, 5)));
  const [view, setView] = useState<Views>(Views.MONTH);
  const [calendarEvents, setCalendarEvents] = useState<BigCalendarEvent[]>(sampleCases.map(toCalendarEvent));
  const [selectedEvent, setSelectedEvent] = useState<BigCalendarEvent | null>(calendarEvents[0] ?? null);
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("เลือกเคสที่ต้องการ แล้วกดวันที่เพื่อดูข้อมูล");
  const [timelineMode, setTimelineMode] = useState<"Calendar" | "Gantt">("Calendar");

  const parsedRangeFrom = toDateSafe(rangeFrom);
  const parsedRangeTo = toDateSafe(rangeTo);
  const rangeValid = Boolean(parsedRangeFrom && parsedRangeTo && parsedRangeFrom <= parsedRangeTo);
  const rangeDays = rangeValid ? differenceInCalendarDays(parsedRangeTo, parsedRangeFrom!) + 1 : 0;

  const eventsInRange = useMemo(() => {
    if (!rangeValid || !parsedRangeFrom || !parsedRangeTo) return [];
    return calendarEvents
      .filter((event) => event.start >= parsedRangeFrom && event.start <= parsedRangeTo)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [calendarEvents, parsedRangeFrom, parsedRangeTo, rangeValid]);

  const todayEvents = useMemo(() => {
    if (!filterDate) return [];
    return calendarEvents
      .filter((event) => isoFromDate(event.start) === filterDate)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [calendarEvents, filterDate]);

  const rangeCameraBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    eventsInRange.forEach((event) => {
      map.set(event.camera, (map.get(event.camera) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [eventsInRange]);

  const handleSelectEvent = (event: BigCalendarEvent) => {
    setSelectedEvent(event);
    setStatusMessage(`ดูรายละเอียด ${event.patient} · ${formatThaiDisplay(event.start.toISOString().slice(0, 10))}`);
  };

  const handleSelectSlot = (slot: SlotInfo) => {
    const iso = isoFromDate(slot.start);
    setFilterDate(iso);
    setSelectedSlotLabel(format(slot.start, "d MMM yyyy"));
    setStatusMessage(`เลือกวัน ${formatThaiDisplay(iso)} เพื่อจัดกล้อง`);
  };

  const addQuickTask = () => {
    const base = new Date(calendarDate);
    base.setHours(9, 0, 0, 0);
    const newEvent: BigCalendarEvent = {
      id: `adhoc-${Date.now()}`,
      title: `Task ใหม่ · ${format(base, "HH:mm")}`,
      patient: "ยังไม่ระบุ",
      camera: "Cam Pending",
      doctor: "ทีม Intraview",
      procedure: "รอคิวตรวจ",
      status: "Monitoring",
      start: new Date(base),
      end: addHours(base, 1),
    };
    setCalendarEvents((prev) => [...prev, newEvent]);
    setStatusMessage("เพิ่ม Task ใหม่เรียบร้อย สามารถเลือกวันที่ที่ต้องการได้เลย");
  };

  const headerRangeLabel = rangeValid
    ? `${formatThaiDisplay(rangeFrom)} – ${formatThaiDisplay(rangeTo)}`
    : "ยังไม่กำหนดช่วง";

  const handleMove = (direction: -1 | 1) => {
    setCalendarDate((prev) => addMonths(prev, direction));
  };

  const eventPropGetter = (event: BigCalendarEvent) => {
    const color = statusColors[event.status];
    return {
      style: {
        backgroundColor: color.bg,
        color: color.text,
        borderRadius: "16px",
        border: "none",
        padding: "6px 10px",
      },
    };
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-pink-900 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-10 h-[320px] w-[320px] rounded-full bg-white/20 blur-[140px]" />
        <div className="absolute right-10 top-40 h-[420px] w-[520px] rounded-full bg-pink-500/20 blur-[160px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1320px] flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.6em] text-white/60">Intraview</p>
            <h1 className="text-3xl font-semibold text-white">จัดการสตรีมกล้อง · Big Calenda</h1>
            <p className="text-sm text-white/70">อินเทอร์เฟซสว่างๆ คล้าย iOS สำหรับแพทย์ส่องกล้อง</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/40 bg-white/90 px-4 py-2 text-sm text-slate-900 shadow-lg shadow-white/50">admin@gmail.com</div>
            <button className="rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white/80">ลงชื่อเข้าใช้</button>
          </div>
        </header>

        <div className="flex flex-1 gap-6">
          <section className="w-[30%] min-w-[320px]">
            <div className="flex flex-col gap-4 rounded-[30px] border border-white/20 bg-white/80 px-6 py-6 shadow-[0_30px_80px_rgba(10,10,30,0.4)] backdrop-blur-3xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">EMR Intraview</h2>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">แดชบอร์ด</p>
                </div>
                <div className="flex gap-2 text-[11px] uppercase">
                  {["Calendar", "GanttChart"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTimelineMode(mode === "Calendar" ? "Calendar" : "Gantt")}
                      className={`rounded-full px-3 py-1 text-slate-700 transition ${
                        timelineMode === (mode === "Calendar" ? "Calendar" : "Gantt")
                          ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                          : "bg-white/70 hover:bg-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-pink-200/60 bg-gradient-to-br from-pink-100 to-white/60 p-4 text-sm text-slate-600 shadow-inner">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">ระยะเวลา</p>
                <p className="text-base font-semibold text-slate-900">
                  {headerRangeLabel}
                </p>
                <p className="text-xs text-slate-500">รวม {rangeValid ? `${rangeDays} วัน` : "ยังไม่กำหนด"} · {eventsInRange.length} เคส</p>
                <button
                  onClick={() => {
                    setRangeFrom(isoFromDate(today));
                    setRangeTo(isoFromDate(addDays(today, 6)));
                  }}
                  className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-700"
                >
                  สัปดาห์นี้
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">กรองวันที่</span>
                  <span className="text-[11px] text-slate-500">เลือกวัน</span>
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(event) => setFilterDate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-pink-400"
                />
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <label className="flex flex-col gap-1">
                    <span>จาก</span>
                    <input
                      type="date"
                      value={rangeFrom}
                      onChange={(event) => setRangeFrom(event.target.value)}
                      className="rounded-2xl border border-slate-200 px-2 py-1 text-sm outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>ถึง</span>
                    <input
                      type="date"
                      value={rangeTo}
                      onChange={(event) => setRangeTo(event.target.value)}
                      className="rounded-2xl border border-slate-200 px-2 py-1 text-sm outline-none"
                    />
                  </label>
                </div>
                {!rangeValid && <p className="text-[11px] text-rose-500">ช่วงวันที่ไม่ถูกต้อง</p>}
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-100 to-white p-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">รายการวันที่ {filterDate ? formatThaiDisplay(filterDate) : "ไม่ระบุ"}</h3>
                  <button
                    onClick={() => addQuickTask()}
                    className="rounded-full bg-pink-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white shadow-lg"
                  >
                    + Taskใหม่
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {todayEvents.length === 0 && (
                    <p className="text-[11px] text-slate-500">ยังไม่มีรายการวันนี้</p>
                  )}
                  {todayEvents.map((event) => (
                    <article
                      key={event.id}
                      onClick={() => handleSelectEvent(event)}
                      className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-[13px] text-slate-800 shadow-sm transition hover:border-pink-300 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                        <span>{event.status}</span>
                        <span>{event.start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="mt-1 truncate font-semibold">{event.patient}</p>
                      <p className="text-[11px] text-slate-500">{event.camera} · {event.procedure}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white/80 p-3 text-[12px] text-slate-600 shadow-inner">
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">รวมสายกล้อง</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rangeCameraBreakdown.map(([camera, count]) => (
                    <span key={camera} className="rounded-full border border-slate-200 px-3 py-1 text-[11px]">
                      {camera}: {count}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">ช่องที่เลือก {selectedSlotLabel || "ยังไม่ระบุ"}</p>
              </div>
            </div>
          </section>

          <section className="w-[70%]">
            <div className="relative overflow-hidden rounded-[40px] border border-white/30 bg-white/80 p-6 shadow-[0_50px_120px_rgba(15,23,42,0.45)]">
              <div className="pointer-events-none absolute inset-0 opacity-60">
                <div className="absolute -left-20 -top-14 h-[260px] w-[260px] rounded-full bg-indigo-400/50 blur-[140px]" />
                <div className="absolute right-10 bottom-0 h-[200px] w-[200px] rounded-full bg-pink-400/30 blur-[160px]" />
              </div>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Calendar</p>
                    <h2 className="text-2xl font-semibold text-slate-900">Big Calenda</h2>
                    <p className="text-[11px] text-slate-500">
                      Views: {view.toUpperCase()} · Day selection: {selectedSlotLabel || "ยังไม่ระบุ"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      onClick={() => setCalendarDate(today)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 transition hover:border-pink-400"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => handleMove(-1)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 transition hover:border-pink-400"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => handleMove(1)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 transition hover:border-pink-400"
                    >
                      Next
                    </button>
                    <div className="flex gap-2">
                      {[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA].map((current) => (
                        <button
                          key={current}
                          onClick={() => setView(current)}
                          className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                            view === current
                              ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                              : "border border-slate-200 bg-white text-slate-500"
                          }`}
                        >
                          {current}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col rounded-[30px] border border-slate-200 bg-white/90 p-4 shadow-xl">
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                    view={view}
                    onView={(next) => setView(next)}
                    date={calendarDate}
                    onNavigate={(date) => setCalendarDate(date)}
                    style={{ minHeight: 560 }}
                    onSelectEvent={handleSelectEvent}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    eventPropGetter={eventPropGetter}
                    dayLayoutAlgorithm="no-overlap"
                    tooltipAccessor={() => ""}
                    popup
                    components={{
                      toolbar: () => null,
                    }}
                  />
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-gradient-to-r from-purple-200/60 to-pink-200/50 p-4 text-[13px] text-slate-700 shadow-md">
                  <p className="font-semibold text-slate-900">สถานะล่าสุด</p>
                  <p className="text-sm text-slate-600">
                    {statusMessage}
                    {selectedEvent && (
                      <>
                        {" · "}
                        <span className="font-semibold">{selectedEvent.patient}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
