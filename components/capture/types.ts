export type DirHandle = FileSystemDirectoryHandle;

export type FileItem = {
  name: string;
  kind: "file";
  type: string;
  size: number;
  lastModified: number;
  handle: FileSystemFileHandle;
  url?: string;
};
