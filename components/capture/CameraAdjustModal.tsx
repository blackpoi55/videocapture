"use client";

import React from "react";

export function CameraAdjustModal(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { open, onClose, children } = props;
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[99998] pointer-events-none" />
      <div className="fixed right-4 top-4 z-[99999] w-[420px] max-w-[90vw] rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl pointer-events-auto">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="text-white/90 font-semibold">Adjust Camera</div>
          {/* <PillButton tone="danger" onClick={onClose}>
            Close
          </PillButton> */}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </>
  );
}
