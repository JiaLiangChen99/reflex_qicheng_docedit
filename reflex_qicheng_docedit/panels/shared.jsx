/** Shared UI helpers for Feishu-style panels */
import React, { useEffect, useRef, useState } from "react";

export function Chip({ title, active, disabled, onClick, children, style }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`rq-docedit-btn${active ? " is-on" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        height: 28,
        minWidth: 28,
        padding: "0 8px",
        fontSize: 13,
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Normalize href; empty string means clear. Optionally restore selection first. */
export function applyLink(editor, raw, range) {
  const url = String(raw || "").trim();
  let chain = editor.chain().focus();
  if (range && typeof range.from === "number" && typeof range.to === "number") {
    chain = chain.setTextSelection({ from: range.from, to: range.to });
  }
  if (!url) {
    chain.extendMarkRange("link").unsetLink().run();
    return;
  }
  let href = url;
  if (
    !/^[a-z][a-z0-9+.-]*:/i.test(href) &&
    !href.startsWith("/") &&
    !href.startsWith("#")
  ) {
    href = `https://${href}`;
  }
  chain
    .extendMarkRange("link")
    .setLink({ href, target: "_blank" })
    .run();
}

let _openLink = null;

/** Register the Feishu-style link popover opener (from DocEdit). */
export function registerLinkOpener(fn) {
  _openLink = fn;
  return () => {
    if (_openLink === fn) _openLink = null;
  };
}

/** Open link UI near the current selection (preferred) or caret. */
export function askLink(editor) {
  if (_openLink) {
    _openLink(editor);
    return;
  }
  // Fallback if host not mounted
  const prev = editor.getAttributes("link").href || "";
  const url = window.prompt("链接 URL（留空清除）", prev);
  if (url === null) return;
  applyLink(editor, url);
}

/**
 * Feishu-style link input: [粘贴或输入链接] [确认]
 * Placed under the selection so it does not cover the text.
 */
export function LinkPopover({ editor, rect, from, to, onClose }) {
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const [url, setUrl] = useState(
    () => editor?.getAttributes?.("link")?.href || "",
  );

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      onClose?.();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!editor || !rect) return null;

  const panelW = 320;
  let left = Math.round(rect.left);
  left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
  const gap = 8;
  const estimatedH = 44;
  let top = rect.bottom + gap;
  if (top + estimatedH > window.innerHeight - 8 && rect.top > estimatedH + gap) {
    top = rect.top - estimatedH - gap;
  }

  const confirm = () => {
    applyLink(editor, url, { from, to });
    onClose?.();
  };

  return (
    <div
      ref={rootRef}
      className="rq-docedit-float rq-docedit-link-popover"
      style={{
        top: Math.round(top),
        left,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        width: panelW,
        boxSizing: "border-box",
      }}
      onMouseDown={(e) => {
        // Keep editor selection while interacting with the popover.
        if (e.target !== inputRef.current) e.preventDefault();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="url"
        value={url}
        placeholder="粘贴或输入链接"
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirm();
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          height: 32,
          padding: "0 10px",
          border: "1px solid #1456f0",
          borderRadius: 6,
          outline: "none",
          fontSize: 13,
          color: "#1f2329",
          background: "#fff",
          boxShadow: "0 0 0 2px rgba(20,86,240,0.12)",
        }}
      />
      <button
        type="button"
        className="rq-docedit-btn"
        onClick={confirm}
        style={{
          height: 32,
          padding: "0 14px",
          borderRadius: 6,
          background: "#8f959e",
          color: "#fff",
          fontSize: 13,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        确认
      </button>
    </div>
  );
}

export function askImage(editor) {
  // Prefer local file / clipboard workflow; URL remains a fallback.
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (file) {
      await insertImageFromFile(editor, file);
      return;
    }
  };
  input.click();
}

