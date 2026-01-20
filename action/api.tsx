import { GET, POST, POST_Login } from "@/components/apicomponent/api";

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