/**
 * 飞书表格风格：选区浮动工具栏
 * - 定位在选区上方（空间不够则放到下方），避免挡住当前文字
 * - 下拉/颜色面板优先朝远离选区的方向展开
 */
import React, { useEffect, useRef, useState } from "react";
import { askLink } from "./shared.jsx";

function indentIn(editor) {
  if (editor.can().sinkListItem("taskItem")) {
    editor.chain().focus().sinkListItem("taskItem").run();
    return;
  }
  if (editor.can().sinkListItem("listItem")) {
    editor.chain().focus().sinkListItem("listItem").run();
  }
}

function indentOut(editor) {
  if (editor.can().liftListItem("taskItem")) {
    editor.chain().focus().liftListItem("taskItem").run();
    return;
  }
  if (editor.can().liftListItem("listItem")) {
    editor.chain().focus().liftListItem("listItem").run();
  }
}

const FONT_COLORS = [
  { label: "默认黑", value: null, swatch: "#1f2329" },
  { label: "灰", value: "#8f959e", swatch: "#8f959e" },
  { label: "红", value: "#f54a45", swatch: "#f54a45" },
  { label: "橙", value: "#ff8800", swatch: "#ff8800" },
  { label: "金", value: "#f5c00a", swatch: "#f5c00a" },
  { label: "绿", value: "#34c724", swatch: "#34c724" },
  { label: "蓝", value: "#1456f0", swatch: "#1456f0" },
  { label: "紫", value: "#7c3aed", swatch: "#7c3aed" },
];

