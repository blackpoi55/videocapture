// app/report_newCR/page.tsx
import { Suspense } from "react";
import PrintButton from "@/components/printbuttom/printbut";
import ReportNewCRClient from "@/components/report_new/reportnewCR-client";
import SecondPage from "@/components/report_new/secondCRpage";
import { getpersonhistorybyid } from "@/action/api";


export default async function ReportPage() {
  const data = await getpersonhistorybyid("1082");
console.log("dataaaaaaaaaaaaaaa",data)
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <PrintButton />
      <ReportNewCRClient data={data} />
      <SecondPage data={data} />
    </Suspense>
  );
}
