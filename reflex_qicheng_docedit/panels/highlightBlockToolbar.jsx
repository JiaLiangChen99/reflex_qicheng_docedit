/**
 * 高亮块浮动工具栏：字体色 / 边框色 / 填充色（飞书风格）
 */
import React, { useEffect, useRef, useState } from "react";
import { FONT_COLORS, BG_COLORS } from "./shared.jsx";
import {
  HIGHLIGHT_DEFAULTS,
  isInHighlightBlock,
  getHighlightBlockRect,
} from "./highlightBlockExt.jsx";

const BORDER_COLORS = [
  { label: "无", value: "transparent" },
  { label: "灰", value: "#8f959e" },
  { label: "红", value: "#f54a45" },
  { label: "橙", value: "#ff8800" },
  { label: "黄", value: "#f5c00a" },
  { label: "绿", value: "#34c724" },
  { label: "蓝", value: "#1456f0" },
  { label: "紫", value: "#7c3aed" },
];

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
        padding: "0 8px",
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

function ColorPanel({ editor, onClose, anchor }) {
  const rootRef = useRef(null);
  const attrs = editor.getAttributes("highlightBlock") || {};

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      onClose?.();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const patch = (next) => {
    editor.chain().focus().updateAttributes("highlightBlock", next).run();
  };

  return (
    <div
      ref={rootRef}
      className="rq-docedit-float"
      style={{
        position: "fixed",
        top: anchor.top,
        left: anchor.left,
        zIndex: 60,
        width: 280,
        padding: 12,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div style={{ fontSize: 12, color: "#8f959e", marginBottom: 8 }}>字体颜色</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {FONT_COLORS.map((c) => {
          const active = c.value
            ? attrs.textColor === c.value
            : !attrs.textColor;
          return (
            <button
              key={c.label}
              type="button"
              title={c.label}
              className="rq-docedit-btn"
              onClick={() => patch({ textColor: c.value })}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: active ? "2px solid #1456f0" : "1px solid #dee0e3",
                background: "#fff",
                color: c.swatch,
                fontWeight: 700,
                fontSize: 13,
                padding: 0,
              }}
            >
              A
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: "#8f959e", marginBottom: 8 }}>边框颜色</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {BORDER_COLORS.map((c) => {
          const active = attrs.borderColor === c.value;
          return (
            <button
              key={c.label}
              type="button"
              title={c.label}
              className="rq-docedit-btn"
              onClick={() => patch({ borderColor: c.value })}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                border: active ? "2px solid #1456f0" : "1px solid #dee0e3",
                background: c.value === "transparent" ? "#fff" : c.value,
                padding: 0,
                position: "relative",
              }}
            >
              {c.value === "transparent" ? (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top right, transparent 46%, #f54a45 48%, #f54a45 52%, transparent 54%)",
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: "#8f959e", marginBottom: 8 }}>填充颜色</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {BG_COLORS.map((c) => {
          const active = c.value
            ? attrs.fillColor === c.value
            : attrs.fillColor === "transparent";
          return (
            <button
              key={c.label}
              type="button"
              title={c.label}
              className="rq-docedit-btn"
              onClick={() =>
                patch({ fillColor: c.value || "transparent" })
              }
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                border: active ? "2px solid #1456f0" : "1px solid #dee0e3",
                background: c.value || "#fff",
                padding: 0,
                position: "relative",
              }}
            >
              {!c.value ? (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top right, transparent 46%, #f54a45 48%, #f54a45 52%, transparent 54%)",
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="rq-docedit-btn"
        onClick={() => patch({ ...HIGHLIGHT_DEFAULTS })}
        style={{
          width: "100%",
          padding: "8px",
          fontSize: 13,
          border: "1px solid #e5e6eb",
          borderRadius: 8,
          color: "#646a73",
        }}
      >
        恢复默认
      </button>
    </div>
  );
}

export function useHighlightBox(editor) {
  const [box, setBox] = useState(null);
  useEffect(() => {
    if (!editor) return undefined;
    const sync = () => setBox(getHighlightBlockRect(editor));
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

export function HighlightBlockToolbar({ editor, box }) {
  const barRef = useRef(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [place, setPlace] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!box || !barRef.current) return;
    const w = barRef.current.offsetWidth || 48;
    const h = barRef.current.offsetHeight || 36;
    let left = Math.round(box.midX - w / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = box.top - h - 10;
    if (top < 8) top = box.bottom + 10;
    setPlace({ top: Math.round(top), left });
  }, [box, colorOpen]);

  if (!editor || !box || !isInHighlightBlock(editor)) return null;

  const panelTop = place.top + 40;
  const panelLeft = Math.min(place.left, window.innerWidth - 296);

  return (
    <>
      <div
        ref={barRef}
        className="rq-docedit-float rq-docedit-highlight-bar"
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
        <IconBtn
          title="颜色"
          active={colorOpen}
          onClick={() => setColorOpen((v) => !v)}
        >
          <span style={{ fontSize: 15 }}>🎨</span>
        </IconBtn>
      </div>

      {colorOpen ? (
        <ColorPanel
          editor={editor}
          anchor={{ top: panelTop, left: panelLeft }}
          onClose={() => setColorOpen(false)}
        />
      ) : null}
    </>
  );
}
