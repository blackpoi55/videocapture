import { DirHandle, FileItem } from "./types";

export async function ensureDir(parent: DirHandle, name: string): Promise<DirHandle> {
  return await parent.getDirectoryHandle(name, { create: true });
}

export async function listDirs(parent: DirHandle): Promise<string[]> {
  const out: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const [name, handle] of parent.entries()) {
    if (handle.kind === "directory") out.push(name);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export async function listFiles(dir: DirHandle): Promise<FileItem[]> {
  const items: FileItem[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file") continue;
    const file = await (handle as FileSystemFileHandle).getFile();
    items.push({
      name,
      kind: "file",
      type: file.type || "",
      size: file.size,
      lastModified: file.lastModified,
      handle: handle as FileSystemFileHandle,
    });
  }
  items.sort((a, b) => b.lastModified - a.lastModified);
  return items;
}

export async function writeFile(handle: FileSystemFileHandle, blob: Blob) {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function deleteEntry(dir: DirHandle, name: string) {
  await dir.removeEntry(name);
}

export function isImageType(t: string, name: string) {
  if (t.startsWith("image/")) return true;
  return /\.(png|jpg|jpeg|webp|bmp)$/i.test(name);
}

export function isVideoType(t: string, name: string) {
  if (t.startsWith("video/")) return true;
  return /\.(webm|mp4|mov|mkv)$/i.test(name);
}

export function humanSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}
