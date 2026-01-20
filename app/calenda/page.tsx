"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Calendar, dateFnsLocalizer, SlotInfo, View, Views } from "react-big-calendar";
import {
  addDays,
  addHours,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  format,
  getDay,
  parse,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale/th";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Swal from "sweetalert2";

type CaseItem = {
  id: string;
  hn: string;
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
  meta?: CaseMeta;
};

type PatientInfo = {
  hn: string;
  an: string;
  prefix: string;
  firstName: string;
  lastName: string;
  dob: string;
  age: string;
  nationality: string;
  sex: string;
  phone: string;
};

type RegistrationInfo = {
  registerDate: string;
  registerTime: string;
  appointmentDate: string;
  appointmentTime: string;
  operationDate: string;
  timeFrom: string;
  timeTo: string;
  caseNo: string;
};

type ProcedureInfo = {
  room: string;
  procedure: string;
  mainProcedure: string;
  financial: string;
  indication: string;
  rapid: string;
  histopath: string;
  sub: string;
  caseType: string;
  anesthe: string;
  anestheAssist: string;
};

type PhysicianInfo = {
  physician: string;
  nurse1: string;
  nurse2: string;
  staff1: string;
  staff2: string;
  preDiagnosis: string;
  dx1: string;
  dx2: string;
};

type CaseForm = {
  hn: string;
  patient: PatientInfo | null;
  registration: RegistrationInfo;
  procedure: ProcedureInfo;
  physician: PhysicianInfo;
};

type CaseMeta = {
  hn: string;
  patient: PatientInfo | null;
  registration: RegistrationInfo;
  procedure: ProcedureInfo;
  physician: PhysicianInfo;
};

const locales = { th };

const localizer = dateFnsLocalizer({
  format,
  parse: (value: string, formatString: string) => parse(value, formatString, new Date()),
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

const toLocalDate = (value: string) => {
  const parsedLocal = parse(value, "yyyy-MM-dd", new Date());
  if (!Number.isNaN(parsedLocal.getTime())) return parsedLocal;
  const parsed = new Date(value);
  return parsed;
};

const isoFromDate = (date: Date | string) => {
  const target = typeof date === "string" ? toLocalDate(date) : date;
  return format(target, "yyyy-MM-dd");
};

const toDateSafe = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = toLocalDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sampleCases: CaseItem[] = [
  {
    id: "IN-101",
    hn: "12345678",
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
    hn: "22334455",
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
    hn: "33445566",
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
    hn: "44556677",
    patient: "ด.ช. ปุณณวิชญ์ สำราญ",
    doctor: "นพ. เชิดชัย",
    camera: "Cam 04 · Ward",
    time: "13:20",
    date: isoFromDate(addDays(new Date(), 4)),
    procedure: "ตรวจกล้องช่องท้อง",
    status: "Review",
  },
  {
    id: "IN-105",
    hn: "55667788",
    patient: "น.ส. จิราภรณ์ เทพทา",
    doctor: "นพ. หรรษา",
    camera: "Cam 05 · OR 2",
    time: "11:10",
    date: isoFromDate(new Date()),
    procedure: "ส่องกล้องระบบทางเดินอาหาร",
    status: "Monitoring",
  },
  {
    id: "IN-106",
    hn: "66778899",
    patient: "นาย ปณต วีระสุข",
    doctor: "นพ. วรินทร์",
    camera: "Cam 03 · OR 1",
    time: "16:20",
    date: isoFromDate(new Date()),
    procedure: "ตรวจกล้องไต",
    status: "Confirmed",
  },
  {
    id: "IN-107",
    hn: "77889900",
    patient: "น.ส. สิตา โชติชัย",
    doctor: "นพ. อภิชาติ",
    camera: "Cam 02 · OR 2",
    time: "09:10",
    date: isoFromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 19)),
    procedure: "ส่องกล้องหลอดเลือด",
    status: "Monitoring",
  },
  {
    id: "IN-108",
    hn: "88990011",
    patient: "นาย ธนกร ใจดี",
    doctor: "นพ. กานต์",
    camera: "Cam 01 · OR 3",
    time: "10:00",
    date: isoFromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 19)),
    procedure: "ตรวจกล้องภายใน",
    status: "Ready",
  },
  {
    id: "IN-109",
    hn: "99001122",
    patient: "น.ส. จิตรา ศรีสุข",
    doctor: "นพ. ไตรภพ",
    camera: "Cam 03 · OR 1",
    time: "11:40",
    date: isoFromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 19)),
    procedure: "ตรวจกล้องกระดูก",
    status: "Confirmed",
  },
  {
    id: "IN-110",
    hn: "10111223",
    patient: "ด.ญ. นลิน วัฒน์ชัย",
    doctor: "นพ. เชิดชัย",
    camera: "Cam 04 · Ward",
    time: "13:15",
    date: isoFromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 19)),
    procedure: "ตรวจกล้องช่องท้อง",
    status: "Review",
  },
  {
    id: "IN-111",
    hn: "12131425",
    patient: "นาย วรเดช สีทอง",
    doctor: "นพ. วรินทร์",
    camera: "Cam 05 · OR 2",
    time: "15:30",
    date: isoFromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 19)),
    procedure: "ส่องกล้องระบบทางเดินอาหาร",
    status: "Monitoring",
  },
];

