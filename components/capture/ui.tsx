"use client";

import React from "react";

export function GlassCard(props: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] ${props.className || ""}`}
    >
      {(props.title || props.right) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <div className="text-sm font-semibold text-white/90">{props.title}</div>
          {props.right}
        </div>
      )}
      <div className="p-5 pt-4">{props.children}</div>
    </section>
  );
}

export function PillButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "primary" | "ghost" | "danger";
  }
) {
  const tone = props.tone || "ghost";
  const cls =
    tone === "ghost"
      ? "bg-teal-500/10 hover:bg-teal-500/20 border-teal-400/20"
      : "bg-teal-500/20 hover:bg-teal-500/30 border-teal-400/30";
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-2xl border text-sm text-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed ${cls} ${props.className || ""}`}
    />
  );
}

export function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-10 w-10 rounded-2xl border border-teal-400/20 bg-teal-500/10 hover:bg-teal-500/20 text-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed ${props.className || ""}`}
    />
  );
}
