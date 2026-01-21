// Uat
export const API = process.env.NEXT_PUBLIC_API ?? "http://localhost:4000/api";
//export const API = 'http://localhost:8061'
// Production

export const SELECT_TYPE_IDS = {
  prefix: "20",
  nationality: "22",
  sex: "21",
  patientType: "2",
  procedureRoom: "6",
  procedure: "",
  mainProcedure: "7",
  financial: "9",
  indication: "11",
  caseType: "",
  rapid: "14",
  histopath: "15",
  sub: "8",
  anesthe: "12",
  anestheAssist: "13",
  physician: "16",
  nurse: "17",
  staff: "18",
  diagnosis: "19",
};

export const SELECT_TYPE_CODES = {
  prefix: "PREFIX",
  nationality: "NATIONALITY",
  sex: "SEX",
  patientType: "PATIENTTYPE",
  procedureRoom: "PROCEDUREROOM",
  procedure: "PROCEDURE",
  mainProcedure: "MAINPROCEDURE",
  financial: "FINANCIAL",
  indication: "INDICATION",
  caseType: "CASETYPE",
  rapid: "RAPID",
  histopath: "HISTOPATHOLOGY",
  sub: "SUBPROCEDURE",
  anesthe: "ANESTHESIAMETHOD",
  anestheAssist: "ANESTHESIST",
  physician: "PHYSICIANS",
  nurse: "NURSE",
  staff: "STAFF",
  diagnosis: "DIAGNOSIS",
};
