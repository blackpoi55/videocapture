import { get, set, del } from "idb-keyval";

const KEY = "capture_root_dir_handle_v1";

export async function saveDirHandle(handle: any) {
  await set(KEY, handle);
}

export async function loadDirHandle<T = any>() {
  return (await get(KEY)) as T | undefined;
}

export async function clearDirHandle() {
  await del(KEY);
}
