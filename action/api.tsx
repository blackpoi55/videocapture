import { DELETE, GET, POST, POST_Login, PUT } from "@/components/apicomponent/api";

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

export const postSelectType = (data: unknown) => {
  return POST("/select-types", data);
};

export const putSelectType = (id: string, data: unknown) => {
  return PUT(`/select-types/${id}`, data);
};

export const deleteSelectType = (id: string) => {
  return DELETE(`/select-types/${id}`);
};

export const postSelectValue = (data: unknown) => {
  return POST("/select-values", data);
};

export const putSelectValue = (id: string, data: unknown) => {
  return PUT(`/select-values/${id}`, data);
};

export const deleteSelectValue = (id: string) => {
  return DELETE(`/select-values/${id}`);
};

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
export const getpersonhistorybyid = (id: string) => {
  return GET(`/history/getpersonhistorybyid/${id}`);
};
export const putCalendarCase = (id: string, data: unknown) => {
  return PUT(`/history/${id}`, data);
};
