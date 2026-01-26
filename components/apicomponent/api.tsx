import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { API } from '../../config';

type ApiError = {
  error: unknown;
  message: string;
};

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message || "";
  }
  return "";
};

export const GET = <T = unknown>(URL: string, config: AxiosRequestConfig = {}): Promise<T | ApiError> => {
  let Token = "";
  if (typeof window !== "undefined") {
    Token = localStorage.getItem("intraview_token") || "";
  }
  const headers = {
    Authorization: Token ? `Bearer ${Token}` : "",
    "Content-Type": "application/json",
    ...(config.headers ?? {}),
  };
  return axios({
    method: 'GET',
    url: `${API}${URL}`,
    headers,
    ...config,
  }).then((res) => res.data).catch((err) => ({
    error: err,
    message: getErrorMessage(err),
  }));
};

export const POST = <T = unknown, D = unknown>(URL: string, data: D): Promise<T | ApiError> => {
  const Token = localStorage.getItem("intraview_token");
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  console.log("first", `${API}${URL}`);
  return axios({
    method: 'POST',
    url: `${API}${URL}`,
    data: data,
    headers: {
      Authorization: Token ? `Bearer ${Token}` : "",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  }).then((result) => {
    // console.log('getCookie', result.data)
    // console.log("token",Token)
    return result.data

  }).catch((err) => {
    console.log(err);
    return { error: err, message: getErrorMessage(err) };
  });
};

export const PUT = <T = unknown, D = unknown>(URL: string, data: D): Promise<T | ApiError> => {
  const Token = localStorage.getItem("intraview_token");
  return axios({
    method: 'PUT',
    url: `${API}${URL}`,
    data: data,
    headers: {
      Authorization: Token ? `Bearer ${Token}` : "",
      "Content-Type": "application/json",
    },
  }).then((result) => {
    // console.log('getCookie', result.data)
    return result.data

  }).catch((err) => {
    console.log(err);
    return { error: err, message: getErrorMessage(err) };
  });
};

export const DELETE = <T = unknown>(URL: string): Promise<T | ApiError> => {
  const Token = localStorage.getItem("intraview_token");
  return axios({
    method: 'DELETE',
    url: `${API}${URL}`,
    // data: data,
    headers: {
      Authorization: Token ? `Bearer ${Token}` : "",
      "Content-Type": "application/json",
    },
  }).then((result) => {
    // console.log('getCookie', result.data)
    return result.data

  }).catch((err) => {
    console.log(err);
    return { error: err, message: getErrorMessage(err) };
  });
};

export const POST_Login = async (URL: string, data: any) => {
  return axios({
    method: 'POST',
    url: `${API}${URL}`,
    data: data,
    headers: {
      'Content-Type': 'application/json'
    },
  }).then((result) => {
    return result.data

  }).catch(err => {
    console.log(err);
    return { error: err, message: err?.response?.data?.message || "" }
  });
}