const mockPatientByHn: Record<string, PatientInfo> = {
  "12345678": {
    hn: "12345678",
    an: "AN-5099",
    prefix: "นาย",
    firstName: "ปณต",
    lastName: "วีระสุข",
    dob: "2539-10-09",
    age: "29",
    nationality: "ไทย",
    sex: "ชาย",
    phone: "089-555-1234",
  },
  "22334455": {
    hn: "22334455",
    an: "AN-1832",
    prefix: "นาย",
    firstName: "ยุทธนา",
    lastName: "พรมเลิศ",
    dob: "2538-04-21",
    age: "30",
    nationality: "ไทย",
    sex: "ชาย",
    phone: "081-222-3344",
  },
  "33445566": {
    hn: "33445566",
    an: "AN-2210",
    prefix: "นางสาว",
    firstName: "รัตนา",
    lastName: "รุ่งเรือง",
    dob: "2542-11-02",
    age: "26",
    nationality: "ไทย",
    sex: "หญิง",
    phone: "084-919-2020",
  },
  "44556677": {
    hn: "44556677",
    an: "AN-2771",
    prefix: "ด.ช.",
    firstName: "ปุณณวิชญ์",
    lastName: "สำราญ",
    dob: "2558-06-15",
    age: "10",
    nationality: "ไทย",
    sex: "ชาย",
    phone: "082-444-5566",
  },
  "55667788": {
    hn: "55667788",
    an: "AN-9013",
    prefix: "นางสาว",
    firstName: "จิราภรณ์",
    lastName: "เทพทา",
    dob: "2537-12-30",
    age: "31",
    nationality: "ไทย",
    sex: "หญิง",
    phone: "086-777-8811",
  },
  "66778899": {
    hn: "66778899",
    an: "AN-7722",
    prefix: "นาย",
    firstName: "ปณต",
    lastName: "วีระสุข",
    dob: "2536-08-09",
    age: "32",
    nationality: "ไทย",
    sex: "ชาย",
    phone: "089-111-2233",
  },
  "77889900": {
    hn: "77889900",
    an: "AN-4421",
    prefix: "นางสาว",
    firstName: "สิตา",
    lastName: "โชติชัย",
    dob: "2540-02-14",
    age: "28",
    nationality: "ไทย",
    sex: "หญิง",
    phone: "086-222-1100",
  },
  "88990011": {
    hn: "88990011",
    an: "AN-5579",
    prefix: "นาย",
    firstName: "ธนกร",
    lastName: "ใจดี",
    dob: "2533-09-03",
    age: "35",
    nationality: "ไทย",
    sex: "ชาย",
    phone: "089-304-1101",
  },
  "99001122": {
    hn: "99001122",
    an: "AN-6108",
    prefix: "นางสาว",
    firstName: "จิตรา",
    lastName: "ศรีสุข",
    dob: "2536-12-28",
    age: "32",
    nationality: "ไทย",
    sex: "หญิง",
    phone: "082-111-0022",
  },
  "10111223": {
    hn: "10111223",
    an: "AN-7190",
    prefix: "ด.ญ.",
    firstName: "นลิน",
    lastName: "วัฒน์ชัย",
    dob: "2556-07-09",
    age: "12",
    nationality: "ไทย",
    sex: "หญิง",
    phone: "084-990-1122",
  },
  "12131425": {
    hn: "12131425",
    an: "AN-8014",
    prefix: "นาย",
    firstName: "วรเดช",
    lastName: "สีทอง",
    dob: "2538-05-17",
    age: "30",
    nationality: "ไทย",
    sex: "ชาย",
    phone: "087-121-3425",
  },
};

const registrationDefaults = (date: string): RegistrationInfo => ({
  registerDate: date,
  registerTime: "09:00",
  appointmentDate: date,
  appointmentTime: "09:30",
  operationDate: date,
  timeFrom: "09:00",
  timeTo: "10:00",
  caseNo: "",
});

