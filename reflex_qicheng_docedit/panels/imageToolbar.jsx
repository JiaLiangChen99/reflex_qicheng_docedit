/**
 * Feishu-style image toolbar: crop / caption / align
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { isImageNodeSelection } from "./imageExt.jsx";

function IconBtn({ title, active, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      className={`rq-docedit-btn${active ? " is-on" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        height: 30,
        minWidth: 30,
        padding: "0 6px",
        fontSize: 13,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        height: 18,
        background: "#e5e6eb",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );
}

function AlignIcon({ kind }) {
  const lines =
    kind === "left"
      ? ["0", "0", "0"]
      : kind === "right"
        ? ["6", "6", "6"]
        : ["3", "3", "3"];
  const widths = kind === "center" ? [14, 10, 14] : [14, 10, 12];
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden>
      {lines.map((x, i) => (
        <rect
          key={i}
          x={x}
          y={1 + i * 4.5}
          width={widths[i]}
          height="2"
          rx="1"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/** Simple free-form crop overlay */
function CropModal({ src, onConfirm, onCancel }) {
  const imgRef = useRef(null);
  const stageRef = useRef(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [disp, setDisp] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState(null); // {x,y,w,h} in display px
  const drag = useRef(null);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const maxW = Math.min(640, window.innerWidth - 80);
    const maxH = Math.min(420, window.innerHeight - 160);
    const scale = Math.min(maxW / nw, maxH / nh, 1);
    const dw = Math.round(nw * scale);
    const dh = Math.round(nh * scale);
    setNatural({ w: nw, h: nh });
    setDisp({ w: dw, h: dh });
    const pad = 0.1;
    setCrop({
      x: Math.round(dw * pad),
      y: Math.round(dh * pad),
      w: Math.round(dw * (1 - pad * 2)),
      h: Math.round(dh * (1 - pad * 2)),
    });
  };

  const clampCrop = (c) => {
    const w = disp.w;
    const h = disp.h;
    let x = Math.max(0, Math.min(c.x, w - 20));
    let y = Math.max(0, Math.min(c.y, h - 20));
    let cw = Math.max(20, Math.min(c.w, w - x));
    let ch = Math.max(20, Math.min(c.h, h - y));
    return { x, y, w: cw, h: ch };
  };

  const onPointerDown = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const start = crop;
    drag.current = {
      mode,
      sx: e.clientX,
      sy: e.clientY,
      start,
    };
    const onMove = (ev) => {
      if (!drag.current) return;
      const dx = ev.clientX - drag.current.sx;
      const dy = ev.clientY - drag.current.sy;
      const s = drag.current.start;
      let next = { ...s };
      if (mode === "move") {
        next = { ...s, x: s.x + dx, y: s.y + dy };
      } else if (mode === "br") {
        next = { ...s, w: s.w + dx, h: s.h + dy };
      } else if (mode === "tl") {
        next = { x: s.x + dx, y: s.y + dy, w: s.w - dx, h: s.h - dy };
      } else if (mode === "tr") {
        next = { ...s, y: s.y + dy, w: s.w + dx, h: s.h - dy };
      } else if (mode === "bl") {
        next = { ...s, x: s.x + dx, w: s.w - dx, h: s.h + dy };
      }
      setCrop(clampCrop(next));
    };
    const onUp = () => {
      drag.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const confirm = () => {
    if (!crop || !natural.w) return;
    const scaleX = natural.w / disp.w;
    const scaleY = natural.h / disp.h;
    const sx = Math.round(crop.x * scaleX);
    const sy = Math.round(crop.y * scaleY);
    const sw = Math.round(crop.w * scaleX);
    const sh = Math.round(crop.h * scaleY);
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    const img = imgRef.current;
    if (!ctx || !img) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const out = canvas.toDataURL("image/png");
    onConfirm?.(out, sw, sh);
  };

  return (
    <div
      className="rq-docedit-crop-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(31,35,41,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className="rq-docedit-float"
        style={{
          position: "relative",
          top: "auto",
          left: "auto",
          padding: 16,
          maxWidth: "min(720px, 100%)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          裁剪图片
        </div>
        <div
          ref={stageRef}
          style={{
            position: "relative",
            width: disp.w || "auto",
            height: disp.h || "auto",
            margin: "0 auto",
            userSelect: "none",
            background: "#f5f6f7",
          }}
        >
          <img
            ref={imgRef}
            src={src}
            alt="crop"
            onLoad={onImgLoad}
            draggable={false}
            style={{
              width: disp.w || "auto",
              height: disp.h || "auto",
              display: "block",
              maxWidth: "100%",
            }}
          />
          {crop && disp.w ? (
            <>
              {/* dim outside crop */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: crop.y,
                  background: "rgba(0,0,0,0.45)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: crop.y + crop.h,
                  width: "100%",
                  height: Math.max(0, disp.h - crop.y - crop.h),
                  background: "rgba(0,0,0,0.45)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: crop.y,
                  width: crop.x,
                  height: crop.h,
                  background: "rgba(0,0,0,0.45)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: crop.x + crop.w,
                  top: crop.y,
                  width: Math.max(0, disp.w - crop.x - crop.w),
                  height: crop.h,
                  background: "rgba(0,0,0,0.45)",
                  pointerEvents: "none",
                }}
              />
              <div
                onPointerDown={(e) => onPointerDown(e, "move")}
                style={{
                  position: "absolute",
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h,
                  border: "2px solid #1456f0",
                  boxSizing: "border-box",
                  cursor: "move",
                }}
              >
                {["tl", "tr", "bl", "br"].map((m) => {
                  const pos =
                    m === "tl"
                      ? { left: -5, top: -5, cursor: "nwse-resize" }
                      : m === "tr"
                        ? { right: -5, top: -5, cursor: "nesw-resize" }
                        : m === "bl"
                          ? { left: -5, bottom: -5, cursor: "nesw-resize" }
                          : { right: -5, bottom: -5, cursor: "nwse-resize" };
                  return (
                    <span
                      key={m}
                      onPointerDown={(e) => onPointerDown(e, m)}
                      style={{
                        position: "absolute",
                        width: 10,
                        height: 10,
                        background: "#fff",
                        border: "2px solid #1456f0",
                        boxSizing: "border-box",
                        ...pos,
                      }}
                    />
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            className="rq-docedit-btn"
            onClick={onCancel}
            style={{
              height: 32,
              padding: "0 14px",
              border: "1px solid #e5e6eb",
              borderRadius: 6,
            }}
          >
            取消
          </button>
          <button
            type="button"
            className="rq-docedit-btn"
            onClick={confirm}
            style={{
              height: 32,
              padding: "0 14px",
              borderRadius: 6,
              background: "#1456f0",
              color: "#fff",
            }}
          >
            确认裁剪
          </button>
        </div>
      </div>
    </div>
  );
}

function CaptionPopover({ value, onSave, onClose, anchor }) {
  const [text, setText] = useState(value || "");
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="rq-docedit-float"
      style={{
        top: anchor.top,
        left: anchor.left,
        width: 280,
        padding: 10,
        zIndex: 60,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
      onMouseDown={(e) => {
        if (e.target !== inputRef.current) e.preventDefault();
      }}
    >
      <input
        ref={inputRef}
        value={text}
        placeholder="添加图片描述"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSave?.(text.trim());
          }
          if (e.key === "Escape") onClose?.();
        }}
        style={{
          flex: 1,
          height: 32,
          padding: "0 10px",
          border: "1px solid #1456f0",
          borderRadius: 6,
          outline: "none",
          fontSize: 13,
        }}
      />
      <button
        type="button"
        className="rq-docedit-btn"
        onClick={() => onSave?.(text.trim())}
        style={{
          height: 32,
          padding: "0 12px",
          background: "#8f959e",
          color: "#fff",
          borderRadius: 6,
          fontSize: 13,
        }}
      >
        确认
      </button>
    </div>
  );
}

/**
 * @param {{ editor: any, box: { top: number, left: number, midX: number, bottom: number } | null }} props
 */
export function ImageToolbar({ editor, box }) {
  const barRef = useRef(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [place, setPlace] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!box || !barRef.current) return;
    const w = barRef.current.offsetWidth || 260;
    const h = barRef.current.offsetHeight || 36;
    let left = Math.round(box.midX - w / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = box.top - h - 10;
    if (top < 8) top = box.bottom + 10;
    setPlace({ top: Math.round(top), left });
  }, [box]);

  const attrs = editor?.getAttributes?.("image") || {};
  const align = attrs.align || "center";

  const setAlign = useCallback(
    (a) => {
      const pos = editor.state.selection.from;
      editor
        .chain()
        .focus()
        .updateAttributes("image", { align: a })
        .setNodeSelection(pos)
        .run();
    },
    [editor],
  );

  const applyCrop = useCallback(
    (src, width, height) => {
      editor
        .chain()
        .focus()
        .updateAttributes("image", { src, width, height })
        .run();
      setCropOpen(false);
    },
    [editor],
  );

  const saveCaption = useCallback(
    (text) => {
      editor
        .chain()
        .focus()
        .updateAttributes("image", { caption: text || null })
        .run();
      setCaptionOpen(false);
    },
    [editor],
  );

  if (!editor || !box || !isImageNodeSelection(editor)) return null;

  return (
    <>
      <div
        ref={barRef}
        className="rq-docedit-float rq-docedit-image-bar"
        style={{
          top: place.top,
          left: place.left,
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "4px 6px",
          zIndex: 55,
        }}
      >
        <IconBtn title="裁剪" onClick={() => setCropOpen(true)}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>⛶</span>
        </IconBtn>
        <IconBtn
          title="添加描述"
          active={!!attrs.caption}
          onClick={() => setCaptionOpen((v) => !v)}
        >
          <span style={{ fontSize: 13 }}>描述</span>
        </IconBtn>
        <Sep />
        <IconBtn
          title="左对齐"
          active={align === "left"}
          onClick={() => setAlign("left")}
        >
          <AlignIcon kind="left" />
        </IconBtn>
        <IconBtn
          title="居中"
          active={align === "center"}
          onClick={() => setAlign("center")}
        >
          <AlignIcon kind="center" />
        </IconBtn>
        <IconBtn
          title="右对齐"
          active={align === "right"}
          onClick={() => setAlign("right")}
        >
          <AlignIcon kind="right" />
        </IconBtn>
      </div>

      {captionOpen ? (
        <CaptionPopover
          value={attrs.caption || ""}
          anchor={{ top: place.top + 40, left: place.left }}
          onSave={saveCaption}
          onClose={() => setCaptionOpen(false)}
        />
      ) : null}

      {cropOpen ? (
        <CropModal
          src={attrs.src}
          onConfirm={applyCrop}
          onCancel={() => setCropOpen(false)}
        />
      ) : null}
    </>
  );
}

/** Track selected image node screen box */
export function useImageBox(editor) {
  const [box, setBox] = useState(null);
  useEffect(() => {
    if (!editor) return undefined;
    const sync = () => {
      if (!isImageNodeSelection(editor)) {
        setBox(null);
        return;
      }
      try {
        const { from } = editor.state.selection;
        let dom = editor.view.nodeDOM(from);
        // Prefer the outer image block for toolbar anchoring.
        if (dom?.closest) {
          const block = dom.closest("[data-image-block]");
          if (block) dom = block;
        }
        if (!dom?.getBoundingClientRect) {
          const found = editor.view.dom.querySelector(
            "[data-image-block].ProseMirror-selectednode",
          );
          if (found) dom = found;
        }
        if (dom?.getBoundingClientRect) {
          const r = dom.getBoundingClientRect();
          setBox({
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            right: r.right,
            midX: (r.left + r.right) / 2,
          });
          return;
        }
        const c = editor.view.coordsAtPos(from);
        setBox({
          top: c.top,
          bottom: c.bottom,
          left: c.left,
          right: c.right,
          midX: c.left,
        });
      } catch {
        setBox(null);
      }
    };
    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    sync();
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("transaction", sync);
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [editor]);
  return box;
}
