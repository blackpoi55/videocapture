"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { alertErr, alertInfo, alertOk } from "./alerts";
import { isImageType, listFiles, writeFile } from "./file-utils";
import type { DirHandle, FileItem } from "./types";
import { PillButton } from "./ui";

/** ---------------------------
 *  Fabric Image Editor Modal (dynamic import)
 *  --------------------------*/
export function ImageEditorModal(props: {
  open: boolean;
  onClose: () => void;
  file: FileItem | null;
  chooseDir: DirHandle | null;
  onSaved: () => Promise<void>;
}) {
  const { open, onClose, file, chooseDir, onSaved } = props;

  const hostRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const fabricRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const bgImgRef = useRef<any>(null);
  const clipboardRef = useRef<any[] | null>(null);

  const [tool, setTool] = useState<"select" | "text" | "arrow" | "rect" | "circle" | "crop">("select");
  const [stroke, setStroke] = useState("#0008FF");
  const [fill, setFill] = useState("rgba(0,0,0,0)");
  const [fontSize, setFontSize] = useState(40);
  const [strokeW, setStrokeW] = useState(6);
  const [imgBrightness, setImgBrightness] = useState(0);
  const [imgContrast, setImgContrast] = useState(0);
  const [imgSaturation, setImgSaturation] = useState(0);
  const [imgShadow, setImgShadow] = useState(0);
  const imgAdjustRef = useRef({ brightness: 0, contrast: 0, saturation: 0, shadow: 0 });
  const transparentFill = "rgba(0,0,0,0)";
  const [busy, setBusy] = useState(false);
  const toolRef = useRef(tool);
  const strokeRef = useRef(stroke);
  const fillRef = useRef(fill);
  const fontSizeRef = useRef(fontSize);
  const strokeWRef = useRef(strokeW);

  const buildAdjustFilters = useCallback((lib: any) => {
    const filtersLib = lib.filters || lib.Image?.filters || lib.fabric?.filters;
    if (!filtersLib) return [];

    const filters: any[] = [];
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const { brightness, contrast, saturation, shadow } = imgAdjustRef.current;
    const br = clamp(brightness, -100, 100) / 100;
    const ct = clamp(contrast, -100, 100) / 100;
    const sa = clamp(saturation, -100, 100) / 100;
    const sh = clamp(shadow, -100, 100);

    if (br !== 0 && filtersLib.Brightness) filters.push(new filtersLib.Brightness({ brightness: br }));
    if (ct !== 0 && filtersLib.Contrast) filters.push(new filtersLib.Contrast({ contrast: ct }));
    if (sa !== 0 && filtersLib.Saturation) filters.push(new filtersLib.Saturation({ saturation: sa }));
    if (sh !== 0 && filtersLib.Gamma) {
      const gamma = clamp(1 + (sh / 100) * 0.8, 0.2, 2.2);
      filters.push(new filtersLib.Gamma({ gamma: [gamma, gamma, gamma] }));
    }
    return filters;
  }, []);

  const applyStyleToActive = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a || a === bgImgRef.current) return;

    const common = {
      stroke: strokeRef.current,
      strokeWidth: strokeWRef.current,
    };

    if (a.type === "i-text" || a.type === "textbox") {
      a.set({
        fill: strokeRef.current,
        fontSize: fontSizeRef.current,
      });
    } else if (a.type === "path") {
      a.set({ ...common, fill: strokeRef.current });
    } else if (a.type === "rect" || a.type === "circle" || a.type === "triangle") {
      a.set({ ...common, fill: transparentFill });
    } else if (a.type === "line") {
      a.set({
        stroke: strokeRef.current,
        strokeWidth: strokeWRef.current,
      });
    }
    c.requestRenderAll();
  }, []);

  const applyImageAdjustments = useCallback(() => {
    const c = canvasRef.current;
    const bg = bgImgRef.current;
    const fabric = fabricRef.current as any;
    if (!c || !bg || !fabric) return;

    const filters = buildAdjustFilters(fabric);
    bg.filters = filters;
    bg.applyFilters();
    c.requestRenderAll();
  }, [buildAdjustFilters]);

  const pushState = useCallback(() => { }, []);

  const destroyCanvas = useCallback(() => {
    try {
      const c = canvasRef.current;
      if (c) {
        c.dispose();
      }
    } catch { }
    canvasRef.current = null;
    bgImgRef.current = null;
    fabricRef.current = null;
  }, []);

  const loadEditor = useCallback(async () => {
    if (!open || !file || !chooseDir) return;
    if (!hostRef.current) return;

    setBusy(true);
    try {
      // dynamic import fabric (Fix SSR + Fix "export fabric doesn't exist")
      const fabric = await import("fabric");
      fabricRef.current = fabric;

      const { Canvas, FabricImage, Rect, Circle, Line, IText, Path } = fabric as any;

      const c = new Canvas(hostRef.current, {
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: "#0b1020",
      });
      canvasRef.current = c;

      // Load file blob
      const fh = await chooseDir.getFileHandle(file.name);
      const f = await fh.getFile();
      const url = URL.createObjectURL(f);

      const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });

      // Fit canvas to container
      const fit = () => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        c.setWidth(w);
        c.setHeight(h);
        c.requestRenderAll();
      };

      fit();

      const bg = new FabricImage(imgEl, { selectable: false, evented: false });
      bgImgRef.current = bg;

      // Scale bg to fit canvas
      const scale = Math.min(c.getWidth() / (bg.width || 1), c.getHeight() / (bg.height || 1));
      bg.scale(scale);
      bg.set({
        left: (c.getWidth() - (bg.getScaledWidth?.() ?? 0)) / 2,
        top: (c.getHeight() - (bg.getScaledHeight?.() ?? 0)) / 2,
      });
      c.add(bg);
      c.sendObjectToBack(bg);
      applyImageAdjustments();

      // tool drawing (single-click to drop; crop uses drag)
      const getPointer = (opt: any) => c.getPointer(opt.e);
      let isCropping = false;
      let cropTemp: any = null;
      let cropStartX = 0;
      let cropStartY = 0;

      let isDrawing = false;
      let drawTemp: any = null;
      let drawStartX = 0;
      let drawStartY = 0;
      let drawTool: "text" | "arrow" | "rect" | "circle" | null = null;

      const baseArrowLen = 36;
      const baseArrowHalfW = 12;
      const minArrowLen = 12;

      const createArrowPath = (len: number, halfW: number) => {
        const halfLen = len / 2;
        return `M ${halfLen} 0 L ${-halfLen} ${-halfW} L ${-halfLen} ${halfW} Z`;
      };

      const startDrawing = (p: { x: number; y: number }) => {
        const currentTool = toolRef.current;
        if (currentTool === "select" || currentTool === "crop") return;

        drawStartX = p.x;
        drawStartY = p.y;
        isDrawing = true;
        drawTool = currentTool;

        const commonSelectable = { selectable: false, evented: false };
        if (currentTool === "text") {
          drawTemp = new IText("พิมพ์ข้อความ", {
            left: p.x,
            top: p.y,
            fontSize: fontSizeRef.current,
            fill: strokeRef.current,
            ...commonSelectable,
            originX: "center",
            originY: "center",
          });
        } else if (currentTool === "arrow") {
          drawTemp = new Path(createArrowPath(baseArrowLen, baseArrowHalfW), {
            left: p.x,
            top: p.y,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            fill: strokeRef.current,
            originX: "center",
            originY: "center",
            ...commonSelectable,
          });
        } else if (currentTool === "rect") {
          drawTemp = new Rect({
            left: p.x,
            top: p.y,
            width: 1,
            height: 1,
            fill: transparentFill,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            ...commonSelectable,
          });
        } else if (currentTool === "circle") {
          drawTemp = new Circle({
            left: p.x,
            top: p.y,
            radius: 1,
            fill: transparentFill,
            stroke: strokeRef.current,
            strokeWidth: strokeWRef.current,
            ...commonSelectable,
          });
        }

        if (!drawTemp) return;
        c.add(drawTemp);
        c.requestRenderAll();
      };

      const updateDrawing = (p: { x: number; y: number }) => {
        if (!isDrawing) return;
        if (!drawTemp) return;

        const dx = p.x - drawStartX;
        const dy = p.y - drawStartY;

        if (drawTool === "text") {
          const baseFont = Math.max(6, fontSizeRef.current);
          const scaleX = Math.max(0.1, Math.abs(dx) / baseFont);
          const scaleY = Math.max(0.1, Math.abs(dy) / baseFont);
          drawTemp.set({
            left: drawStartX + dx / 2,
            top: drawStartY + dy / 2,
            scaleX,
            scaleY,
          });
        } else if (drawTool === "rect") {
          drawTemp.set({
            left: Math.min(drawStartX, p.x),
            top: Math.min(drawStartY, p.y),
            width: Math.max(1, Math.abs(dx)),
            height: Math.max(1, Math.abs(dy)),
          });
        } else if (drawTool === "circle") {
          const radius = Math.max(1, Math.max(Math.abs(dx), Math.abs(dy)) / 2);
          const cx = drawStartX + dx / 2;
          const cy = drawStartY + dy / 2;
          drawTemp.set({
            left: cx - radius,
            top: cy - radius,
            radius,
          });
        } else if (drawTool === "arrow") {
          const rad = Math.atan2(dy, dx);
          const angle = (rad * 180) / Math.PI;
          const dist = Math.hypot(dx, dy);
          const scaledLen = Math.max(minArrowLen, dist);
          const scale = scaledLen / baseArrowLen;
          const offsetX = Math.cos(rad) * (scaledLen / 2);
          const offsetY = Math.sin(rad) * (scaledLen / 2);
          drawTemp.set({
            left: p.x - offsetX,
            top: p.y - offsetY,
            angle,
            scaleX: scale,
            scaleY: scale,
          });
        }
        c.requestRenderAll();
      };

      const finishDrawing = (p: { x: number; y: number }) => {
        if (!isDrawing) return;

        updateDrawing(p);
        isDrawing = false;

        if (drawTemp) {
          const shouldReturnSelect = drawTool === "text";
          drawTemp.set({ selectable: true, evented: true });
          c.setActiveObject(drawTemp);
          pushState();
          drawTemp = null;
          drawTool = null;
          if (shouldReturnSelect && toolRef.current !== "select") {
            toolRef.current = "select";
            setTool("select");
          }
        }
      };

      const onMouseDown = (opt: any) => {
        const p = getPointer(opt);
        const currentTool = toolRef.current;
        if (currentTool === "crop") {
          // keep only one crop rect at a time
          c.getObjects().forEach((o: any) => {
            if (o?.type === "rect" && Array.isArray(o.strokeDashArray) && o.strokeDashArray.length > 0) {
              c.remove(o);
            }
          });
          isCropping = true;
          cropStartX = p.x;
          cropStartY = p.y;
          cropTemp = new Rect({
            left: p.x,
            top: p.y,
            width: 1,
            height: 1,
            fill: "rgba(255,255,255,0.08)",
            stroke: "rgba(255,255,255,0.85)",
            strokeWidth: 2,
            strokeDashArray: [8, 6],
            selectable: false,
            evented: false,
          });
          c.add(cropTemp);
          return;
        }

        startDrawing(p);
      };

      const onMouseMove = (opt: any) => {
        const p = getPointer(opt);
        if (isCropping && cropTemp) {
          const w = p.x - cropStartX;
          const h = p.y - cropStartY;
          cropTemp.set({
            left: Math.min(cropStartX, p.x),
            top: Math.min(cropStartY, p.y),
            width: Math.abs(w),
            height: Math.abs(h),
          });
          c.requestRenderAll();
          return;
        }

        updateDrawing(p);
      };

      const onMouseUp = (opt: any) => {
        if (isCropping) {
          isCropping = false;
          if (!cropTemp) return;
          cropTemp.set({ selectable: true, evented: true });
          c.setActiveObject(cropTemp);
          pushState();
          cropTemp = null;
          return;
        }

        const p = getPointer(opt);
        finishDrawing(p);
      };

      const onObjMod = () => pushState();

      // init state stack
      // attach
      c.on("mouse:down", onMouseDown);
      c.on("mouse:move", onMouseMove);
      c.on("mouse:up", onMouseUp);
      c.on("object:modified", onObjMod);
      c.on("object:removed", onObjMod);

      // resize
      const ro = new ResizeObserver(() => {
        // Keep relative placement by re-fitting bg only (simple)
        const wrap = wrapRef.current;
        if (!wrap) return;
        if (canvasRef.current !== c || !c?.lowerCanvasEl) return;
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        c.setWidth(w);
        c.setHeight(h);

        // refit bg
        const bg2 = bgImgRef.current;
        if (bg2) {
          const sc = Math.min(c.getWidth() / (bg2.width || 1), c.getHeight() / (bg2.height || 1));
          bg2.scale(sc);
          bg2.set({
            left: (c.getWidth() - (bg2.getScaledWidth?.() ?? 0)) / 2,
            top: (c.getHeight() - (bg2.getScaledHeight?.() ?? 0)) / 2,
          });
        }
        c.requestRenderAll();
      });
      if (wrapRef.current) ro.observe(wrapRef.current);

      // keep objects selectable; bg is locked above
      c.selection = true;

      return () => {
        ro.disconnect();
        URL.revokeObjectURL(url);
      };
    } catch (e: any) {
      alertErr("เปิด Editor ไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [open, file, chooseDir, pushState]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    strokeRef.current = stroke;
    applyStyleToActive();
  }, [stroke]);

  useEffect(() => {
    fillRef.current = fill;
    applyStyleToActive();
  }, [fill]);

  useEffect(() => {
    fontSizeRef.current = fontSize;
    applyStyleToActive();
  }, [fontSize]);

  useEffect(() => {
    strokeWRef.current = strokeW;
    applyStyleToActive();
  }, [strokeW, applyStyleToActive]);

  useEffect(() => {
    imgAdjustRef.current = {
      brightness: imgBrightness,
      contrast: imgContrast,
      saturation: imgSaturation,
      shadow: imgShadow,
    };
    if (!open) return;
    applyImageAdjustments();
  }, [imgBrightness, imgContrast, imgSaturation, imgShadow, open, applyImageAdjustments]);

  useEffect(() => {
    if (!open) return;
    setImgBrightness(0);
    setImgContrast(0);
    setImgSaturation(0);
    setImgShadow(0);
  }, [open, file?.name]);

  useEffect(() => {
    if (!open) return;
    // reset stacks per open
    destroyCanvas();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadEditor();
    return () => {
      destroyCanvas();
    };
  }, [open, loadEditor, destroyCanvas]); // intentionally only open/close lifecycle

  // tool change handled via refs (selection always enabled)

  const doRotate90 = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a) return;
    a.rotate(((a.angle || 0) + 90) % 360);
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  const doFlipX = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a) return;
    a.set("flipX", !a.flipX);
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  const doFlipY = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const a = c.getActiveObject();
    if (!a) return;
    a.set("flipY", !a.flipY);
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  const rotateCanvas = useCallback(
    (dir: "cw" | "ccw") => {
      const c = canvasRef.current;
      const fabric = fabricRef.current as any;
      if (!c || !fabric) return;
      const delta = dir === "cw" ? 90 : -90;
      const rad = fabric.util.degreesToRadians(delta);
      const oldW = c.getWidth();
      const oldH = c.getHeight();
      const newW = oldH;
      const newH = oldW;
      const oldCenter = new fabric.Point(oldW / 2, oldH / 2);
      const newCenter = new fabric.Point(newW / 2, newH / 2);

      c.getObjects().forEach((o: any) => {
        const center = o.getCenterPoint();
        const rotated = fabric.util.rotatePoint(center, oldCenter, rad);
        const translated = new fabric.Point(
          rotated.x - oldCenter.x + newCenter.x,
          rotated.y - oldCenter.y + newCenter.y
        );
        o.rotate((o.angle || 0) + delta);
        o.setPositionByOrigin(translated, "center", "center");
      });

      c.setWidth(newW);
      c.setHeight(newH);
      c.calcOffset();
      c.requestRenderAll();
      pushState();
    },
    [pushState]
  );

  const flipCanvas = useCallback(
    (axis: "x" | "y") => {
      const c = canvasRef.current;
      if (!c) return;
      const w = c.getWidth();
      const h = c.getHeight();
      c.getObjects().forEach((o: any) => {
        const ow = o.getScaledWidth?.() ?? o.width ?? 0;
        const oh = o.getScaledHeight?.() ?? o.height ?? 0;
        if (axis === "x") {
          o.set({
            left: w - (o.left ?? 0) - ow,
            flipX: !o.flipX,
          });
        } else {
          o.set({
            top: h - (o.top ?? 0) - oh,
            flipY: !o.flipY,
          });
        }
      });
      c.requestRenderAll();
      pushState();
    },
    [pushState]
  );

  const doDeleteActive = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const activeList = typeof c.getActiveObjects === "function" ? c.getActiveObjects() : [];
    if (!activeList || activeList.length === 0) {
      const a = c.getActiveObject();
      if (!a || a === bgImgRef.current) return;
      c.remove(a);
    } else {
      activeList.forEach((obj: any) => {
        if (obj !== bgImgRef.current) c.remove(obj);
      });
    }
    c.discardActiveObject();
    c.requestRenderAll();
    pushState();
  }, [pushState]);

  const copyActive = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const activeList = typeof c.getActiveObjects === "function" ? c.getActiveObjects() : [];
    const rawList = activeList.length > 0 ? activeList : c.getActiveObject() ? [c.getActiveObject()] : [];
    const list = rawList.filter((obj: any) => obj && obj !== bgImgRef.current);
    if (list.length === 0) return;
    clipboardRef.current = list.map((obj: any) => obj.toObject());
  }, []);

  const pasteActive = useCallback(() => {
    const c = canvasRef.current;
    const data = clipboardRef.current;
    if (!c || !data || data.length === 0) return;
    const fabric = fabricRef.current;
    const util = fabric?.util || fabric?.fabric?.util;
    const ActiveSelection = fabric?.ActiveSelection || fabric?.fabric?.ActiveSelection;
    if (!util?.enlivenObjects) return;
    util
      .enlivenObjects(data)
      .then((enlivened: any[]) => {
        const list = enlivened?.filter(Boolean) || [];
        if (list.length === 0) return;
        const offset = 20;
        list.forEach((obj: any) => {
          obj.set({
            left: (obj.left || 0) + offset,
            top: (obj.top || 0) + offset,
            evented: true,
            selectable: true,
          });
          c.add(obj);
        });
        if (list.length === 1) {
          c.setActiveObject(list[0]);
        } else if (ActiveSelection) {
          const activeSel = new ActiveSelection(list, { canvas: c });
          c.setActiveObject(activeSel);
        }
        c.requestRenderAll();
        pushState();
      })
      .catch(() => { });
  }, [pushState]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const c = canvasRef.current;
      const activeObj = c?.getActiveObject?.();
      if (activeObj?.isEditing) return;
      if (target && target.closest("input, textarea, [contenteditable='true']") && !activeObj) return;
      if (e.key === "Delete") {
        e.preventDefault();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        doDeleteActive();
        return;
      }
      const isCopy = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "c" || e.code === "KeyC");
      const isPaste = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "v" || e.code === "KeyV");
      if (isCopy) {
        e.preventDefault();
        e.stopPropagation();
        copyActive();
        return;
      }
      if (isPaste) {
        e.preventDefault();
        e.stopPropagation();
        pasteActive();
        return;
      }
      if (toolRef.current !== "select") return;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, doDeleteActive, copyActive, pasteActive]);

  const applyCrop = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;

    // find top-most crop rect (dashed stroke)
    const cropRects = c
      .getObjects()
      .filter((o: any) => o?.type === "rect" && Array.isArray(o.strokeDashArray) && o.strokeDashArray.length > 0);

    if (cropRects.length === 0) {
      alertInfo("ยังไม่มีกรอบ Crop", "เลือก Tool: Crop แล้วลากกรอบก่อน");
      return;
    }

    // Use the last one
    const crop = cropRects[cropRects.length - 1];

    try {
      setBusy(true);

      // Rasterize full canvas to image, then crop via native canvas
      const dataUrl = c.toDataURL({ format: "png" });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = dataUrl;
      });

      const cropLeft = Math.max(0, crop.left || 0);
      const cropTop = Math.max(0, crop.top || 0);
      const cropW = Math.max(1, crop.width ? crop.width * (crop.scaleX || 1) : 1);
      const cropH = Math.max(1, crop.height ? crop.height * (crop.scaleY || 1) : 1);

      const oc = document.createElement("canvas");
      oc.width = Math.floor(cropW);
      oc.height = Math.floor(cropH);
      const ctx = oc.getContext("2d")!;
      ctx.drawImage(img, cropLeft, cropTop, cropW, cropH, 0, 0, oc.width, oc.height);

      const blob = await new Promise<Blob>((resolve) => oc.toBlob((b) => resolve(b!), "image/png"));

      // Replace editor canvas with cropped result
      c.clear();
      c.setWidth(oc.width);
      c.setHeight(oc.height);

      const fabric = fabricRef.current;
      const { FabricImage } = fabric as any;

      const croppedImgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = URL.createObjectURL(blob);
      });

      const bg = new FabricImage(croppedImgEl, { selectable: false, evented: false });
      bgImgRef.current = bg;
      bg.scale(1);
      bg.set({ left: 0, top: 0 });
      c.add(bg);
      c.sendObjectToBack(bg);
      applyImageAdjustments();
      c.requestRenderAll();

      alertOk("Crop เรียบร้อย");
    } catch (e: any) {
      alertErr("Crop ไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [pushState, applyImageAdjustments]);

  const onCropButton = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;
    const cropRects = c.getObjects().filter(
      (o: any) => o?.type === "rect" && Array.isArray(o.strokeDashArray) && o.strokeDashArray.length > 0
    );
    if (cropRects.length === 0) {
      setTool("crop");
      alertInfo("โหมด Crop", "ลากกรอบแล้วกดปุ่มนี้ซ้ำเพื่อ Apply");
      return;
    }
    await applyCrop();
  }, [applyCrop]);

  const save = useCallback(async () => {
    if (!file || !chooseDir) return;
    const c = canvasRef.current;
    if (!c) return;

    try {
      setBusy(true);
      const blob = await new Promise<Blob>((resolve, reject) => {
        c
          .toCanvasElement()
          .toBlob(
            (b: Blob | null) => (b ? resolve(b) : reject(new Error("Export canvas failed"))),
            "image/png"
          );
      });

      const fh = await chooseDir.getFileHandle(file.name, { create: true });
      await writeFile(fh, blob);
      await onSaved();
      alertOk("บันทึกทับไฟล์ใน choose แล้ว");
      onClose();
    } catch (e: any) {
      alertErr("บันทึกไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [file, chooseDir, onSaved, onClose]);

  const saveAllAdjust = useCallback(async () => {
    if (!chooseDir) return;
    try {
      setBusy(true);
      const files = (await listFiles(chooseDir)).filter((it) => isImageType(it.type, it.name));
      if (files.length === 0) {
        alertInfo("ไม่มีไฟล์รูปใน choose", "เพิ่มรูปก่อนแล้วค่อยลองใหม่");
        return;
      }

      let savedCount = 0;
      const currentName = file?.name ?? null;
      if (currentName && canvasRef.current) {
        const c = canvasRef.current;
        const blob = await new Promise<Blob>((resolve, reject) => {
          c
            .toCanvasElement()
            .toBlob(
              (b: Blob | null) => (b ? resolve(b) : reject(new Error("Export canvas failed"))),
              "image/png"
            );
        });
        const currentHandle = await chooseDir.getFileHandle(currentName, { create: true });
        await writeFile(currentHandle, blob);
        savedCount += 1;
      }

      const fabric = fabricRef.current ?? (await import("fabric"));
      fabricRef.current = fabric;
      const { Canvas, FabricImage } = fabric as any;

      const batchCanvasEl = document.createElement("canvas");
      const batchCanvas = new Canvas(batchCanvasEl, { selection: false });

      for (const item of files) {
        if (currentName && item.name === currentName) continue;
        const fileHandle = await chooseDir.getFileHandle(item.name);
        const f = await fileHandle.getFile();
        const url = URL.createObjectURL(f);
        try {
          const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = url;
          });

          batchCanvas.clear();
          batchCanvas.setWidth(imgEl.naturalWidth || imgEl.width);
          batchCanvas.setHeight(imgEl.naturalHeight || imgEl.height);

          const bg = new FabricImage(imgEl, { selectable: false, evented: false });
          const filters = buildAdjustFilters(fabric);
          bg.filters = filters;
          bg.applyFilters();
          bg.set({ left: 0, top: 0, scaleX: 1, scaleY: 1 });
          batchCanvas.add(bg);
          batchCanvas.requestRenderAll();

          const blob = await new Promise<Blob>((resolve, reject) => {
            batchCanvas
              .toCanvasElement()
              .toBlob(
                (b: Blob | null) => (b ? resolve(b) : reject(new Error("Export canvas failed"))),
                "image/png"
              );
          });

          await writeFile(fileHandle, blob);
          savedCount += 1;
        } finally {
          URL.revokeObjectURL(url);
        }
      }

      batchCanvas.dispose();
      await onSaved();
      alertOk("บันทึกทุกไฟล์แล้ว", `${savedCount} ไฟล์`);
      onClose();
    } catch (e: any) {
      alertErr("บันทึกทั้งหมดไม่สำเร็จ", e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [chooseDir, onSaved, onClose, buildAdjustFilters, file]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[1400px] h-[88vh] rounded-3xl border border-white/10 bg-slate-950/75 overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.75)] flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white/90 font-semibold truncate">Edit: {file?.name}</div>
            <div className="text-xs text-white/45">Text / Arrow / Shape / Crop / Move / Resize / Rotate / Flip</div>
          </div>
          <div className="flex gap-2">
            <PillButton onClick={saveAllAdjust} disabled={busy}>
              Save Adjust all images in choose
            </PillButton>
            <PillButton onClick={save} disabled={busy}>
              Save
            </PillButton>
            <PillButton tone="danger" onClick={onClose} disabled={busy}>
              Close
            </PillButton>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-[360px_1fr] min-h-0">
          {/* Left toolbar */}
          <div className="border-r border-white/10 p-4 space-y-4 overflow-auto">
            <div className="text-sm text-white/80 font-semibold">Tools</div>

            <div className="grid grid-cols-2 gap-2">
              <PillButton tone={tool === "select" ? "primary" : "ghost"} onClick={() => setTool("select")}>
                Select
              </PillButton>
              <PillButton tone={tool === "text" ? "primary" : "ghost"} onClick={() => setTool("text")}>
                Text
              </PillButton>
              <PillButton tone={tool === "arrow" ? "primary" : "ghost"} onClick={() => setTool("arrow")}>
                Arrow
              </PillButton>
              <PillButton tone={tool === "rect" ? "primary" : "ghost"} onClick={() => setTool("rect")}>
                Rect
              </PillButton>
              <PillButton tone={tool === "circle" ? "primary" : "ghost"} onClick={() => setTool("circle")}>
                Circle
              </PillButton>
              <PillButton tone={tool === "crop" ? "primary" : "ghost"} onClick={onCropButton}>
                Crop
              </PillButton>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
              <div className="text-xs text-white/60">Color / Size</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-white/60">
                  Stroke
                  <input value={stroke} onChange={(e) => setStroke(e.target.value)} type="color" className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-transparent" />
                </label>
                <label className="text-xs text-white/60">
                  Fill
                  <input value={fill} onChange={(e) => setFill(e.target.value)} type="color" className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-transparent" />
                </label>
                <label className="text-xs text-white/60">
                  Font
                  <input
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value) || 40)}
                    type="number"
                    className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white/90 outline-none"
                  />
                </label>
                <label className="text-xs text-white/60">
                  Stroke W
                  <input
                    value={strokeW}
                    onChange={(e) => setStrokeW(Number(e.target.value) || 6)}
                    type="number"
                    className="mt-1 w-full h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-white/90 outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">Adjust Image</div>
                <button
                  type="button"
                  onClick={() => {
                    setImgBrightness(0);
                    setImgContrast(0);
                    setImgSaturation(0);
                    setImgShadow(0);
                  }}
                  className="text-[11px] text-teal-200/70 hover:text-teal-100"
                >
                  Reset
                </button>
              </div>

              <label className="text-xs text-white/60 flex flex-col gap-2">
                Brightness
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={imgBrightness}
                    onChange={(e) => setImgBrightness(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[11px] text-white/45 w-10 text-right">{imgBrightness}</span>
                </div>
              </label>

              <label className="text-xs text-white/60 flex flex-col gap-2">
                Contrast
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={imgContrast}
                    onChange={(e) => setImgContrast(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[11px] text-white/45 w-10 text-right">{imgContrast}</span>
                </div>
              </label>

              <label className="text-xs text-white/60 flex flex-col gap-2">
                Saturation
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={imgSaturation}
                    onChange={(e) => setImgSaturation(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[11px] text-white/45 w-10 text-right">{imgSaturation}</span>
                </div>
              </label>

              <label className="text-xs text-white/60 flex flex-col gap-2">
                Shadow
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={imgShadow}
                    onChange={(e) => setImgShadow(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-[11px] text-white/45 w-10 text-right">{imgShadow}</span>
                </div>
              </label>
              <div className="text-[11px] text-white/45">ปรับแสง/เงาเฉพาะภาพพื้นหลัง (ไม่กระทบวัตถุที่วาด)</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
              <div className="text-xs text-white/60">Actions (Active object)</div>
              <div className="grid grid-cols-2 gap-2">
                <PillButton onClick={doRotate90} disabled={busy}>
                  Rotate 90°
                </PillButton>
                <PillButton onClick={doFlipX} disabled={busy}>
                  Flip X
                </PillButton>
                <PillButton onClick={doFlipY} disabled={busy}>
                  Flip Y
                </PillButton>
                <PillButton tone="danger" onClick={doDeleteActive} disabled={busy}>
                  Delete
                </PillButton>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
              <div className="text-xs text-white/60">Canvas</div>
              <div className="grid grid-cols-2 gap-2">
                <PillButton onClick={() => rotateCanvas("ccw")} disabled={busy}>
                  Rotate -90°
                </PillButton>
                <PillButton onClick={() => rotateCanvas("cw")} disabled={busy}>
                  Rotate +90°
                </PillButton>
                <PillButton onClick={() => flipCanvas("x")} disabled={busy}>
                  Flip Horizontal
                </PillButton>
                <PillButton onClick={() => flipCanvas("y")} disabled={busy}>
                  Flip Vertical
                </PillButton>
              </div>
              <div className="text-[11px] text-white/45">หมุน/กลับด้านทั้งภาพรวมวัตถุที่วางไว้</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
              <div className="text-xs text-white/60">Crop</div>
              <PillButton onClick={onCropButton} disabled={busy}>
                Crop (ลาก/ปรับกรอบ แล้วกดซ้ำเพื่อ Apply)
              </PillButton>
              <div className="text-[11px] text-white/45">
                ถ้ายังไม่มีกรอบจะสลับเป็นโหมด Crop ให้ลากกรอบก่อน กดอีกครั้งจะ Apply
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="p-4 min-h-0">
            <div ref={wrapRef} className="w-full h-full rounded-3xl border border-white/10 bg-black/40 overflow-hidden">
              <canvas ref={hostRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