const BG_COLORS = [
  { label: "无", value: null },
  { label: "浅灰", value: "#f2f3f5" },
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

function IconBtn({ title, active, disabled, onClick, children, style }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`rq-docedit-btn${active ? " is-on" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        height: 30,
        minWidth: 30,
        padding: "0 6px",
        fontSize: 13,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        ...style,
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

function MenuItem({ label, active, onClick, muted }) {
  return (
    <button
      type="button"
      className="rq-docedit-btn"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 13,
        color: muted ? "#bbbfc4" : "#1f2329",
        background: active ? "#f5f6f7" : "transparent",
      }}
    >
      <span>{label}</span>
      {active ? <span style={{ color: "#1456f0" }}>✓</span> : null}
    </button>
  );
}

function currentBlockLabel(editor) {
  if (editor.isActive("heading", { level: 1 })) return "H1";
  if (editor.isActive("heading", { level: 2 })) return "H2";
  if (editor.isActive("heading", { level: 3 })) return "H3";
  if (editor.isActive("bulletList")) return "•";
  if (editor.isActive("orderedList")) return "1.";
  if (editor.isActive("taskList")) return "☑";
  if (editor.isActive("codeBlock")) return "{}";
  if (editor.isActive("blockquote")) return "“";
  return "T";
}

function canIndent(editor) {
  return (
    editor.can().sinkListItem("listItem") ||
    editor.can().sinkListItem("taskItem")
  );
}

function canOutdent(editor) {
  return (
    editor.can().liftListItem("listItem") ||
    editor.can().liftListItem("taskItem")
  );
}

/**
 * @param {{ editor: any, rect: { top: number, bottom: number, left: number, right: number, midX: number } | null, onOpenLink?: () => void }} props
 */
export function SelectionFormatBar({ editor, rect, onOpenLink }) {
  const barRef = useRef(null);
  const [open, setOpen] = useState(null); // style | align | color | null
  const [place, setPlace] = useState({ top: 0, left: 0, dropUp: true });

  useEffect(() => {
    if (!rect || !barRef.current) return;
    const barH = barRef.current.offsetHeight || 36;
    const barW = barRef.current.offsetWidth || 360;
    const gap = 10;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Prefer above selection so the bar itself doesn't cover text.
    let top;
    let dropUp;
    if (spaceAbove >= barH + gap + 8) {
      top = rect.top - barH - gap;
      dropUp = true; // popovers grow upward, away from selection
    } else if (spaceBelow >= barH + gap + 8) {
      top = rect.bottom + gap;
      dropUp = false;
    } else {
      // cramped: still prefer above, clamp into viewport
      top = Math.max(8, rect.top - barH - gap);
      dropUp = true;
    }

    let left = Math.round(rect.midX - barW / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - barW - 8));
    setPlace({ top: Math.round(top), left, dropUp });
  }, [rect, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (barRef.current?.contains(e.target)) return;
      setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!editor || !rect) return null;

  const popStyle = {
    position: "absolute",
    left: 0,
    zIndex: 2,
    minWidth: 200,
    background: "#fff",
    border: "1px solid #e5e6eb",
    borderRadius: 10,
    boxShadow: "0 10px 28px rgba(31,35,41,0.14)",
    padding: 4,
    ...(place.dropUp
      ? { bottom: "calc(100% + 6px)" }
      : { top: "calc(100% + 6px)" }),
  };

  const toggle = (key) => setOpen((v) => (v === key ? null : key));

  return (
    <div
      ref={barRef}
      className="rq-docedit-float rq-docedit-selection-bar"
      style={{
        top: place.top,
        left: place.left,
        display: "flex",
        alignItems: "center",
        gap: 1,
        padding: "4px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {/* 样式 T */}
      <div style={{ position: "relative" }}>
        <IconBtn
          title="文本样式"
          active={open === "style"}
          onClick={() => toggle("style")}
        >
          <span style={{ fontWeight: 700 }}>{currentBlockLabel(editor)}</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
        </IconBtn>
        {open === "style" ? (
          <div style={{ ...popStyle, minWidth: 220 }}>
            <MenuItem
              label="正文"
              active={
                editor.isActive("paragraph") &&
                !editor.isActive("heading") &&
                !editor.isActive("bulletList") &&
                !editor.isActive("orderedList") &&
                !editor.isActive("taskList") &&
                !editor.isActive("codeBlock") &&
                !editor.isActive("blockquote")
              }
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                setOpen(null);
              }}
            />
            <MenuItem
              label="一级标题"
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                setOpen(null);
              }}
            />
            <MenuItem
              label="二级标题"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                setOpen(null);
              }}
            />
            <MenuItem
              label="三级标题"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                setOpen(null);
              }}
            />
            <div style={{ height: 1, background: "#e5e6eb", margin: "4px 0" }} />
            <MenuItem
              label="有序列表"
              active={editor.isActive("orderedList")}
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run();
                setOpen(null);
              }}
            />
            <MenuItem
              label="无序列表"
              active={editor.isActive("bulletList")}
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
                setOpen(null);
              }}
            />
            <MenuItem
              label="任务"
              active={editor.isActive("taskList")}
              onClick={() => {
                editor.chain().focus().toggleTaskList().run();
                setOpen(null);
              }}
            />
            <MenuItem
              label="代码块"
              active={editor.isActive("codeBlock")}
              onClick={() => {
                editor.chain().focus().toggleCodeBlock().run();
                setOpen(null);
              }}
            />
            <div style={{ height: 1, background: "#e5e6eb", margin: "4px 0" }} />
            <MenuItem
              label="引用"
              active={editor.isActive("blockquote")}
              onClick={() => {
                editor.chain().focus().toggleBlockquote().run();
                setOpen(null);
              }}
            />
          </div>
        ) : null}
      </div>

      {/* 对齐 */}
      <div style={{ position: "relative" }}>
        <IconBtn
          title="对齐与缩进"
          active={open === "align"}
          onClick={() => toggle("align")}
        >
          <span style={{ fontSize: 14 }}>☰</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
        </IconBtn>
        {open === "align" ? (
          <div style={{ ...popStyle, minWidth: 180 }}>
            <MenuItem
              label="左对齐"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => {
                editor.chain().focus().setTextAlign("left").run();
                setOpen(null);
              }}
            />
            <MenuItem
              label="居中对齐"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => {
                editor.chain().focus().setTextAlign("center").run();
                setOpen(null);
              }}
            />
            <MenuItem
              label="右对齐"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => {
                editor.chain().focus().setTextAlign("right").run();
                setOpen(null);
              }}
            />
            <div style={{ height: 1, background: "#e5e6eb", margin: "4px 0" }} />
            <MenuItem
              label="增加缩进"
              muted={!canIndent(editor)}
              onClick={() => {
                if (canIndent(editor)) indentIn(editor);
                setOpen(null);
              }}
            />
            <MenuItem
              label="减少缩进"
              muted={!canOutdent(editor)}
              onClick={() => {
                if (canOutdent(editor)) indentOut(editor);
                setOpen(null);
              }}
            />
          </div>
        ) : null}
      </div>

      <Sep />

      <IconBtn
        title="加粗"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </IconBtn>
      <IconBtn
        title="删除线"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span style={{ textDecoration: "line-through" }}>S</span>
      </IconBtn>
      <IconBtn
        title="斜体"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </IconBtn>
      <IconBtn
        title="下划线"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </IconBtn>
      <IconBtn
        title="链接"
        active={editor.isActive("link")}
        onClick={() => {
          if (onOpenLink) onOpenLink();
          else askLink(editor);
        }}
      >
        🔗
      </IconBtn>
      <IconBtn
        title="行内代码"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        {"</>"}
      </IconBtn>

      {/* 颜色 */}
      <div style={{ position: "relative" }}>
        <IconBtn
          title="字体与背景色"
          active={open === "color"}
          onClick={() => toggle("color")}
          style={open === "color" ? { background: "#fef9c3" } : undefined}
        >
          <span
            style={{
              fontWeight: 700,
              borderBottom: "3px solid #f5c00a",
              lineHeight: 1,
              paddingBottom: 1,
            }}
          >
            A
          </span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
        </IconBtn>
        {open === "color" ? (
          <div style={{ ...popStyle, minWidth: 260, padding: 10 }}>
            <div style={{ fontSize: 12, color: "#8f959e", marginBottom: 8 }}>
              字体颜色
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {FONT_COLORS.map((c) => (
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
                    border: "1px solid #dee0e3",
                    background: "#fff",
                    color: c.swatch,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: 0,
                  }}
                >
                  A
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#8f959e", marginBottom: 8 }}>
              背景颜色
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {BG_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  title={c.label}
                  className="rq-docedit-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (c.value) {
                      editor
                        .chain()
                        .focus()
                        .toggleHighlight({ color: c.value })
                        .run();
                    } else {
                      editor.chain().focus().unsetHighlight().run();
                    }
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: "1px solid #dee0e3",
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
              ))}
            </div>
            <button
              type="button"
              className="rq-docedit-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .unsetColor()
                  .unsetHighlight()
                  .run();
                setOpen(null);
              }}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: 13,
                border: "1px solid #e5e6eb",
                borderRadius: 8,
              }}
            >
              恢复默认
            </button>
          </div>
        ) : null}
      </div>

      <Sep />

      <IconBtn
        title="增加缩进"
        disabled={!canIndent(editor)}
        onClick={() => indentIn(editor)}
      >
        →|
      </IconBtn>
      <IconBtn
        title="减少缩进"
        disabled={!canOutdent(editor)}
        onClick={() => indentOut(editor)}
      >
        |←
      </IconBtn>
    </div>
  );
}
