// Uat
export const API = process.env.NEXT_PUBLIC_API ?? "http://localhost:4000/api";
//export const API = 'http://localhost:8061'
// Production

export const SELECT_TYPE_IDS = {
  prefix: "",
  nationality: "",
  sex: "",
  patientType: "",
};

export const SELECT_TYPE_CODES = {
  prefix: "PREFIX",
  nationality: "NATIONALITY",
  sex: "SEX",
  patientType: "PATIENTTYPE",
};
