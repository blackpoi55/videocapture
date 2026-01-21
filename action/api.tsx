import { GET, POST, POST_Login, PUT } from "@/components/apicomponent/api";

export const loginapi = (data: unknown) => {
  return POST_Login("/auth/login", data);
};

export const postCalendagetdata = (data: unknown) => {
  return POST("/history/bydatetodate", data);
};

export const getbyHN = (hn: unknown) => {
  return GET("/patients/"+hn);
};

export const getSelectTypes = () => {
  return GET("/select-types");
}

export const getvaluebyselecttypeid = (id: string) => {
  return GET("/select-values/getvaluebyselecttypeid/"+id);
}

export const postPatient = (data: unknown) => {
  return POST("/patients", data);
};

export const putPatient = (hn: string, data: unknown) => {
  return PUT(`/patients/${hn}`, data);
};

export const postCalendarCase = (data: unknown) => {
  return POST("/history", data);
};
export const getCasebyid = (id: string) => {
  return GET(`/history/${id}`);
};
export const putCalendarCase = (id: string, data: unknown) => {
  return PUT(`/history/${id}`, data);
};