/** Read a File/Blob as a data URL (base64). */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Insert an image from a File. Default: store as base64 data URL in the doc.
 * Optional onInserted(src, mime) lets the host upload and later rewrite the src.
 */
export async function insertImageFromFile(editor, file, onInserted) {
  if (!editor || !file || !String(file.type || "").startsWith("image/")) {
    return false;
  }
  const src = await fileToDataUrl(file);
  if (!src) return false;
  editor
    .chain()
    .focus()
    .setImage({ src, alt: file.name || "image" })
    .run();
  onInserted?.(src, file.type || "image/*");
  return true;
}

/** Pick first image File from a DataTransfer / clipboard items list. */
export function pickImageFileFromDataTransfer(dt) {
  if (!dt) return null;
  if (dt.files?.length) {
    for (const f of dt.files) {
      if (String(f.type || "").startsWith("image/")) return f;
    }
  }
  const items = dt.items;
  if (items) {
    for (const item of items) {
      if (item.kind === "file" && String(item.type || "").startsWith("image/")) {
        return item.getAsFile();
      }
    }
  }
  return null;
}

export function askVideo(editor) {
  const url = window.prompt("视频 URL（mp4 / 可播放地址）", "");
  if (!url) return;
  editor
    .chain()
    .focus()
    .insertContent(
      `<div data-video="true"><video controls src="${url}" style="max-width:100%;border-radius:8px"></video></div><p></p>`,
    )
    .run();
}

export const TEXT_COLORS = [
  { label: "默认", value: null },
  { label: "灰", value: "#8f959e" },
  { label: "红", value: "#f54a45" },
  { label: "橙", value: "#ff8800" },
  { label: "绿", value: "#34c724" },
  { label: "蓝", value: "#1456f0" },
  { label: "紫", value: "#7c3aed" },
];

/** Feishu font colors (A swatches) */
export const FONT_COLORS = [
  { label: "默认黑", value: null, swatch: "#1f2329" },
  { label: "灰", value: "#8f959e", swatch: "#8f959e" },
  { label: "红", value: "#f54a45", swatch: "#f54a45" },
  { label: "橙", value: "#ff8800", swatch: "#ff8800" },
  { label: "金", value: "#f5c00a", swatch: "#f5c00a" },
  { label: "绿", value: "#34c724", swatch: "#34c724" },
  { label: "蓝", value: "#1456f0", swatch: "#1456f0" },
  { label: "紫", value: "#7c3aed", swatch: "#7c3aed" },
];

/** Feishu background / highlight colors */
export const BG_COLORS = [
  { label: "无", value: null },
  { label: "浅灰", value: "#f2f3f5" },
  { label: "浅粉", value: "#fde2e2" },
  { label: "浅橙", value: "#fdebd6" },
  { label: "浅黄", value: "#fef08a" },
  { label: "浅绿", value: "#d9f5d6" },
  { label: "浅蓝", value: "#e0edff" },
  { label: "浅紫", value: "#efe6fd" },
  { label: "灰", value: "#dee0e3" },
  { label: "红", value: "#fdcdc5" },
  { label: "橙", value: "#ffe1c2" },
  { label: "黄", value: "#fde047" },
  { label: "绿", value: "#bbf7d0" },
  { label: "蓝", value: "#bfdbfe" },
  { label: "紫", value: "#e9d5ff" },
];

export function canIndent(editor) {
  return (
    editor.can().sinkListItem("listItem") ||
    editor.can().sinkListItem("taskItem")
  );
}

export function canOutdent(editor) {
  return (
    editor.can().liftListItem("listItem") ||
    editor.can().liftListItem("taskItem")
  );
}

export function indentIn(editor) {
  if (editor.can().sinkListItem("taskItem")) {
    editor.chain().focus().sinkListItem("taskItem").run();
    return;
  }
  if (editor.can().sinkListItem("listItem")) {
    editor.chain().focus().sinkListItem("listItem").run();
  }
}

