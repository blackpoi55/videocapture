"use client";
export default function PrintButton() {
  const handlePrint = () => window.print();
  return (
    <div className="flex justify-end p-4 print:hidden">
      <button
        onClick={handlePrint}
        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
      >
        พิมพ์รายงาน
      </button>
    </div>
  );
}