const procedureDefaults: ProcedureInfo = {
  room: "",
  procedure: "",
  mainProcedure: "",
  financial: "",
  indication: "",
  rapid: "",
  histopath: "",
  sub: "",
  caseType: "",
  anesthe: "",
  anestheAssist: "",
};

const physicianDefaults: PhysicianInfo = {
  physician: "",
  nurse1: "",
  nurse2: "",
  staff1: "",
  staff2: "",
  preDiagnosis: "",
  dx1: "",
  dx2: "",
};

const buildEmptyForm = (date: string): CaseForm => ({
  hn: "",
  patient: null,
  registration: registrationDefaults(date),
  procedure: { ...procedureDefaults },
  physician: { ...physicianDefaults },
});

const toFullName = (patient: PatientInfo | null) => {
  if (!patient) return "";
  const prefix = patient.prefix ? `${patient.prefix} ` : "";
  return `${prefix}${patient.firstName} ${patient.lastName}`.trim();
};

const dropdownMock = {
  rooms: ["OR 1", "OR 2", "OR 3", "NICU", "Ward"],
  procedures: ["ตรวจกล้องภายใน", "ส่องกล้องหลอดเลือด", "ตรวจกล้องกระดูก", "ตรวจกล้องช่องท้อง"],
  mainProcedures: ["Upper GI", "Lower GI", "Bronchoscopy", "Cystoscopy"],
  financials: ["Self-pay", "Insurance", "SSO", "ข้าราชการ"],
  indications: ["Bleeding", "Follow-up", "Pain", "Screening"],
  rapid: ["Yes", "No"],
  histopath: ["Required", "Not required"],
  subs: ["Sub A", "Sub B", "Sub C"],
  caseTypes: ["OPD", "IPD", "ER"],
  anesthes: ["GA", "MAC", "Local", "None"],
  anestheAssists: ["วิสัญญี A", "วิสัญญี B"],
  physicians: ["นพ. อภิชาติ", "นพ. ไตรภพ", "นพ. กานต์", "นพ. เชิดชัย"],
  nurses: ["พยาบาล ก", "พยาบาล ข", "พยาบาล ค"],
  staffs: ["เจ้าหน้าที่ 1", "เจ้าหน้าที่ 2"],
  diagnoses: ["Dx A", "Dx B", "Dx C"],
};

const toCalendarEvent = (item: CaseItem): BigCalendarEvent => {
  const start = new Date(`${item.date}T${item.time}:00`);
  const regBase = registrationDefaults(item.date);
  const endTime = format(addHours(start, 1), "HH:mm");
  const patient = mockPatientByHn[item.hn] ?? null;
  const meta: CaseMeta = {
    hn: item.hn,
    patient,
    registration: { ...regBase, timeFrom: item.time, timeTo: endTime },
    procedure: {
      ...procedureDefaults,
      room: item.camera,
      procedure: item.procedure,
      mainProcedure: item.procedure,
    },
    physician: { ...physicianDefaults, physician: item.doctor },
  };
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
    meta,
  };
};

