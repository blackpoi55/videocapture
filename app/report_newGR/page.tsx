// app/report_newCR/page.tsx
import { Suspense } from "react";
import PrintButton from "@/components/printbuttom/printbut";
import ReportNewGRClient from "@/components/report_new/reportnewGR-client";
import SecondPage from "@/components/report_new/secondGRpage";

async function getPersonHistory(id: string) {
  const res = await fetch(
    `https://api-uat-intraview.telecorp.co.th/api/history/getpersonhistorybyid/${id}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch person history");
  }

  return res.json();
}

export default async function ReportPage() {
  const data = await getPersonHistory("1071");

  return (
    <Suspense fallback={<div>Loading…</div>}>
      <PrintButton />
      <ReportNewGRClient data={data} />
      <SecondPage data={data} />
    </Suspense>
  );
}
