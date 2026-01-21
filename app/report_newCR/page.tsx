import { Suspense } from "react";


import ReportNewCRClient from "../../components/report_new/reportnewCR-client";
import SecondPage from "../../components/report_new/secondCRpage";

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#eef2f6] text-slate-700" aria-busy="true">
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#eef2f6]">
            <div className="flex items-center gap-3" role="status" aria-live="polite">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-600 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Loading report</span>
            </div>
          </div>
        </main>
      }
    >

    <ReportNewCRClient />
    <SecondPage />
    </Suspense>
  );
}