export function indentOut(editor) {
  if (editor.can().liftListItem("taskItem")) {
    editor.chain().focus().liftListItem("taskItem").run();
    return;
  }
  if (editor.can().liftListItem("listItem")) {
    editor.chain().focus().liftListItem("listItem").run();
  }
}

export function MenuItem({ label, active, onClick, muted, icon }) {
  return (
    <button
      type="button"
      className="rq-docedit-btn"
      disabled={muted}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        color: muted ? "#bbbfc4" : active ? "#1456f0" : "#1f2329",
        background: active ? "#f5f6f7" : "transparent",
      }}
    >
      {icon ? (
        <span style={{ width: 18, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      ) : null}
      <span style={{ flex: 1 }}>{label}</span>
      {active ? <span style={{ color: "#1456f0" }}>✓</span> : null}
    </button>
  );
}

/** Align + indent flyout (Feishu). side: "right" | "left" */
export function AlignSubmenu({ editor, side = "right", style }) {
  const pos =
    side === "left"
      ? { right: "calc(100% + 6px)", left: "auto" }
      : { left: "calc(100% + 6px)", right: "auto" };
  return (
    <div
      className="rq-docedit-float"
      style={{
        position: "absolute",
        top: 0,
        zIndex: 60,
        minWidth: 180,
        padding: 4,
        ...pos,
        ...style,
      }}
    >
      <MenuItem
        label="左对齐"
        icon="☰"
        active={
          editor.isActive({ textAlign: "left" }) ||
          (!editor.isActive({ textAlign: "center" }) &&
            !editor.isActive({ textAlign: "right" }))
        }
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      />
      <MenuItem
        label="居中对齐"
        icon="≡"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      />
      <MenuItem
        label="右对齐"
        icon="☰"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      />
      <div style={{ height: 1, background: "#e5e6eb", margin: "4px 0" }} />
      <MenuItem
        label="增加缩进"
        icon="→|"
        muted={!canIndent(editor)}
        onClick={() => {
          if (canIndent(editor)) indentIn(editor);
        }}
      />
      <MenuItem
        label="减少缩进"
        icon="|←"
        muted={!canOutdent(editor)}
        onClick={() => {
          if (canOutdent(editor)) indentOut(editor);
        }}
      />
    </div>
  );
}

/** Color flyout: font + background + restore (Feishu) */
export function ColorSubmenu({ editor, side = "right", style }) {
  const pos =
    side === "left"
      ? { right: "calc(100% + 6px)", left: "auto" }
      : { left: "calc(100% + 6px)", right: "auto" };
  return (
    <div
      className="rq-docedit-float"
      style={{
        position: "absolute",
        top: 0,
        zIndex: 60,
        minWidth: 260,
        padding: 10,
        ...pos,
        ...style,
      }}
    >
      <div style={{ fontSize: 12, color: "#8f959e", marginBottom: 8 }}>字体颜色</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {FONT_COLORS.map((c) => {
          const active = c.value
            ? editor.isActive("textStyle", { color: c.value })
            : !editor.getAttributes("textStyle")?.color;
          return (
            <button
              key={c.label}
              type="button"
              title={c.label}
              className="rq-docedit-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (c.value) editor.chain().focus().setColor(c.value).run();
                else editor.chain().focus().unsetColor().run();
              }}
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
      <div style={{ fontSize: 12, color: "#8f959e", marginBottom: 8 }}>背景颜色</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {BG_COLORS.map((c) => {
          const active = c.value
            ? editor.isActive("highlight", { color: c.value })
            : !editor.isActive("highlight");
          return (
            <button
              key={c.label}
              type="button"
              title={c.label}
              className="rq-docedit-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (c.value) {
                  editor.chain().focus().toggleHighlight({ color: c.value }).run();
                } else {
                  editor.chain().focus().unsetHighlight().run();
                }
              }}
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
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          editor.chain().focus().unsetColor().unsetHighlight().run();
        }}
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