const statusColors: Record<CaseItem["status"], { bg: string; accent: string; bgStrong: string }> = {
  Confirmed: { bg: "rgba(16, 185, 129, 0.08)", accent: "#34d399", bgStrong: "rgba(16, 185, 129, 0.18)" },
  Monitoring: { bg: "rgba(14, 165, 233, 0.09)", accent: "#38bdf8", bgStrong: "rgba(14, 165, 233, 0.18)" },
  Ready: { bg: "rgba(251, 191, 36, 0.1)", accent: "#fbbf24", bgStrong: "rgba(251, 191, 36, 0.2)" },
  Review: { bg: "rgba(244, 114, 182, 0.09)", accent: "#f9a8d4", bgStrong: "rgba(244, 114, 182, 0.18)" },
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
  const [rangeFrom, setRangeFrom] = useState<string>(isoFromDate(today));
  const [rangeTo, setRangeTo] = useState<string>(isoFromDate(today));
  const [view, setView] = useState<View>(Views.MONTH);
  const [calendarEvents, setCalendarEvents] = useState<BigCalendarEvent[]>(sampleCases.map(toCalendarEvent));
  const [selectedEvent, setSelectedEvent] = useState<BigCalendarEvent | null>(calendarEvents[0] ?? null);
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("เลือกเคสที่ต้องการ แล้วกดวันที่เพื่อดูข้อมูล");
  const [timelineMode, setTimelineMode] = useState<"Calendar" | "Gantt">("Calendar");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [patientStatus, setPatientStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [caseForm, setCaseForm] = useState<CaseForm>(() => buildEmptyForm(isoFromDate(today)));
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const fieldsDisabled = patientStatus !== "found";
  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-300 disabled:bg-slate-100 disabled:text-slate-400";
  const labelClass = "text-[11px] uppercase tracking-[0.24em] text-slate-500";

  const parsedRangeFrom = toDateSafe(rangeFrom);
  const parsedRangeTo = toDateSafe(rangeTo);
  const rangeValid = Boolean(parsedRangeFrom && parsedRangeTo && parsedRangeFrom <= parsedRangeTo);
  const rangeDays = rangeValid ? differenceInCalendarDays(parsedRangeTo!, parsedRangeFrom!) + 1 : 0;

  const eventsInRange = useMemo(() => {
    if (!rangeValid || !parsedRangeFrom || !parsedRangeTo) return [];
    const rangeStart = startOfDay(parsedRangeFrom);
    const rangeEnd = endOfDay(parsedRangeTo);
    return calendarEvents
      .filter((event) => event.start >= rangeStart && event.start <= rangeEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [calendarEvents, parsedRangeFrom, parsedRangeTo, rangeValid]);

  const todayEvents = useMemo(() => {
    if (!filterDate) return [];
    return calendarEvents
      .filter((event) => isoFromDate(event.start) === filterDate)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [calendarEvents, filterDate]);

  useEffect(() => {
    if (!modalOpen) return;
    setOptionsLoading(true);
    const timer = setTimeout(() => setOptionsLoading(false), 650);
    return () => clearTimeout(timer);
  }, [modalOpen]);

  const updateRegistration = (field: keyof RegistrationInfo, value: string) => {
    setCaseForm((prev) => ({ ...prev, registration: { ...prev.registration, [field]: value } }));
  };

  const updateProcedure = (field: keyof ProcedureInfo, value: string) => {
    setCaseForm((prev) => ({ ...prev, procedure: { ...prev.procedure, [field]: value } }));
  };

  const updatePhysician = (field: keyof PhysicianInfo, value: string) => {
    setCaseForm((prev) => ({ ...prev, physician: { ...prev.physician, [field]: value } }));
  };

  const openAddModal = (date?: Date) => {
    const baseDate = date ? isoFromDate(date) : filterDate || isoFromDate(today);
    setModalMode("add");
    setEditingEventId(null);
    setCaseForm(buildEmptyForm(baseDate));
    setPatientStatus("idle");
    setModalOpen(true);
  };

  const openEditModal = (event: BigCalendarEvent) => {
    const meta = event.meta ?? {
      hn: "",
      patient: null,
      registration: registrationDefaults(isoFromDate(event.start)),
      procedure: { ...procedureDefaults },
      physician: { ...physicianDefaults },
    };
    const patient = meta.patient ?? (meta.hn ? mockPatientByHn[meta.hn] ?? null : null);
    const hn = meta.hn || patient?.hn || "";
    setModalMode("edit");
    setEditingEventId(event.id);
    setCaseForm({
      hn,
      patient,
      registration: meta.registration,
      procedure: meta.procedure,
      physician: meta.physician,
    });
    setPatientStatus(patient ? "found" : hn ? "notfound" : "idle");
    setModalOpen(true);
  };

  const handleHnBlur = async () => {
    const hn = caseForm.hn.replace(/\D/g, "");
    if (!hn) return;
    if (hn.length !== 8) {
      setPatientStatus("idle");
      Swal.fire({ icon: "error", title: "HN ต้องมี 8 หลัก" });
      return;
    }
    setPatientStatus("loading");
    Swal.fire({
      title: "กำลังค้นหา HN",
      text: "จำลองการดึงข้อมูลผู้ป่วย...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const result = await new Promise<PatientInfo | null>((resolve) => {
      setTimeout(() => resolve(mockPatientByHn[hn] ?? null), 600);
    });
    Swal.close();

    if (result) {
      setCaseForm((prev) => ({ ...prev, hn, patient: result }));
      setPatientStatus("found");
      Swal.fire({ icon: "success", title: "พบข้อมูลผู้ป่วยแล้ว", timer: 1500, showConfirmButton: false });
    } else {
      setCaseForm((prev) => ({ ...prev, hn, patient: null }));
      setPatientStatus("notfound");
      Swal.fire({ icon: "info", title: "ไม่พบข้อมูลผู้ป่วย", text: "ตรวจสอบ HN อีกครั้ง" });
    }
  };

  const handleSaveCase = async () => {
    if (patientStatus !== "found" || !caseForm.patient) {
      Swal.fire({ icon: "error", title: "กรุณาใส่ HN ที่มีข้อมูลก่อน" });
      return;
    }
    const reg = caseForm.registration;
    const start = new Date(`${reg.operationDate}T${reg.timeFrom || "09:00"}:00`);
    const end = new Date(`${reg.operationDate}T${reg.timeTo || "10:00"}:00`);
    const patientName = toFullName(caseForm.patient) || "ไม่ระบุชื่อ";
    const procedureLabel = caseForm.procedure.mainProcedure || caseForm.procedure.procedure || "Procedure";
    const roomLabel = caseForm.procedure.room || "Room";
    const physicianLabel = caseForm.physician.physician || "ไม่ระบุแพทย์";
    const meta: CaseMeta = {
      hn: caseForm.hn,
      patient: caseForm.patient,
      registration: caseForm.registration,
      procedure: caseForm.procedure,
      physician: caseForm.physician,
    };
    const currentStatus =
      (editingEventId && calendarEvents.find((event) => event.id === editingEventId)?.status) || "Monitoring";
    const nextEvent: BigCalendarEvent = {
      id: editingEventId || `case-${Date.now()}`,
      title: `${patientName} · ${roomLabel}`,
      start,
      end,
      patient: patientName,
      camera: roomLabel,
      doctor: physicianLabel,
      procedure: procedureLabel,
      status: currentStatus,
      meta,
    };

    setCalendarEvents((prev) => {
      if (modalMode === "edit" && editingEventId) {
        return prev.map((event) =>
          event.id === editingEventId ? nextEvent : event
        );
      }
      return [...prev, nextEvent];
    });
    setSelectedEvent(nextEvent);

    Swal.fire({
      icon: "success",
      title: modalMode === "edit" ? "บันทึกข้อมูลแล้ว" : "เพิ่มเคสแล้ว",
      timer: 1500,
      showConfirmButton: false,
    });
    setModalOpen(false);
  };

  const handleSelectEvent = (event: BigCalendarEvent) => {
    setSelectedEvent(event);
    setStatusMessage(`ดูรายละเอียด ${event.patient} · ${formatThaiDisplay(event.start.toISOString().slice(0, 10))}`);
    openEditModal(event);
  };

  const handleSelectSlot = (slot: SlotInfo) => {
    const iso = isoFromDate(slot.start);
    setFilterDate(iso);
    setSelectedSlotLabel(format(slot.start, "d MMM yyyy"));
    setStatusMessage(`เลือกวัน ${formatThaiDisplay(iso)} เพื่อจัดกล้อง`);
    openAddModal(slot.start);
  };

  const addQuickTask = () => {
    openAddModal(calendarDate);
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
        color: "#334155",
        borderRadius: "16px",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        padding: "6px 10px",
        fontWeight: 500,
        borderLeft: `3px solid ${color.accent}`,
        "--event-bg": color.bgStrong,
        "--event-text": "#334155",
        "--event-accent": color.accent,
      } as CSSProperties,
    };
  };

  const patientStatusLabel =
    patientStatus === "found"
      ? "พบข้อมูลแล้ว"
      : patientStatus === "loading"
        ? "กำลังค้นหา"
        : patientStatus === "notfound"
          ? "ไม่พบข้อมูล"
          : "พร้อมค้นหา";

  const patientStatusClass =
    patientStatus === "found"
      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
      : patientStatus === "loading"
        ? "border-sky-200 bg-sky-100 text-sky-700"
        : patientStatus === "notfound"
          ? "border-rose-200 bg-rose-100 text-rose-700"
          : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-10 h-[320px] w-[320px] rounded-full bg-white/20 blur-[140px]" />
        <div className="absolute right-10 top-40 h-[420px] w-[520px] rounded-full bg-pink-500/20 blur-[160px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-full flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-black">Calenda</h1>
          </div>

        </header>

        <div className="flex flex-1 gap-6">
          <section className="w-[30%] min-w-[320px]">
            <div className="flex flex-col gap-4 rounded-[30px] border border-white/20 bg-white/80 px-6 py-6 shadow-[0_30px_80px_rgba(10,10,30,0.4)] backdrop-blur-3xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">แดชบอร์ด</p>
                </div>
                <div className="flex gap-2 text-[11px] uppercase">
                  {["Calendar"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTimelineMode(mode === "Calendar" ? "Calendar" : "Gantt")}
                      className={`rounded-full border px-3 py-1 transition ${timelineMode === (mode === "Calendar" ? "Calendar" : "Gantt")
                          ? "bg-teal-500 text-white border-teal-400/70"
                          : "bg-teal-500/10 text-teal-700 border-teal-200 hover:bg-teal-500/20"
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
                  className="mt-3 rounded-full border border-teal-200 bg-teal-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-700 hover:border-teal-300 hover:bg-teal-500/20"
                >
                  สัปดาห์นี้
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">ช่วงวันที่</span>
                  <span className="text-[11px] text-slate-500">ใช้สรุปช่วง</span>
                </div>
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
                <p className="text-[11px] text-slate-500">เลือกวันที่จากปฏิทินเพื่อดูรายการรายวัน</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white/80 p-3 text-[12px] text-slate-600 shadow-inner">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">เคสในช่วงวันที่</p>
                  <span className="text-[11px] text-slate-500">{headerRangeLabel}</span>
                </div>
                <div className="mt-3 max-h-[320px] overflow-auto pr-1">
                  {eventsInRange.length === 0 && (
                    <p className="text-[11px] text-slate-500">ยังไม่มีเคสในช่วงนี้</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {eventsInRange.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleSelectEvent(event)}
                        className="rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-left text-[12px] text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-100 hover:shadow-lg"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{formatThaiDisplay(isoFromDate(event.start))}</span>
                          <span>
                            {event.start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-slate-900">{event.patient}</p>
                        <p className="text-[11px] text-slate-500">{event.camera} · {event.procedure}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">คลิกเคสเพื่อแก้ไขข้อมูล</p>
              </div>
            </div>
          </section>

          <section className="w-[70%]">
            <div className="relative rounded-[40px] border border-white/30 bg-white/80 p-6 shadow-[0_50px_120px_rgba(15,23,42,0.45)]">
              <div className="absolute inset-0 overflow-hidden rounded-[40px]">
                <div className="pointer-events-none absolute inset-0 opacity-60">
                  <div className="absolute -left-20 -top-14 h-[260px] w-[260px] rounded-full bg-indigo-400/50 blur-[140px]" />
                  <div className="absolute right-10 bottom-0 h-[200px] w-[200px] rounded-full bg-pink-400/30 blur-[160px]" />
                </div>
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
                      className="rounded-full border border-teal-200 px-3 py-1 text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => handleMove(-1)}
                      className="rounded-full border border-teal-200 px-3 py-1 text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => handleMove(1)}
                      className="rounded-full border border-teal-200 px-3 py-1 text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
                    >
                      Next
                    </button>
                    <div className="flex gap-2">
                      {[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA].map((current) => (
                        <button
                          key={current}
                          onClick={() => setView(current)}
                          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${view === current
                              ? "bg-teal-500 text-white border-teal-400/70"
                              : "bg-teal-500/10 text-teal-700 border-teal-200 hover:bg-teal-500/20"
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
                    formats={{
                      timeGutterFormat: "HH:mm",
                      eventTimeRangeFormat: ({ start, end }) => `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`,
                      eventTimeRangeStartFormat: ({ start, end }) =>
                        `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`,
                      agendaTimeFormat: "HH:mm",
                      agendaTimeRangeFormat: ({ start, end }) => `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`,
                    }}
                  />
                </div>

              </div>
            </div>
          </section>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-[1100px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">
                  {modalMode === "add" ? "Add Case" : "Edit Case"}
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">Patient Information</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${patientStatusClass}`}>
                  {patientStatusLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-teal-200 bg-teal-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700 hover:border-teal-300 hover:bg-teal-500/20"
                >
                  ปิด
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] space-y-6 overflow-y-auto p-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">ข้อมูลผู้ป่วย</h3>
                  <span className="text-[11px] text-slate-500">กรอก HN แล้วระบบจะดึงข้อมูล</span>
                </div>
                <div className="mt-4 grid grid-cols-12 gap-3">
                  <div className="col-span-12 lg:col-span-3">
                    <label className={labelClass}>
                      HN <span className="text-rose-500">*</span>
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={caseForm.hn}
                        onChange={(e) => setCaseForm((prev) => ({ ...prev, hn: e.target.value.replace(/\D/g, "") }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleHnBlur();
                          }
                        }}
                        maxLength={8}
                        className={fieldClass}
                        placeholder="12345678"
                      />
                      <button
                        type="button"
                        onClick={handleHnBlur}
                        className="rounded-full border border-teal-200 bg-teal-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700 hover:border-teal-300 hover:bg-teal-500/20"
                      >
                        ค้นหา
                      </button>
                    </div>
                  </div>

                  <div className="col-span-12 lg:col-span-3">
                    <label className={labelClass}>AN</label>
                    <input className={fieldClass} value={caseForm.patient?.an ?? ""} readOnly disabled />
                  </div>
                  <div className="col-span-12 lg:col-span-3">
                    <label className={labelClass}>Prefix</label>
                    <input className={fieldClass} value={caseForm.patient?.prefix ?? ""} readOnly disabled />
                  </div>
                  <div className="col-span-12 lg:col-span-3">
                    <label className={labelClass}>Phone</label>
                    <input className={fieldClass} value={caseForm.patient?.phone ?? ""} readOnly disabled />
                  </div>

                  <div className="col-span-12 lg:col-span-4">
                    <label className={labelClass}>Firstname</label>
                    <input className={fieldClass} value={caseForm.patient?.firstName ?? ""} readOnly disabled />
                  </div>
                  <div className="col-span-12 lg:col-span-4">
                    <label className={labelClass}>Lastname</label>
                    <input className={fieldClass} value={caseForm.patient?.lastName ?? ""} readOnly disabled />
                  </div>
                  <div className="col-span-12 lg:col-span-2">
                    <label className={labelClass}>DOB</label>
                    <input className={fieldClass} value={caseForm.patient?.dob ?? ""} readOnly disabled />
                  </div>
                  <div className="col-span-12 lg:col-span-2">
                    <label className={labelClass}>Age</label>
                    <input className={fieldClass} value={caseForm.patient?.age ?? ""} readOnly disabled />
                  </div>

                  <div className="col-span-12 lg:col-span-4">
                    <label className={labelClass}>Nationality</label>
                    <input className={fieldClass} value={caseForm.patient?.nationality ?? ""} readOnly disabled />
                  </div>
                  <div className="col-span-12 lg:col-span-4">
                    <label className={labelClass}>Sex</label>
                    <input className={fieldClass} value={caseForm.patient?.sex ?? ""} readOnly disabled />
                  </div>
                  {patientStatus === "notfound" && (
                    <div className="col-span-12 text-sm text-rose-500">
                      ไม่พบข้อมูล HN นี้ กรุณาตรวจสอบอีกครั้ง
                    </div>
                  )}
                </div>
              </section>

              <section
                className={`rounded-2xl border border-slate-200 bg-white p-4 ${fieldsDisabled ? "opacity-60" : ""}`}
              >
                <h3 className="text-sm font-semibold text-slate-700">Registration</h3>
                <div className="mt-4 grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Date</label>
                    <input
                      type="date"
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.registration.registerDate}
                      onChange={(e) => updateRegistration("registerDate", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={labelClass}>Time</label>
                    <input
                      type="time"
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.registration.registerTime}
                      onChange={(e) => updateRegistration("registerTime", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={labelClass}>Case No.</label>
                    <input
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.registration.caseNo}
                      onChange={(e) => updateRegistration("caseNo", e.target.value)}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Appointment</label>
                    <input
                      type="date"
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.registration.appointmentDate}
                      onChange={(e) => updateRegistration("appointmentDate", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={labelClass}>Time</label>
                    <input
                      type="time"
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.registration.appointmentTime}
                      onChange={(e) => updateRegistration("appointmentTime", e.target.value)}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Operation Date</label>
                    <input
                      type="date"
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.registration.operationDate}
                      onChange={(e) => updateRegistration("operationDate", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={labelClass}>From</label>
                    <input
                      type="time"
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.registration.timeFrom}
                      onChange={(e) => updateRegistration("timeFrom", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={labelClass}>To</label>
                    <input
                      type="time"
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.registration.timeTo}
                      onChange={(e) => updateRegistration("timeTo", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section
                className={`rounded-2xl border border-slate-200 bg-white p-4 ${fieldsDisabled ? "opacity-60" : ""}`}
              >
                <h3 className="text-sm font-semibold text-slate-700">Procedure Room</h3>
                <div className="mt-4 grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Room</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.room}
                      onChange={(e) => updateProcedure("room", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกห้อง"}</option>
                      {!optionsLoading &&
                        dropdownMock.rooms.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Procedure</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.procedure}
                      onChange={(e) => updateProcedure("procedure", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกหัตถการ"}</option>
                      {!optionsLoading &&
                        dropdownMock.procedures.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Main Procedure</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.mainProcedure}
                      onChange={(e) => updateProcedure("mainProcedure", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือก Main"}</option>
                      {!optionsLoading &&
                        dropdownMock.mainProcedures.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Financial</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.financial}
                      onChange={(e) => updateProcedure("financial", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกสิทธิ์"}</option>
                      {!optionsLoading &&
                        dropdownMock.financials.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Indication</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.indication}
                      onChange={(e) => updateProcedure("indication", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือก Indication"}</option>
                      {!optionsLoading &&
                        dropdownMock.indications.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Case Type</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.caseType}
                      onChange={(e) => updateProcedure("caseType", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกประเภท"}</option>
                      {!optionsLoading &&
                        dropdownMock.caseTypes.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Rapid</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.rapid}
                      onChange={(e) => updateProcedure("rapid", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือก Rapid"}</option>
                      {!optionsLoading &&
                        dropdownMock.rapid.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Histopath</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.histopath}
                      onChange={(e) => updateProcedure("histopath", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือก Histopath"}</option>
                      {!optionsLoading &&
                        dropdownMock.histopath.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Sub</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.sub}
                      onChange={(e) => updateProcedure("sub", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือก Sub"}</option>
                      {!optionsLoading &&
                        dropdownMock.subs.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Anesthesia</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.anesthe}
                      onChange={(e) => updateProcedure("anesthe", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกวิสัญญี"}</option>
                      {!optionsLoading &&
                        dropdownMock.anesthes.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Anesthe Assist</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.procedure.anestheAssist}
                      onChange={(e) => updateProcedure("anestheAssist", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกผู้ช่วย"}</option>
                      {!optionsLoading &&
                        dropdownMock.anestheAssists.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </section>

              <section
                className={`rounded-2xl border border-slate-200 bg-white p-4 ${fieldsDisabled ? "opacity-60" : ""}`}
              >
                <h3 className="text-sm font-semibold text-slate-700">Physicians</h3>
                <div className="mt-4 grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Physician</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.physician.physician}
                      onChange={(e) => updatePhysician("physician", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกแพทย์"}</option>
                      {!optionsLoading &&
                        dropdownMock.physicians.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Nurse #1</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.physician.nurse1}
                      onChange={(e) => updatePhysician("nurse1", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกพยาบาล"}</option>
                      {!optionsLoading &&
                        dropdownMock.nurses.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Nurse #2</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.physician.nurse2}
                      onChange={(e) => updatePhysician("nurse2", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกพยาบาล"}</option>
                      {!optionsLoading &&
                        dropdownMock.nurses.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Staff #1</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.physician.staff1}
                      onChange={(e) => updatePhysician("staff1", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกเจ้าหน้าที่"}</option>
                      {!optionsLoading &&
                        dropdownMock.staffs.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Staff #2</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.physician.staff2}
                      onChange={(e) => updatePhysician("staff2", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือกเจ้าหน้าที่"}</option>
                      {!optionsLoading &&
                        dropdownMock.staffs.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className={labelClass}>Pre-diagnosis</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.physician.preDiagnosis}
                      onChange={(e) => updatePhysician("preDiagnosis", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือก"}</option>
                      {!optionsLoading &&
                        dropdownMock.diagnoses.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className={labelClass}>Dx1</label>
                    <input
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.physician.dx1}
                      onChange={(e) => updatePhysician("dx1", e.target.value)}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className={labelClass}>Dx2</label>
                    <input
                      className={fieldClass}
                      disabled={fieldsDisabled}
                      value={caseForm.physician.dx2}
                      onChange={(e) => updatePhysician("dx2", e.target.value)}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                {fieldsDisabled ? "กรอก HN เพื่อปลดล็อคฟอร์ม" : "พร้อมบันทึกข้อมูล"}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-teal-200 bg-teal-500/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-teal-700 hover:border-teal-300 hover:bg-teal-500/20"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveCase}
                  disabled={fieldsDisabled}
                  className="rounded-full bg-teal-500 px-6 py-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {modalMode === "edit" ? "บันทึกข้อมูล" : "เพิ่มข้อมูล"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .rbc-overlay {
          background: #ffffff !important;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 18px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
          opacity: 1 !important;
          z-index: 9999 !important;
        }
        .rbc-overlay-header {
          padding: 10px 14px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          color: #0f172a;
          font-weight: 600;
          background: #ffffff;
        }
        .rbc-overlay .rbc-event {
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-left: 4px solid var(--event-accent) !important;
          background-color: var(--event-bg) !important;
          color: var(--event-text) !important;
          opacity: 1 !important;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
        }
        .rbc-overlay .rbc-event-content {
          opacity: 1 !important;
        }
        .rbc-calendar,
        .rbc-month-view,
        .rbc-row,
        .rbc-row-content,
        .rbc-row-segment {
          overflow: visible !important;
        }
      `}</style>
    </main>
  );
}
