"use client";

import Swal from "sweetalert2";

export const alertOk = (title: string, text?: string) =>
  Swal.fire({
    icon: "success",
    title,
    text,
    toast: true,
    position: "top-end",
    timer: 3000,
    showConfirmButton: false,
    timerProgressBar: true,
  });

export const alertErr = (title: string, text?: string) =>
  Swal.fire({
    icon: "error",
    title,
    text,
    toast: true,
    position: "top-end",
    timer: 3000,
    showConfirmButton: false,
    timerProgressBar: true,
  });

export const alertInfo = (title: string, text?: string) =>
  Swal.fire({
    icon: "info",
    title,
    text,
    toast: true,
    position: "top-end",
    timer: 3000,
    showConfirmButton: false,
    timerProgressBar: true,
  });

export async function confirmSwal(title: string, text?: string) {
  const r = await Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    reverseButtons: true,
  });
  return r.isConfirmed;
}
