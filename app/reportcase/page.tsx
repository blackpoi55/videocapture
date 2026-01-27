// app/report_newCR/page.tsx
import { Suspense } from "react";
<<<<<<< HEAD
import Box1 from "@/components/inputcase/Box1";
import Box2 from "@/components/inputcase/Box2";
import Box3 from "@/components/inputcase/Box3";
import Box4 from "@/components/inputcase/Box4";
import Box5 from "@/components/inputcase/Box5";
import Box6 from "@/components/inputcase/Box6"; 
import Box7 from "@/components/inputcase/Box7";
import { getpersonhistorybyid } from "@/action/api";


export default async function reportcasePage() {
  const data = await getpersonhistorybyid("1082");
console.log("dataaaaaaaaaaaaaaa",data)
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <Box1 />
      <Box2 />
      <Box3 />
      <Box4 />
      <Box5 />
      <Box6 />
      <Box7 />
    </Suspense>
  );
=======
import ReportcasePage1 from "@/components/inputreport/ReportcasePage1";
export default async function reportcasePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReportcasePage1/>
        </Suspense>
    );
>>>>>>> 9cf2f6ee88e9a7cae6adb7a96c3031553334ecb0
}
