"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
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
import { useRouter } from "next/navigation";
import { getbyHN, getSelectTypes, getvaluebyselecttypeid, postCalendagetdata, postCalendarCase, putCalendarCase } from "@/action/api";
import { SELECT_TYPE_CODES, SELECT_TYPE_IDS } from "@/config";

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
  prefixId: string;
  firstName: string;
  lastName: string;
  dob: string;
  age: string;
  nationality: string;
  nationalityId: string;
  sex: string;
  sexId: string;
  phone: string;
  patientType: string;
  patientTypeIds: string;
  note: string;
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

type SelectType = {
  id: string;
  code: string;
  desc: string;
};

type SelectOption = {
  id: string;
  code: string;
  label: string;
};

type SelectTypeKey = keyof typeof SELECT_TYPE_IDS;

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

const normalizeText = (value: unknown) => (value == null ? "" : String(value));

const normalizeCode = (value: string) => value.trim().toLowerCase();

const parseSelectTypes = (raw: unknown): SelectType[] => {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = normalizeText(row.id ?? row.selecttypeid).trim();
      const code = normalizeText(row.selecttypecode ?? row.code).trim();
      const desc = normalizeText(row.selecttypedesc ?? row.desc).trim();
      return id && code ? { id, code, desc } : null;
    })
    .filter(Boolean) as SelectType[];
};

const parseSelectOptions = (raw: unknown): SelectOption[] => {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = normalizeText(row.id ?? row.valueid).trim();
      const code = normalizeText(row.valuecode ?? row.code ?? row.value).trim();
      const desc = normalizeText(row.valuedesc ?? row.desc ?? row.label).trim();
      const label = desc || code;
      return id && label ? { id, code, label } : null;
    })
    .filter(Boolean) as SelectOption[];
};

const resolveTypeId = (key: SelectTypeKey, types: SelectType[]) => {
  const configured = SELECT_TYPE_IDS[key];
  if (configured) return configured;
  const code = SELECT_TYPE_CODES[key];
  if (!code) return "";
  const matched = types.find((item) => normalizeCode(item.code) === normalizeCode(code));
  return matched?.id ?? "";
};

const getOptionLabel = (options: SelectOption[], value: string) => {
  if (!value) return "";
  const trimmed = value.trim();
  const byId = options.find((opt) => opt.id === trimmed);
  if (byId) return byId.label;
  const byCode = options.find((opt) => normalizeCode(opt.code) === normalizeCode(trimmed));
  if (byCode) return byCode.label;
  return trimmed;
};

