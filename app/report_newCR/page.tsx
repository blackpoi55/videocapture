// app/report_newCR/page.tsx
"use client";

import { useEffect, useState } from "react";
import PrintButton from "@/components/printbuttom/printbut";
import ReportNewCRClient from "@/components/report_new/reportnewCR-client";
import SecondPage from "@/components/report_new/secondCRpage";
import { getpersonhistorybyid } from "@/action/api";

export default function ReportPage() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await getpersonhistorybyid("1082");
        if (!active) return;
        if ((res as { error?: unknown })?.error) {
          setError((res as { message?: string })?.message || "โหลดข้อมูลไม่สำเร็จ");
          setData(null);
        } else {
          setData(res);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!data) {
    return <div>No data</div>;
  }

  return (
    <>
      <PrintButton />
      <ReportNewCRClient data={data} />
      <SecondPage data={data} />
    </>
  );
}
