export function isFsAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDirectory(): Promise<any> {
  const picker = (window as any).showDirectoryPicker;
  if (!picker) throw new Error("Browser does not support showDirectoryPicker()");
  return await picker();
}

export async function requestRWPermission(handle: any): Promise<boolean> {
  try {
    const q = await handle.queryPermission?.({ mode: "readwrite" });
    if (q === "granted") return true;
    const r = await handle.requestPermission?.({ mode: "readwrite" });
    return r === "granted";
  } catch {
    return false;
  }
}

export type DirFileMeta = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

export async function listFiles(dirHandle: any): Promise<DirFileMeta[]> {
  const out: DirFileMeta[] = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle?.kind !== "file") continue;
    try {
      const file = await handle.getFile();
      out.push({
        name,
        size: file.size,
        type: file.type || guessMimeFromName(name),
        lastModified: file.lastModified || 0,
      });
    } catch {}
  }
  out.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  return out;
}

export async function listDirectories(dirHandle: any): Promise<string[]> {
  const out: string[] = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle?.kind === "directory") out.push(name);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export async function ensureDirectory(parentDirHandle: any, name: string): Promise<any> {
  return await parentDirHandle.getDirectoryHandle(name, { create: true });
}

export async function ensurePath(rootDirHandle: any, parts: string[]): Promise<any> {
  let cur = rootDirHandle;
  for (const p of parts) {
    cur = await ensureDirectory(cur, p);
  }
  return cur;
}

export async function writeFileToDir(dirHandle: any, filename: string, blob: Blob) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function readFileFromDir(dirHandle: any, filename: string): Promise<File> {
  const fileHandle = await dirHandle.getFileHandle(filename);
  return await fileHandle.getFile();
}

export async function deleteFileFromDir(dirHandle: any, filename: string) {
  await dirHandle.removeEntry(filename);
}

function guessMimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  return "";
}