const parsePatientTypeIds = (raw: unknown): string[] => {
  const extractId = (value: unknown) => {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return normalizeText(value).trim();
    if (typeof value === "object") {
      const row = value as Record<string, unknown>;
      return normalizeText(row.id ?? row.valueid ?? row.patienttypeid ?? row.patientTypeId ?? row.code ?? row.value).trim();
    }
    return normalizeText(value).trim();
  };

  if (Array.isArray(raw)) {
    return raw.map(extractId).filter(Boolean);
  }
  if (raw == null) return [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return parsePatientTypeIds(parsed);
      } catch {
        return trimmed
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      }
    }
    return trimmed
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (typeof raw === "object") {
    const id = extractId(raw);
    return id ? [id] : [];
  }
  const value = normalizeText(raw).trim();
  return value ? [value] : [];
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
    const doctor = String(
      row.physicians1id ??
      row.physicians1Id ??
      row.physicianid ??
      row.physicianId ??
      row.doctor ??
      row.physician ??
      row.staff ??
      row.doctorName ??
      ""
    ).trim();
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
    const dobRaw = String(row.dateofbirth ?? row.dob ?? row.birthdate ?? "").trim();
    const dobValue = dobRaw ? isoFromDate(dobRaw) : "";
    const computedAge = calculateAgeFromDob(dobRaw || dobValue);
    const patientMeta: PatientInfo = {
      hn,
      an,
      prefix,
      prefixId: "",
      firstName,
      lastName,
      dob: dobValue,
      age: computedAge || String(row.age ?? "").trim(),
      nationality: "",
      nationalityId: "",
      sex: "",
      sexId: "",
      phone: "",
      patientType: "",
      patientTypeIds: "",
      note: "",
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

const calculateAgeFromDob = (value: string) => {
  if (!value) return "";
  const parsed = toLocalDate(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  if (age < 0) return "";
  return String(age);
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

const buildPatientFromResponse = (
  hn: string,
  response: unknown,
  options: {
    prefixOptions: SelectOption[];
    nationalityOptions: SelectOption[];
    sexOptions: SelectOption[];
    patientTypeOptions: SelectOption[];
  }
): PatientInfo | null => {
  const data = (response as { data?: unknown })?.data ?? response;
  const row = data as Record<string, unknown> | null;
  if (!row) return null;
  const prefixId = normalizeText(row.prefixid ?? row.prefixId ?? row.prefix ?? row.title ?? "");
  const nationalityId = normalizeText(row.nationalityid ?? row.nationalityId ?? row.nationality ?? "");
  const sexId = normalizeText(row.sexid ?? row.sexId ?? row.sex ?? row.gender ?? "");
  const patientTypeIds = parsePatientTypeIds(row.patienttype ?? row.patientType ?? []);
  const patientTypeLabel = patientTypeIds
    .map((id) => getOptionLabel(options.patientTypeOptions, id))
    .filter(Boolean)
    .join(", ");
  const dobRaw = normalizeText(row.dateofbirth ?? row.dob ?? row.birthdate ?? "");
  const dobValue = dobRaw ? isoFromDate(dobRaw) : "";
  const computedAge = calculateAgeFromDob(dobRaw || dobValue);
  const patient: PatientInfo = {
    hn: normalizeText(row.hn ?? row.HN ?? hn),
    an: normalizeText(row.an ?? row.AN ?? ""),
    prefix: getOptionLabel(options.prefixOptions, prefixId),
    prefixId,
    firstName: normalizeText(row.firstname ?? row.firstName ?? ""),
    lastName: normalizeText(row.lastname ?? row.lastName ?? ""),
    dob: dobValue,
    age: computedAge || normalizeText(row.age ?? ""),
    nationality: getOptionLabel(options.nationalityOptions, nationalityId),
    nationalityId,
    sex: getOptionLabel(options.sexOptions, sexId),
    sexId,
    phone: normalizeText(row.contactphone ?? row.contactPhone ?? row.phone ?? row.tel ?? ""),
    patientType: patientTypeLabel || patientTypeIds.join(", "),
    patientTypeIds: patientTypeIds.join(", "),
    note: normalizeText(row.note ?? ""),
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
    title: `${item.patient} · ${item.camera} · ${item.doctor}`,
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
  const router = useRouter();
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
  const [prefixOptions, setPrefixOptions] = useState<SelectOption[]>([]);
  const [nationalityOptions, setNationalityOptions] = useState<SelectOption[]>([]);
  const [sexOptions, setSexOptions] = useState<SelectOption[]>([]);
  const [patientTypeOptions, setPatientTypeOptions] = useState<SelectOption[]>([]);
  const [procedureOptions, setProcedureOptions] = useState<SelectOption[]>([]);
  const [mainProcedureOptions, setMainProcedureOptions] = useState<SelectOption[]>([]);
  const [financialOptions, setFinancialOptions] = useState<SelectOption[]>([]);
  const [indicationOptions, setIndicationOptions] = useState<SelectOption[]>([]);
  const [caseTypeOptions, setCaseTypeOptions] = useState<SelectOption[]>([]);
  const [rapidOptions, setRapidOptions] = useState<SelectOption[]>([]);
  const [histopathOptions, setHistopathOptions] = useState<SelectOption[]>([]);
  const [subOptions, setSubOptions] = useState<SelectOption[]>([]);
  const [anestheOptions, setAnestheOptions] = useState<SelectOption[]>([]);
  const [anestheAssistOptions, setAnestheAssistOptions] = useState<SelectOption[]>([]);
  const [physicianOptions, setPhysicianOptions] = useState<SelectOption[]>([]);
  const [nurseOptions, setNurseOptions] = useState<SelectOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<SelectOption[]>([]);
  const [diagnosisOptions, setDiagnosisOptions] = useState<SelectOption[]>([]);
  const [procedureRoomOptions, setProcedureRoomOptions] = useState<SelectOption[]>([]);
  const [procedureRoomLoading, setProcedureRoomLoading] = useState(false);
  const [procedureRoomFilter, setProcedureRoomFilter] = useState("");
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

  const hydratePatientLabels = useCallback(
    (patient: PatientInfo) => {
      const prefix = getOptionLabel(prefixOptions, patient.prefixId || patient.prefix);
      const nationality = getOptionLabel(nationalityOptions, patient.nationalityId || patient.nationality);
      const sex = getOptionLabel(sexOptions, patient.sexId || patient.sex);
      const patientTypeIds = parsePatientTypeIds(patient.patientTypeIds || patient.patientType);
      const patientTypeLabel = patientTypeIds
        .map((id) => getOptionLabel(patientTypeOptions, id))
        .filter(Boolean)
        .join(", ");
      const computedAge = calculateAgeFromDob(patient.dob);
      return {
        ...patient,
        prefix,
        nationality,
        sex,
        patientType: patientTypeLabel || patient.patientType,
        patientTypeIds: patientTypeIds.join(", "),
        age: computedAge || patient.age,
      };
    },
    [prefixOptions, nationalityOptions, sexOptions, patientTypeOptions]
  );

  const filteredDashboardEvents = useMemo(() => {
    if (!procedureRoomFilter) return dashboardEvents;
    const filterLabel = getOptionLabel(procedureRoomOptions, procedureRoomFilter);
    return dashboardEvents.filter((event) => {
      const room = (event.meta?.procedure.room || event.camera || "").trim();
      return room === procedureRoomFilter || room === filterLabel;
    });
  }, [dashboardEvents, procedureRoomFilter, procedureRoomOptions]);

  const filteredMonthEvents = useMemo(() => {
    if (!procedureRoomFilter) return monthEvents;
    const filterLabel = getOptionLabel(procedureRoomOptions, procedureRoomFilter);
    return monthEvents.filter((event) => {
      const room = (event.meta?.procedure.room || event.camera || "").trim();
      return room === procedureRoomFilter || room === filterLabel;
    });
  }, [monthEvents, procedureRoomFilter, procedureRoomOptions]);

  const eventsInRange = useMemo(() => {
    if (!rangeValid || !parsedRangeFrom || !parsedRangeTo) return [];
    const rangeStart = startOfDay(parsedRangeFrom);
    const rangeEnd = endOfDay(parsedRangeTo);
    return filteredDashboardEvents
      .filter((event) => event.start >= rangeStart && event.start <= rangeEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [filteredDashboardEvents, parsedRangeFrom, parsedRangeTo, rangeValid]);

  const todayEvents = useMemo(() => {
    if (!filterDate) return [];
    return filteredDashboardEvents
      .filter((event) => isoFromDate(event.start) === filterDate)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [filteredDashboardEvents, filterDate]);

  useEffect(() => {
    let active = true;
    const loadSelectOptions = async () => {
      setOptionsLoading(true);
      setProcedureRoomLoading(true);
      try {
        let types: SelectType[] = [];
        const needsTypes = Object.values(SELECT_TYPE_IDS).some((value) => !value);
        if (needsTypes) {
          const response = await getSelectTypes();
          if ((response as { error?: unknown })?.error) {
            throw new Error((response as { message?: string })?.message || "โหลดประเภทไม่สำเร็จ");
          }
          const raw = (response as { data?: unknown })?.data ?? response;
          types = parseSelectTypes(raw);
        }
        const typeIds = {
          prefix: resolveTypeId("prefix", types),
          nationality: resolveTypeId("nationality", types),
          sex: resolveTypeId("sex", types),
          patientType: resolveTypeId("patientType", types),
          procedureRoom: resolveTypeId("procedureRoom", types),
          procedure: resolveTypeId("procedure", types),
          mainProcedure: resolveTypeId("mainProcedure", types),
          financial: resolveTypeId("financial", types),
          indication: resolveTypeId("indication", types),
          caseType: resolveTypeId("caseType", types),
          rapid: resolveTypeId("rapid", types),
          histopath: resolveTypeId("histopath", types),
          sub: resolveTypeId("sub", types),
          anesthe: resolveTypeId("anesthe", types),
          anestheAssist: resolveTypeId("anestheAssist", types),
          physician: resolveTypeId("physician", types),
          nurse: resolveTypeId("nurse", types),
          staff: resolveTypeId("staff", types),
          diagnosis: resolveTypeId("diagnosis", types),
        };
        const [
          prefixRes,
          nationalityRes,
          sexRes,
          patientTypeRes,
          procedureRoomRes,
          procedureRes,
          mainProcedureRes,
          financialRes,
          indicationRes,
          caseTypeRes,
          rapidRes,
          histopathRes,
          subRes,
          anestheRes,
          anestheAssistRes,
          physicianRes,
          nurseRes,
          staffRes,
          diagnosisRes,
        ] = await Promise.all([
          typeIds.prefix ? getvaluebyselecttypeid(typeIds.prefix) : Promise.resolve({ data: [] }),
          typeIds.nationality ? getvaluebyselecttypeid(typeIds.nationality) : Promise.resolve({ data: [] }),
          typeIds.sex ? getvaluebyselecttypeid(typeIds.sex) : Promise.resolve({ data: [] }),
          typeIds.patientType ? getvaluebyselecttypeid(typeIds.patientType) : Promise.resolve({ data: [] }),
          typeIds.procedureRoom ? getvaluebyselecttypeid(typeIds.procedureRoom) : Promise.resolve({ data: [] }),
          typeIds.procedure ? getvaluebyselecttypeid(typeIds.procedure) : Promise.resolve({ data: [] }),
          typeIds.mainProcedure ? getvaluebyselecttypeid(typeIds.mainProcedure) : Promise.resolve({ data: [] }),
          typeIds.financial ? getvaluebyselecttypeid(typeIds.financial) : Promise.resolve({ data: [] }),
          typeIds.indication ? getvaluebyselecttypeid(typeIds.indication) : Promise.resolve({ data: [] }),
          typeIds.caseType ? getvaluebyselecttypeid(typeIds.caseType) : Promise.resolve({ data: [] }),
          typeIds.rapid ? getvaluebyselecttypeid(typeIds.rapid) : Promise.resolve({ data: [] }),
          typeIds.histopath ? getvaluebyselecttypeid(typeIds.histopath) : Promise.resolve({ data: [] }),
          typeIds.sub ? getvaluebyselecttypeid(typeIds.sub) : Promise.resolve({ data: [] }),
          typeIds.anesthe ? getvaluebyselecttypeid(typeIds.anesthe) : Promise.resolve({ data: [] }),
          typeIds.anestheAssist ? getvaluebyselecttypeid(typeIds.anestheAssist) : Promise.resolve({ data: [] }),
          typeIds.physician ? getvaluebyselecttypeid(typeIds.physician) : Promise.resolve({ data: [] }),
          typeIds.nurse ? getvaluebyselecttypeid(typeIds.nurse) : Promise.resolve({ data: [] }),
          typeIds.staff ? getvaluebyselecttypeid(typeIds.staff) : Promise.resolve({ data: [] }),
          typeIds.diagnosis ? getvaluebyselecttypeid(typeIds.diagnosis) : Promise.resolve({ data: [] }),
        ]);
        if (!active) return;
        setPrefixOptions(parseSelectOptions((prefixRes as { data?: unknown })?.data ?? prefixRes));
        setNationalityOptions(parseSelectOptions((nationalityRes as { data?: unknown })?.data ?? nationalityRes));
        setSexOptions(parseSelectOptions((sexRes as { data?: unknown })?.data ?? sexRes));
        setPatientTypeOptions(parseSelectOptions((patientTypeRes as { data?: unknown })?.data ?? patientTypeRes));
        setProcedureRoomOptions(parseSelectOptions((procedureRoomRes as { data?: unknown })?.data ?? procedureRoomRes));
        setProcedureOptions(parseSelectOptions((procedureRes as { data?: unknown })?.data ?? procedureRes));
        setMainProcedureOptions(parseSelectOptions((mainProcedureRes as { data?: unknown })?.data ?? mainProcedureRes));
        setFinancialOptions(parseSelectOptions((financialRes as { data?: unknown })?.data ?? financialRes));
        setIndicationOptions(parseSelectOptions((indicationRes as { data?: unknown })?.data ?? indicationRes));
        setCaseTypeOptions(parseSelectOptions((caseTypeRes as { data?: unknown })?.data ?? caseTypeRes));
        setRapidOptions(parseSelectOptions((rapidRes as { data?: unknown })?.data ?? rapidRes));
        setHistopathOptions(parseSelectOptions((histopathRes as { data?: unknown })?.data ?? histopathRes));
        setSubOptions(parseSelectOptions((subRes as { data?: unknown })?.data ?? subRes));
        setAnestheOptions(parseSelectOptions((anestheRes as { data?: unknown })?.data ?? anestheRes));
        setAnestheAssistOptions(parseSelectOptions((anestheAssistRes as { data?: unknown })?.data ?? anestheAssistRes));
        setPhysicianOptions(parseSelectOptions((physicianRes as { data?: unknown })?.data ?? physicianRes));
        setNurseOptions(parseSelectOptions((nurseRes as { data?: unknown })?.data ?? nurseRes));
        setStaffOptions(parseSelectOptions((staffRes as { data?: unknown })?.data ?? staffRes));
        setDiagnosisOptions(parseSelectOptions((diagnosisRes as { data?: unknown })?.data ?? diagnosisRes));
      } catch {
        if (!active) return;
        setPrefixOptions([]);
        setNationalityOptions([]);
        setSexOptions([]);
        setPatientTypeOptions([]);
        setProcedureRoomOptions([]);
        setProcedureOptions([]);
        setMainProcedureOptions([]);
        setFinancialOptions([]);
        setIndicationOptions([]);
        setCaseTypeOptions([]);
        setRapidOptions([]);
        setHistopathOptions([]);
        setSubOptions([]);
        setAnestheOptions([]);
        setAnestheAssistOptions([]);
        setPhysicianOptions([]);
        setNurseOptions([]);
        setStaffOptions([]);
        setDiagnosisOptions([]);
      } finally {
        if (active) setProcedureRoomLoading(false);
        if (active) setOptionsLoading(false);
      }
    };
    loadSelectOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!caseForm.patient) return;
    setCaseForm((prev) => {
      if (!prev.patient) return prev;
      const hydrated = hydratePatientLabels(prev.patient);
      if (
        hydrated.prefix === prev.patient.prefix &&
        hydrated.nationality === prev.patient.nationality &&
        hydrated.sex === prev.patient.sex &&
        hydrated.patientType === prev.patient.patientType
      ) {
        return prev;
      }
      return { ...prev, patient: hydrated };
    });
  }, [caseForm.patient, hydratePatientLabels]);

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      if (!rangeValid) return;
      setDashboardLoading(true);
      setApiError(null);
      const payload: Record<string, string> = { datefrom: rangeFrom, dateto: rangeTo };
      if (procedureRoomFilter) payload.procedureroomid = procedureRoomFilter;
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
  }, [rangeFrom, rangeTo, rangeValid, procedureRoomFilter]);

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
      const payload: Record<string, string> = {
        datefrom: isoFromDate(rangeStart),
        dateto: isoFromDate(rangeEndExclusive),
      };
      if (procedureRoomFilter) payload.procedureroomid = procedureRoomFilter;
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
  }, [calendarDate, view, procedureRoomFilter]);

  useEffect(() => {
    if (selectedEvent || filteredMonthEvents.length === 0) return;
    setSelectedEvent(filteredMonthEvents[0]);
  }, [filteredMonthEvents, selectedEvent]);

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
      const patient = buildPatientFromResponse(hn, response, {
        prefixOptions,
        nationalityOptions,
        sexOptions,
        patientTypeOptions,
      });
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

    Swal.fire({
      title: modalMode === "edit" ? "บันทึกข้อมูล" : "เพิ่มข้อมูล",
      text: "กำลังบันทึกข้อมูล...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const reg = caseForm.registration;
    const start = new Date(`${reg.operationDate}T${reg.timeFrom || "09:00"}:00`);
    const end = new Date(`${reg.operationDate}T${reg.timeTo || "10:00"}:00`);
    const patientName = toFullName(caseForm.patient) || "ไม่ระบุชื่อ";
    const procedureLabel =
      getOptionLabel(mainProcedureOptions, caseForm.procedure.mainProcedure) ||
      getOptionLabel(procedureOptions, caseForm.procedure.procedure) ||
      "Procedure";
    const roomLabel = getOptionLabel(procedureRoomOptions, caseForm.procedure.room) || "Room";
    const physicianLabel = getOptionLabel(physicianOptions, caseForm.physician.physician) || "ไม่ระบุแพทย์";
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
      title: `${patientName} · ${roomLabel} · ${physicianLabel}`,
      start,
      end,
      patient: patientName,
      camera: roomLabel,
      doctor: physicianLabel,
      procedure: procedureLabel,
      status: currentStatus,
      meta,
    };

    const derivedAge = caseForm.patient?.age || (caseForm.patient?.dob ? calculateAgeFromDob(caseForm.patient.dob) : "");
    const payload: Record<string, string | null> = {
      hn: caseForm.hn.trim() || null,
      age: derivedAge || null,
      registerdate: reg.registerDate || null,
      registertime: reg.registerTime || null,
      appointmentdate: reg.appointmentDate || null,
      appointmenttime: reg.appointmentTime || null,
      casedate: reg.operationDate || null,
      casetimefrom: reg.timeFrom || null,
      casetimeto: reg.timeTo || null,
      casenumber: reg.caseNo || null,
      procedureroomid: caseForm.procedure.room || null,
      mainprocedureid: caseForm.procedure.mainProcedure || caseForm.procedure.procedure || null,
      financialid: caseForm.procedure.financial || null,
      indicationid: caseForm.procedure.indication || null,
      rapidtestresultid: caseForm.procedure.rapid || null,
      histopathologyid: caseForm.procedure.histopath || null,
      subprocedureid: caseForm.procedure.sub || null,
      patienttypeopdid: caseForm.procedure.caseType || null,
      anesthesiamethodid: caseForm.procedure.anesthe || null,
      anesthetistid: caseForm.procedure.anestheAssist || null,
      physicians1id: caseForm.physician.physician || null,
      nurse1id: caseForm.physician.nurse1 || null,
      nurse2id: caseForm.physician.nurse2 || null,
      staff1id: caseForm.physician.staff1 || null,
      staff2id: caseForm.physician.staff2 || null,
      prediagnosisdx1id: caseForm.physician.dx1 || caseForm.physician.preDiagnosis || null,
      prediagnosisdx2id: caseForm.physician.dx2 || null,
    };

    const response =
      modalMode === "edit" && editingEventId
        ? await putCalendarCase(editingEventId, payload)
        : await postCalendarCase(payload);

    if ((response as { error?: unknown })?.error) {
      Swal.fire({
        icon: "error",
        title: "บันทึกข้อมูลไม่สำเร็จ",
        text: (response as { message?: string })?.message || "โปรดลองใหม่อีกครั้ง",
      });
      return;
    }
    if ((response as { status?: boolean })?.status === false) {
      Swal.fire({
        icon: "error",
        title: "บันทึกข้อมูลไม่สำเร็จ",
        text: (response as { message?: string })?.message || "โปรดลองใหม่อีกครั้ง",
      });
      return;
    }

    const updatedRaw = (response as { data?: unknown })?.data ?? response;
    const updatedItems = Array.isArray(updatedRaw) ? updatedRaw : updatedRaw ? [updatedRaw] : [];
    const updatedEvents = updatedItems.length ? toCaseItems({ data: updatedItems }).map(toCalendarEvent) : [];
    const savedEvent = updatedEvents[0] ?? nextEvent;

    const upsertEventList = (events: BigCalendarEvent[]) => {
      if (modalMode === "edit" && editingEventId) {
        return events.map((event) => (event.id === editingEventId ? savedEvent : event));
      }
      return [...events, savedEvent];
    };
    setDashboardEvents(upsertEventList);
    setMonthEvents(upsertEventList);
    setSelectedEvent(savedEvent);

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
  const todayIso = isoFromDate(today);
  const weekFromIso = todayIso;
  const weekToIso = isoFromDate(addDays(today, 6));
  const monthFromIso = isoFromDate(startOfMonth(today));
  const monthToIso = isoFromDate(endOfMonth(today));
  const isTodayActive = rangeFrom === todayIso && rangeTo === todayIso;
  const isWeekActive = rangeFrom === weekFromIso && rangeTo === weekToIso;
  const isMonthActive = rangeFrom === monthFromIso && rangeTo === monthToIso;
  const quickRangeClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] transition ${active
      ? "border-teal-400 bg-teal-500 text-white shadow-[0_8px_18px_rgba(20,184,166,0.25)]"
      : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
    }`;

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

  const handleScopeRedirect = () => {
    const params = new URLSearchParams();
    const hn = caseForm.hn.trim();
    // if (hn) params.set("hn", hn);
    if (editingEventId) params.set("caseId", editingEventId);
    // const caseNo = caseForm.registration.caseNo.trim();
    // if (caseNo) params.set("caseNo", caseNo);
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  };

  const CalendarEvent = ({ event }: { event: BigCalendarEvent }) => {
    const doctorSource = event.meta?.physician.physician || event.doctor;
    const doctorLabel = getOptionLabel(physicianOptions, doctorSource) || doctorSource || "ไม่ระบุแพทย์";
    const roomSource = event.meta?.procedure.room || event.camera;
    const roomLabel = getOptionLabel(procedureRoomOptions, roomSource) || roomSource || "ไม่ระบุห้อง";
    return (
      <div className="space-y-0.5">
        <div className="text-[11px] font-semibold">
          {event.patient} · {roomLabel} · {doctorLabel}
        </div>
      </div>
    );
  };

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

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setRangeFrom(todayIso);
                      setRangeTo(todayIso);
                    }}
                    className={quickRangeClass(isTodayActive)}
                  >
                    วันนี้
                  </button>
                  <button
                    onClick={() => {
                      setRangeFrom(weekFromIso);
                      setRangeTo(weekToIso);
                    }}
                    className={quickRangeClass(isWeekActive)}
                  >
                    สัปดาห์นี้
                  </button>
                  <button
                    onClick={() => {
                      setRangeFrom(monthFromIso);
                      setRangeTo(monthToIso);
                    }}
                    className={quickRangeClass(isMonthActive)}
                  >
                    เดือนนี้
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Procedure Room</label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none"
                    value={procedureRoomFilter}
                    onChange={(event) => setProcedureRoomFilter(event.target.value)}
                    disabled={procedureRoomLoading}
                  >
                    <option value="">{procedureRoomLoading ? "กำลังโหลด..." : "ทั้งหมด"}</option>
                    {procedureRoomOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                        <p className="mt-1 font-semibold text-slate-900">
                          {event.patient} ·{" "}
                          {getOptionLabel(procedureRoomOptions, event.meta?.procedure.room || event.camera) ||
                            event.meta?.procedure.room ||
                            event.camera ||
                            "ไม่ระบุห้อง"}{" "}
                          ·{" "}
                          {getOptionLabel(physicianOptions, event.meta?.physician.physician || event.doctor) ||
                            event.meta?.physician.physician ||
                            event.doctor ||
                            "ไม่ระบุแพทย์"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {event.camera} · {event.procedure}
                          {getOptionLabel(physicianOptions, event.doctor)
                            ? ` · ${getOptionLabel(physicianOptions, event.doctor)}`
                            : ""}
                        </p>
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
                    events={filteredMonthEvents}
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
                      event: CalendarEvent,
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
                <button
                  type="button" 
                  onClick={handleScopeRedirect}
                  className="cursor-pointer rounded-full border border-blue-200 bg-blue-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 hover:border-blue-300 hover:bg-blue-500/20"
                >
                  ส่องกล้อง
                </button>
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
                  <div className="col-span-12 lg:col-span-4">
                    <label className={labelClass}>Patient Type</label>
                    <input className={fieldClass} value={caseForm.patient?.patientType ?? ""} readOnly disabled />
                  </div>
                  <div className="col-span-12">
                    <label className={labelClass}>Note</label>
                    <textarea className={fieldClass} value={caseForm.patient?.note ?? ""} rows={2} readOnly disabled />
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
                        procedureRoomOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        procedureOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        mainProcedureOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        financialOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        indicationOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        caseTypeOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        rapidOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        histopathOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        subOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        anestheOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        anestheAssistOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        physicianOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        nurseOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        nurseOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        staffOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        staffOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
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
                        diagnosisOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className={labelClass}>Dx1</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.physician.dx1}
                      onChange={(e) => updatePhysician("dx1", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือก Dx1"}</option>
                      {!optionsLoading &&
                        diagnosisOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className={labelClass}>Dx2</label>
                    <select
                      className={fieldClass}
                      disabled={fieldsDisabled || optionsLoading}
                      value={caseForm.physician.dx2}
                      onChange={(e) => updatePhysician("dx2", e.target.value)}
                    >
                      <option value="">{optionsLoading ? "กำลังโหลด..." : "เลือก Dx2"}</option>
                      {!optionsLoading &&
                        diagnosisOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                    </select>
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
