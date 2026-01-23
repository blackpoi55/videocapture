"use client";

import { useEffect, useState } from "react";
import { isImageType } from "./file-utils";
import type { FileItem } from "./types";

export function Thumb({ file }: { file: FileItem }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let currentUrl: string | null = null;
    (async () => {
      try {
        const f = await file.handle.getFile();
        const u = URL.createObjectURL(f);
        if (!alive) return;
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = u;
        setUrl(u);
      } catch {
        setUrl(null);
      }
    })();
    return () => {
      alive = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.name, file.lastModified]);

  const isImg = isImageType(file.type, file.name);
  return (
    <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden flex items-center justify-center shrink-0">
      {isImg && url ? (
        <img src={url} alt={file.name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-white/40 text-xs">FILE</span>
      )}
    </div>
  );
}
