"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Calendar, dateFnsLocalizer, SlotInfo, View, Views } from "react-big-calendar";
import {
  addDays,
  addHours,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  getDay,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale/th";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Swal from "sweetalert2";
import { getbyHN, postCalendagetdata } from "@/action/api";

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
  meta?: CaseMeta;
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

const normalizeTime = (value: unknown, fallback: string) => {
  if (!value) return fallback;
  if (typeof value === "number") {
    const hours = Math.floor(value);
    const mins = Math.round((value - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }
  const raw = String(value).trim();
  if (!raw) return fallback;
  if (raw.includes("T")) {
    const parts = raw.split("T");
    return normalizeTime(parts[1], fallback);
  }
  const [hh, mm] = raw.split(":");
  if (!hh || !mm) return fallback;
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
};

const ensureStatus = (value: unknown): CaseItem["status"] => {
  if (typeof value === "number") {
    if (value === 1) return "Confirmed";
    if (value === 2) return "Ready";
    if (value === 3) return "Review";
    return "Monitoring";
  }
  const raw = String(value || "").toLowerCase();
  if (raw.includes("confirm")) return "Confirmed";
  if (raw.includes("ready")) return "Ready";
  if (raw.includes("review")) return "Review";
  if (raw.includes("monitor")) return "Monitoring";
  return "Monitoring";
};

const toCaseItems = (payload: unknown): CaseItem[] => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : Array.isArray((payload as { result?: unknown })?.result)
        ? (payload as { result: unknown[] }).result
        : [];

  return items.map((raw, index) => {
    const row = raw as Record<string, unknown>;
    const hn = String(row.hn ?? row.HN ?? row.patient_hn ?? row.patientHn ?? "").trim();
    const firstName = String(row.firstName ?? row.firstname ?? row.patientFirstName ?? "").trim();
    const lastName = String(row.lastName ?? row.lastname ?? row.patientLastName ?? "").trim();
    const prefix = String(row.prefix ?? row.title ?? "").trim();
    const patient =
      String(row.patient ?? row.patientName ?? row.fullname ?? row.name ?? "").trim() ||
      `${prefix ? `${prefix} ` : ""}${firstName} ${lastName}`.trim();
    const dateRaw = String(
      row.appointmentdate ?? row.appointmentDate ?? row.casedate ?? row.date ?? row.operationDate ?? row.createdAt ?? ""
    ).trim();
    const date = dateRaw ? isoFromDate(dateRaw) : isoFromDate(new Date());
    const time = normalizeTime(
      row.casetimefrom ??
      row.caseTimeFrom ??
      row.time ??
      row.operationTime ??
      row.appointmenttime ??
      row.appointmentTime ??
      row.timeFrom ??
      row.timefrom,
      "09:00"
    );
    const doctor = String(row.doctor ?? row.physician ?? row.staff ?? row.doctorName ?? "").trim();
    const camera = String(row.camera ?? row.room ?? row.cameraName ?? "").trim();
    const procedure = String(row.procedure ?? row.mainProcedure ?? row.caseType ?? row.service ?? "").trim();
    const status = ensureStatus(row.casestatusid ?? row.caseStatusId ?? row.status ?? row.caseStatus ?? row.state);
    const id = String(row.id ?? row.caseId ?? row.caseNo ?? row.uid ?? `case-${date}-${index}`).trim();
    const registerDate = String(row.registerdate ?? row.registerDate ?? "").trim();
    const registerTime = String(row.registertime ?? row.registerTime ?? "").trim();
    const appointmentDate = String(row.appointmentdate ?? row.appointmentDate ?? "").trim();
    const appointmentTime = String(row.appointmenttime ?? row.appointmentTime ?? "").trim();
    const caseDate = String(row.casedate ?? row.caseDate ?? "").trim();
    const caseTimeFrom = String(row.casetimefrom ?? row.caseTimeFrom ?? "").trim();
    const caseTimeTo = String(row.casetimeto ?? row.caseTimeTo ?? "").trim();
    const caseNo = String(row.casenumber ?? row.caseNumber ?? row.caseNo ?? "").trim();
    const an = String(row.an ?? "").trim();
    const patientMeta: PatientInfo = {
      hn,
      an,
      prefix,
      firstName,
      lastName,
      dob: "",
      age: String(row.age ?? "").trim(),
      nationality: "",
      sex: "",
      phone: "",
    };
    const meta: CaseMeta = {
      hn,
      patient: patientMeta.hn || patientMeta.an || patientMeta.firstName ? patientMeta : null,
      registration: {
        registerDate: registerDate ? isoFromDate(registerDate) : date,
        registerTime: normalizeTime(registerTime, "09:00"),
        appointmentDate: appointmentDate ? isoFromDate(appointmentDate) : date,
        appointmentTime: normalizeTime(appointmentTime, "09:30"),
        operationDate: caseDate ? isoFromDate(caseDate) : date,
        timeFrom: normalizeTime(caseTimeFrom, time),
        timeTo: normalizeTime(caseTimeTo, time),
        caseNo,
      },
      procedure: {
        ...procedureDefaults,
        room: String(row.procedureroomid ?? row.procedureRoomId ?? camera ?? "").trim(),
        procedure: String(row.mainprocedureid ?? row.mainProcedureId ?? procedure ?? "").trim(),
        mainProcedure: String(row.mainprocedureid ?? row.mainProcedureId ?? procedure ?? "").trim(),
        financial: String(row.financialid ?? row.financialId ?? "").trim(),
        indication: String(row.indicationid ?? row.indicationId ?? "").trim(),
        rapid: String(row.rapidtestresultid ?? row.rapidTestResultId ?? "").trim(),
        histopath: String(row.histopathologyid ?? row.histopathologyId ?? "").trim(),
        sub: String(row.subprocedureid ?? row.subProcedureId ?? "").trim(),
        caseType: String(row.patienttypeopdid ?? row.patientTypeOpdId ?? "").trim(),
        anesthe: String(row.anesthesiamethodid ?? row.anesthesiaMethodId ?? "").trim(),
        anestheAssist: String(row.anesthetistid ?? row.anesthetistId ?? "").trim(),
      },
      physician: {
        ...physicianDefaults,
        physician: String(row.physicians1id ?? row.physicians1Id ?? doctor ?? "").trim(),
        nurse1: String(row.nurse1id ?? row.nurse1Id ?? "").trim(),
        nurse2: String(row.nurse2id ?? row.nurse2Id ?? "").trim(),
        staff1: String(row.staff1id ?? row.staff1Id ?? "").trim(),
        staff2: String(row.staff2id ?? row.staff2Id ?? "").trim(),
        preDiagnosis: String(row.prediagnosisdx1id ?? row.preDiagnosisDx1Id ?? "").trim(),
        dx1: String(row.prediagnosisdx1id ?? row.preDiagnosisDx1Id ?? "").trim(),
        dx2: String(row.prediagnosisdx2id ?? row.preDiagnosisDx2Id ?? "").trim(),
      },
    };

    return {
      id,
      hn,
      patient: patient || hn || `Case ${index + 1}`,
      doctor,
      camera,
      time,
      date,
      procedure: procedure || "-",
      status,
      meta,
    };
  });
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

const hasPatientDetails = (patient: PatientInfo | null) => {
  if (!patient) return false;
  return Boolean(
    patient.firstName ||
    patient.lastName ||
    patient.an ||
    patient.phone ||
    patient.nationality ||
    patient.sex ||
    patient.age ||
    patient.dob
  );
};

const buildPatientFromResponse = (hn: string, response: unknown): PatientInfo | null => {
  const data = (response as { data?: unknown })?.data ?? response;
  const row = data as Record<string, unknown> | null;
  if (!row) return null;
  const patient: PatientInfo = {
    hn: String(row.hn ?? row.HN ?? hn),
    an: String(row.an ?? row.AN ?? ""),
    prefix: String(row.prefix ?? row.title ?? ""),
    firstName: String(row.firstName ?? row.firstname ?? ""),
    lastName: String(row.lastName ?? row.lastname ?? ""),
    dob: String(row.dob ?? row.birthdate ?? ""),
    age: String(row.age ?? ""),
    nationality: String(row.nationality ?? ""),
    sex: String(row.sex ?? row.gender ?? ""),
    phone: String(row.phone ?? row.tel ?? ""),
  };
  if (patient.hn || patient.an || patient.firstName || patient.lastName) return patient;
  return null;
};


const registrationDefaults = (date: string, time?: string): RegistrationInfo => {
  const hasTime = Boolean(time);
  const baseTime = time ?? "09:00";
  const endTime = format(addHours(new Date(`${date}T${baseTime}:00`), 1), "HH:mm");
  return {
    registerDate: date,
    registerTime: "09:00",
    appointmentDate: date,
    appointmentTime: hasTime ? baseTime : "09:30",
    operationDate: date,
    timeFrom: hasTime ? baseTime : "09:00",
    timeTo: hasTime ? endTime : "10:00",
    caseNo: "",
  };
};

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

const buildEmptyForm = (date: string, time?: string): CaseForm => ({
  hn: "",
  patient: null,
  registration: registrationDefaults(date, time),
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
  const regBase = item.meta?.registration ?? registrationDefaults(item.date);
  const endTime = regBase.timeTo || format(addHours(start, 1), "HH:mm");
  const patient = item.meta?.patient ?? null;
  const meta: CaseMeta = {
    hn: item.hn,
    patient,
    registration: { ...regBase, timeFrom: regBase.timeFrom || item.time, timeTo: endTime },
    procedure: {
      ...procedureDefaults,
      ...item.meta?.procedure,
      room: item.meta?.procedure.room || item.camera,
      procedure: item.meta?.procedure.procedure || item.procedure,
      mainProcedure: item.meta?.procedure.mainProcedure || item.procedure,
    },
    physician: {
      ...physicianDefaults,
      ...item.meta?.physician,
      physician: item.meta?.physician.physician || item.doctor,
    },
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
  const [dashboardEvents, setDashboardEvents] = useState<BigCalendarEvent[]>([]);
  const [monthEvents, setMonthEvents] = useState<BigCalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<BigCalendarEvent | null>(null);
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("เลือกเคสที่ต้องการ แล้วกดวันที่เพื่อดูข้อมูล");
  const [timelineMode, setTimelineMode] = useState<"Calendar" | "Gantt">("Calendar");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [patientStatus, setPatientStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [caseForm, setCaseForm] = useState<CaseForm>(() => buildEmptyForm(isoFromDate(today)));
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [monthLoading, setMonthLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [autoFetchHn, setAutoFetchHn] = useState(false);
  const fieldsDisabled = patientStatus !== "found";
  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-300 disabled:bg-slate-100 disabled:text-slate-400";
  const labelClass = "text-[11px] uppercase tracking-[0.24em] text-slate-500";
  const viewLabel = useMemo(() => {
    if (view === Views.MONTH) {
      return format(calendarDate, "MMMM yyyy", { locale: th });
    }
    if (view === Views.WEEK) {
      const start = startOfWeek(calendarDate, { weekStartsOn: 0 });
      const end = addDays(start, 6);
      return `${formatThaiDisplay(isoFromDate(start))} – ${formatThaiDisplay(isoFromDate(end))}`;
    }
    if (view === Views.DAY) {
      return formatThaiDisplay(isoFromDate(calendarDate));
    }
    if (view === Views.AGENDA) {
      const start = startOfDay(calendarDate);
      const end = addDays(start, 29);
      return `${formatThaiDisplay(isoFromDate(start))} – ${formatThaiDisplay(isoFromDate(end))}`;
    }
    return format(calendarDate, "MMMM yyyy", { locale: th });
  }, [calendarDate, view]);
  const viewLabelPrefix = view === Views.MONTH ? "เดือน " : view === Views.DAY ? "วันที่ " : "ช่วง ";

  const parsedRangeFrom = toDateSafe(rangeFrom);
  const parsedRangeTo = toDateSafe(rangeTo);
  const rangeValid = Boolean(parsedRangeFrom && parsedRangeTo && parsedRangeFrom <= parsedRangeTo);
  const rangeDays = rangeValid ? differenceInCalendarDays(parsedRangeTo!, parsedRangeFrom!) + 1 : 0;

  const eventsInRange = useMemo(() => {
    if (!rangeValid || !parsedRangeFrom || !parsedRangeTo) return [];
    const rangeStart = startOfDay(parsedRangeFrom);
    const rangeEnd = endOfDay(parsedRangeTo);
    return dashboardEvents
      .filter((event) => event.start >= rangeStart && event.start <= rangeEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [dashboardEvents, parsedRangeFrom, parsedRangeTo, rangeValid]);

  const todayEvents = useMemo(() => {
    if (!filterDate) return [];
    return dashboardEvents
      .filter((event) => isoFromDate(event.start) === filterDate)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [dashboardEvents, filterDate]);

  useEffect(() => {
    if (!modalOpen) return;
    setOptionsLoading(true);
    const timer = setTimeout(() => setOptionsLoading(false), 650);
    return () => clearTimeout(timer);
  }, [modalOpen]);

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      if (!rangeValid) return;
      setDashboardLoading(true);
      setApiError(null);
      const payload = { datefrom: rangeFrom, dateto: rangeTo };
      const response = await postCalendagetdata(payload);
      if (!active) return;
      if ((response as { error?: unknown })?.error) {
        setApiError((response as { message?: string })?.message || "ดึงข้อมูลไม่สำเร็จ");
        setDashboardEvents([]);
        setDashboardLoading(false);
        return;
      }
      const items = toCaseItems(response);
      setDashboardEvents(items.map(toCalendarEvent));
      setDashboardLoading(false);
    };
    fetchDashboard();
    return () => {
      active = false;
    };
  }, [rangeFrom, rangeTo, rangeValid]);

  useEffect(() => {
    let active = true;
    const fetchMonth = async () => {
      let rangeStart = startOfMonth(calendarDate);
      let rangeEnd = endOfMonth(calendarDate);

      if (view === Views.WEEK) {
        rangeStart = startOfWeek(calendarDate, { weekStartsOn: 0 });
        rangeEnd = addDays(rangeStart, 6);
      } else if (view === Views.DAY) {
        rangeStart = startOfDay(calendarDate);
        rangeEnd = startOfDay(calendarDate);
      } else if (view === Views.AGENDA) {
        rangeStart = startOfDay(calendarDate);
        rangeEnd = addDays(rangeStart, 29);
      }

      const rangeEndExclusive = addDays(rangeEnd, 1);
      const payload = { datefrom: isoFromDate(rangeStart), dateto: isoFromDate(rangeEndExclusive) };
      setMonthLoading(true);
      setApiError(null);
      const response = await postCalendagetdata(payload);
      if (!active) return;
      if ((response as { error?: unknown })?.error) {
        setApiError((response as { message?: string })?.message || "ดึงข้อมูลไม่สำเร็จ");
        setMonthEvents([]);
        setMonthLoading(false);
        return;
      }
      const items = toCaseItems(response);
      setMonthEvents(items.map(toCalendarEvent));
      setMonthLoading(false);
    };
    fetchMonth();
    return () => {
      active = false;
    };
  }, [calendarDate, view]);

  useEffect(() => {
    if (selectedEvent || monthEvents.length === 0) return;
    setSelectedEvent(monthEvents[0]);
  }, [monthEvents, selectedEvent]);

  useEffect(() => {
    if (!modalOpen || modalMode !== "edit") return;
    const hn = caseForm.hn.trim();
    if (!hn) return;
    if (hasPatientDetails(caseForm.patient)) return;
    if (autoFetchHn) return;
    setAutoFetchHn(true);
    void fetchPatientByHn(hn).finally(() => setAutoFetchHn(false));
  }, [modalOpen, modalMode, caseForm.hn, caseForm.patient, autoFetchHn]);

  const updateRegistration = (field: keyof RegistrationInfo, value: string) => {
    setCaseForm((prev) => ({ ...prev, registration: { ...prev.registration, [field]: value } }));
  };

  const updateProcedure = (field: keyof ProcedureInfo, value: string) => {
    setCaseForm((prev) => ({ ...prev, procedure: { ...prev.procedure, [field]: value } }));
  };

  const updatePhysician = (field: keyof PhysicianInfo, value: string) => {
    setCaseForm((prev) => ({ ...prev, physician: { ...prev.physician, [field]: value } }));
  };

  const fetchPatientByHn = async (hn: string) => {
    if (!hn) return;
    setPatientStatus("loading");
    Swal.fire({
      title: "กำลังค้นหา HN",
      text: "กำลังดึงข้อมูลผู้ป่วย...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const response = await getbyHN(hn);
    Swal.close();

    if (!(response as { error?: unknown })?.error) {
      const patient = buildPatientFromResponse(hn, response);
      if (patient) {
        setCaseForm((prev) => ({ ...prev, hn, patient }));
        setPatientStatus("found");
        return true;
      }
      setCaseForm((prev) => ({ ...prev, hn, patient: null }));
      setPatientStatus("notfound");
      return false;
    }
    setPatientStatus("notfound");
    setCaseForm((prev) => ({ ...prev, hn, patient: null }));
    Swal.fire({
      icon: "error",
      title: "ค้นหา HN ไม่สำเร็จ",
      text: (response as { message?: string })?.message || "โปรดลองใหม่อีกครั้ง",
    });
    return null;
  };

  const openAddModal = (date?: Date) => {
    const baseDate = date ? isoFromDate(date) : filterDate || isoFromDate(today);
    const slotTime = date && format(date, "HH:mm") !== "00:00" ? format(date, "HH:mm") : undefined;
    setModalMode("add");
    setEditingEventId(null);
    setCaseForm(buildEmptyForm(baseDate, slotTime));
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
    const patient = meta.patient ?? null;
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

  const handleHnBlur = async (hndata: string) => {
    const hn = hndata || caseForm.hn.trim();
    if (!hn) return;
    const found = await fetchPatientByHn(hn);
    if (found === false) {
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
      (editingEventId && monthEvents.find((event) => event.id === editingEventId)?.status) || "Monitoring";
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

    const upsertEventList = (events: BigCalendarEvent[]) => {
      if (modalMode === "edit" && editingEventId) {
        return events.map((event) => (event.id === editingEventId ? nextEvent : event));
      }
      return [...events, nextEvent];
    };
    setDashboardEvents(upsertEventList);
    setMonthEvents(upsertEventList);
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
    console.log(event)
    handleHnBlur(event?.meta?.hn || "");
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
    setCalendarDate((prev) => {
      if (view === Views.MONTH) return addMonths(prev, direction);
      if (view === Views.WEEK) return addDays(prev, direction * 7);
      if (view === Views.DAY) return addDays(prev, direction);
      if (view === Views.AGENDA) return addDays(prev, direction * 30);
      return addMonths(prev, direction);
    });
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
                {dashboardLoading && (
                  <p className="mt-2 text-[11px] text-slate-400">กำลังโหลดข้อมูล...</p>
                )}
                {!dashboardLoading && apiError && (
                  <p className="mt-2 text-[11px] text-rose-500">{apiError}</p>
                )}
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
                    <p className="text-2xl text-slate-500">
                      {viewLabelPrefix}
                      {viewLabel}
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
                    {monthLoading && <span className="text-[11px] text-slate-400">กำลังโหลด...</span>}
                  </div>
                </div>

                <div className="flex flex-1 flex-col rounded-[30px] border border-slate-200 bg-white/90 p-4 shadow-xl">
                  <Calendar
                    localizer={localizer}
                    events={monthEvents}
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
                        onChange={(e) => setCaseForm((prev) => ({ ...prev, hn: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleHnBlur("");
                          }
                        }}
                        className={fieldClass}
                        placeholder="12345678"
                      />
                      <button
                        type="button"
                        onClick={() => handleHnBlur("")}
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
