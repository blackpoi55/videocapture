// app/report_newCR/page.tsx
import { Suspense } from "react";
import ReportcasePage1 from "@/components/inputreport/ReportcasePage1";
export default async function reportcasePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReportcasePage1/>
        </Suspense>
    );
}
