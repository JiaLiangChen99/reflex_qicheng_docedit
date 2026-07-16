/**
 * 基础：标题 / 列表 / 任务 / 代码 / 引用 / 分割线 / 链接
 * + 飞书风格「缩进和对齐」「颜色」右侧子菜单
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import {
  askLink,
  AlignSubmenu,
  ColorSubmenu,
  indentIn,
  indentOut,
  canIndent,
  canOutdent,
} from "./shared.jsx";

export function getBasicActions(editor) {
  return [
    {
      key: "p",
      label: "T",
      title: "正文",
      run: () => editor.chain().focus().setParagraph().run(),
      active: () =>
        editor.isActive("paragraph") &&
        !editor.isActive("heading") &&
        !editor.isActive("bulletList") &&
        !editor.isActive("orderedList") &&
        !editor.isActive("taskList") &&
        !editor.isActive("codeBlock") &&
        !editor.isActive("blockquote"),
    },
    {
      key: "h1",
      label: "H1",
      title: "标题 1",
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: () => editor.isActive("heading", { level: 1 }),
    },
    {
      key: "h2",
      label: "H2",
      title: "标题 2",
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: () => editor.isActive("heading", { level: 2 }),
    },
    {
      key: "h3",
      label: "H3",
      title: "标题 3",
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: () => editor.isActive("heading", { level: 3 }),
    },
    {
      key: "ol",
      label: "1.",
      title: "有序列表",
      run: () => editor.chain().focus().toggleOrderedList().run(),
      active: () => editor.isActive("orderedList"),
    },
    {
      key: "ul",
      label: "•",
      title: "无序列表",
      run: () => editor.chain().focus().toggleBulletList().run(),
      active: () => editor.isActive("bulletList"),
    },
    {
      key: "task",
      label: "☑",
      title: "任务列表",
      run: () => editor.chain().focus().toggleTaskList().run(),
      active: () => editor.isActive("taskList"),
    },
    {
      key: "code",
      label: "{}",
      title: "代码块",
      run: () => editor.chain().focus().toggleCodeBlock().run(),
      active: () => editor.isActive("codeBlock"),
    },
    {
      key: "quote",
      label: "“",
      title: "引用",
      run: () => editor.chain().focus().toggleBlockquote().run(),
      active: () => editor.isActive("blockquote"),
    },
    {
      key: "hr",
      label: "—",
      title: "分割线",
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      key: "link",
      label: "🔗",
      title: "链接",
      run: () => askLink(editor),
      active: () => editor.isActive("link"),
    },
  ];
}

export { indentIn, indentOut, canIndent, canOutdent };

function SubmenuRow({ icon, label, open, onToggle, children, flyoutWidth = 200 }) {
  const rowRef = useRef(null);
  const [side, setSide] = useState("right");

  useLayoutEffect(() => {
    if (!open || !rowRef.current) return;
    const r = rowRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - r.right;
    setSide(spaceRight < flyoutWidth + 12 ? "left" : "right");
  }, [open, flyoutWidth]);

  return (
    <div ref={rowRef} style={{ position: "relative", margin: "0 4px" }}>
      <button
        type="button"
        className="rq-docedit-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 10px",
          fontSize: 13,
          color: "#1f2329",
          background: open ? "#f5f6f7" : "transparent",
          borderRadius: 8,
        }}
      >
        <span style={{ width: 18, textAlign: "center", flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <span style={{ color: "#8f959e", fontSize: 12 }}>›</span>
      </button>
      {open && typeof children === "function" ? children(side) : open ? children : null}
    </div>
  );
}

/** Grid + 缩进和对齐 / 颜色（飞书右侧子菜单） */
export function BasicPanel({ editor, onDone }) {
  const actions = getBasicActions(editor);
  const [flyout, setFlyout] = useState(null); // align | color | null

  const toggle = (key) => setFlyout((v) => (v === key ? null : key));

  return (
    <>
      <div style={{ fontSize: 12, color: "#8f959e", padding: "4px 8px 8px" }}>
        基础
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 4,
          padding: "0 4px 10px",
        }}
      >
        {actions.map((a) => {
          const on = a.active?.();
          return (
            <button
              key={a.key}
              type="button"
              title={a.title}
              className={`rq-docedit-btn${on ? " is-on" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                a.run();
                onDone?.();
              }}
              style={{
                height: 36,
                background: on ? "#e8f3ff" : "#f5f6f7",
                fontWeight: 600,
                fontSize: 13,
                color: on ? "#1456f0" : undefined,
              }}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      <div style={{ height: 1, background: "#e5e6eb", margin: "4px 8px 6px" }} />

      <SubmenuRow
        icon="☰"
        label="缩进和对齐"
        open={flyout === "align"}
        onToggle={() => toggle("align")}
        flyoutWidth={200}
      >
        {(side) => <AlignSubmenu editor={editor} side={side} />}
      </SubmenuRow>

      <SubmenuRow
        icon="🎨"
        label="颜色"
        open={flyout === "color"}
        onToggle={() => toggle("color")}
        flyoutWidth={280}
      >
        {(side) => <ColorSubmenu editor={editor} side={side} />}
      </SubmenuRow>

      <div style={{ height: 1, background: "#e5e6eb", margin: "8px 8px 4px" }} />
    </>
  );
}
