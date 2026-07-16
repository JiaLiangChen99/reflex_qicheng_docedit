/**
 * Feishu-style block document editor (reflex_qicheng_docedit) entry (Reflex).
 * Panels live under ./panels/ — basic / table / task / media / insertMenu.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";

import { InsertMenu } from "./panels/insertMenu.jsx";
import { SelectionFormatBar } from "./panels/selectionToolbar.jsx";
import { TableControlsBar } from "./panels/table.jsx";
import { LinkPopover, registerLinkOpener } from "./panels/shared.jsx";
import {
  insertImageFromFile,
  pickImageFileFromDataTransfer,
} from "./panels/shared.jsx";
import { FeishuImage, isImageNodeSelection } from "./panels/imageExt.jsx";
import { ImageToolbar, useImageBox } from "./panels/imageToolbar.jsx";
import { HighlightBlock, isInHighlightBlock } from "./panels/highlightBlockExt.jsx";
import {
  HighlightBlockToolbar,
  useHighlightBox,
} from "./panels/highlightBlockToolbar.jsx";

const DEBOUNCE_MS = 300;

const CSS = `
.rq-docedit { position: relative; background: #fff; font-family: "PingFang SC","Microsoft YaHei",Inter,system-ui,sans-serif; }
.rq-docedit .ProseMirror { outline: none; padding: 28px 48px 64px 72px; min-height: 240px; font-size: 16px; line-height: 1.75; color: #1f2329; box-sizing: border-box; }
.rq-docedit .ProseMirror p { margin: 0.4em 0; }
.rq-docedit .ProseMirror h1 { font-size: 1.75em; font-weight: 700; margin: 0.8em 0 0.35em; }
.rq-docedit .ProseMirror h2 { font-size: 1.4em; font-weight: 700; margin: 0.8em 0 0.35em; }
.rq-docedit .ProseMirror h3 { font-size: 1.15em; font-weight: 700; margin: 0.8em 0 0.35em; }
.rq-docedit .ProseMirror ul, .rq-docedit .ProseMirror ol { padding-left: 1.4em; margin: 0.4em 0; }
.rq-docedit .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
.rq-docedit .ProseMirror ul[data-type="taskList"] li { display: flex; gap: 0.5rem; align-items: flex-start; }
.rq-docedit .ProseMirror ul[data-type="taskList"] li > label { margin-top: 0.35em; }
.rq-docedit .ProseMirror blockquote { border-left: 3px solid #dee0e3; margin: 0.6em 0; padding-left: 0.9em; color: #646a73; }
.rq-docedit .ProseMirror hr { border: none; border-top: 1px solid #dee0e3; margin: 1.2em 0; }
.rq-docedit .ProseMirror a { color: #1456f0; text-decoration: underline; }
.rq-docedit .ProseMirror code { background: #f5f6f7; border-radius: 4px; padding: 0.1em 0.35em; font-size: 0.9em; }
.rq-docedit .ProseMirror pre { background: #1f2329; color: #fff; border-radius: 8px; padding: 0.75em 1em; overflow-x: auto; }
.rq-docedit .ProseMirror pre code { background: transparent; color: inherit; padding: 0; }
.rq-docedit .ProseMirror img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0; }
.rq-docedit .ProseMirror [data-image-block] { max-width: 100%; width: 100%; }
.rq-docedit .ProseMirror [data-image-shell] { max-width: 100%; }
.rq-docedit .ProseMirror [data-image-caption] {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #8f959e;
  text-align: center;
  max-width: 100%;
  word-break: break-word;
}
.rq-docedit .ProseMirror [data-image-block][data-align="left"] [data-image-caption] { text-align: left; }
.rq-docedit .ProseMirror [data-image-block][data-align="right"] [data-image-caption] { text-align: right; }
.rq-docedit .ProseMirror [data-resize-container][data-node="image"] {
  margin: 0;
  max-width: 100%;
  width: fit-content;
}
.rq-docedit .ProseMirror [data-resize-wrapper] {
  max-width: 100%;
  border-radius: 8px;
  box-sizing: border-box;
}
/* 编辑选中：蓝框 */
.rq-docedit .ProseMirror [data-image-block].ProseMirror-selectednode [data-resize-wrapper],
.rq-docedit .ProseMirror [data-resize-container][data-node="image"].ProseMirror-selectednode [data-resize-wrapper] {
  outline: 2px solid #1456f0;
  outline-offset: 2px;
}
.rq-docedit .ProseMirror img.ProseMirror-selectednode {
  outline: 2px solid #1456f0;
  outline-offset: 2px;
}
/* 缩放手柄：默认隐藏，选中后显示 */
.rq-docedit .ProseMirror [data-resize-handle] {
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid #1456f0;
  border-radius: 2px;
  box-sizing: border-box;
  z-index: 3;
  opacity: 0;
  pointer-events: none;
}
.rq-docedit .ProseMirror [data-image-block].ProseMirror-selectednode [data-resize-handle],
.rq-docedit .ProseMirror [data-resize-container].ProseMirror-selectednode [data-resize-handle],
.rq-docedit .ProseMirror [data-resize-state="true"] [data-resize-handle] {
  opacity: 1;
  pointer-events: auto;
}
.rq-docedit .ProseMirror [data-resize-handle="top-left"] { cursor: nwse-resize; transform: translate(-50%, -50%); }
.rq-docedit .ProseMirror [data-resize-handle="top-right"] { cursor: nesw-resize; transform: translate(50%, -50%); }
.rq-docedit .ProseMirror [data-resize-handle="bottom-left"] { cursor: nesw-resize; transform: translate(-50%, 50%); }
.rq-docedit .ProseMirror [data-resize-handle="bottom-right"] { cursor: nwse-resize; transform: translate(50%, 50%); }
.rq-docedit .ProseMirror[contenteditable="false"] [data-resize-handle] { display: none !important; }
.rq-docedit .ProseMirror[contenteditable="false"] [data-image-block].ProseMirror-selectednode [data-resize-wrapper],
.rq-docedit .ProseMirror[contenteditable="false"] [data-resize-container].ProseMirror-selectednode [data-resize-wrapper] {
  outline: none;
}
.rq-docedit .ProseMirror [data-highlight-block] {
  border: 1px solid #ff8800;
  background: #fff7ed;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 0.6em 0;
  box-sizing: border-box;
  max-width: 100%;
  width: 100%;
}
.rq-docedit .ProseMirror [data-highlight-icon] {
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1.5;
  user-select: none;
}
.rq-docedit .ProseMirror [data-highlight-content] {
  flex: 1;
  min-width: 0;
}
.rq-docedit .ProseMirror [data-highlight-content] p { margin: 0.25em 0; }
.rq-docedit .ProseMirror mark { border-radius: 2px; padding: 0.05em 0.15em; }
.rq-docedit .ProseMirror [style*="text-align: center"], .rq-docedit .ProseMirror [data-text-align="center"] { text-align: center; }
.rq-docedit .ProseMirror [style*="text-align: right"], .rq-docedit .ProseMirror [data-text-align="right"] { text-align: right; }
.rq-docedit .ProseMirror [style*="text-align: left"], .rq-docedit .ProseMirror [data-text-align="left"] { text-align: left; }
.rq-docedit .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.8em 0; }
.rq-docedit .ProseMirror .tableWrapper { overflow-x: auto; margin: 0.8em 0; }
.rq-docedit .ProseMirror td, .rq-docedit .ProseMirror th { border: 1px solid #dee0e3; padding: 8px 12px; vertical-align: top; min-width: 72px; }
.rq-docedit .ProseMirror th { background: #f5f6f7; font-weight: 600; }
.rq-docedit .ProseMirror.ProseMirror-focused table:has(.selectedCell) { outline: 2px solid rgba(20,86,240,0.25); outline-offset: 2px; }
.rq-docedit .ProseMirror p.is-editor-empty:first-child::before { color: #8f959e; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
.rq-docedit-float { position: fixed; z-index: 50; background: #fff; border: 1px solid #e5e6eb; border-radius: 10px; box-shadow: 0 8px 28px rgba(31,35,41,0.14); }
.rq-docedit-btn { appearance: none; border: none; background: transparent; cursor: pointer; border-radius: 6px; font: inherit; color: #1f2329; }
.rq-docedit-btn:hover { background: #f5f6f7; }
.rq-docedit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.rq-docedit-btn.is-on { background: #e8f3ff; color: #1456f0; }
.rq-docedit-gutter {
  display: flex;
  align-items: center;
  pointer-events: auto;
}
.rq-docedit-gutter-pill {
  display: flex;
  align-items: center;
  gap: 0;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  padding: 1px 2px;
  box-shadow: 0 1px 3px rgba(31, 35, 41, 0.06);
}
.rq-docedit-block-badge {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #1456f0;
  border-radius: 4px;
  flex-shrink: 0;
  user-select: none;
}
.rq-docedit-grip-btn {
  width: 20px;
  height: 20px;
}
.rq-docedit .ProseMirror .rq-docedit-active-block {
  background: #f2f3f5;
  border-radius: 6px;
}
.rq-docedit .ProseMirror [data-highlight-block].rq-docedit-active-block {
  box-shadow: inset 0 0 0 2px rgba(20, 86, 240, 0.12);
}
.rq-docedit .ProseMirror li.rq-docedit-active-block {
  border-radius: 6px;
}
.rq-docedit-block-drop-line {
  position: fixed;
  height: 2px;
  background: #1456f0;
  border-radius: 1px;
  z-index: 60;
  pointer-events: none;
}
body.rq-docedit-block-dragging {
  cursor: grabbing !important;
  user-select: none;
}
body.rq-docedit-block-dragging .rq-docedit-grip-btn {
  cursor: grabbing;
  background: #e8f3ff;
  color: #1456f0;
}
.rq-docedit-drag-handle {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: grab;
  color: #bbbfc4;
  padding: 0;
  touch-action: none;
  z-index: 45;
}
.rq-docedit-drag-handle:hover {
  background: #f5f6f7;
  color: #8f959e;
}
.rq-docedit-drag-handle:active { cursor: grabbing; }
.rq-docedit-drag-grip {
  display: grid;
  grid-template-columns: repeat(2, 3px);
  gap: 2px;
}
.rq-docedit-drag-grip i {
  display: block;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  font-style: normal;
}
.rq-docedit .ProseMirror-selectednode,
.rq-docedit .ProseMirror-selectednoderange {
  position: relative;
}
.rq-docedit .ProseMirror-selectednode::before,
.rq-docedit .ProseMirror-selectednoderange::before {
  content: "";
  position: absolute;
  inset: -2px;
  background: rgba(20, 86, 240, 0.06);
  border-radius: 6px;
  pointer-events: none;
  z-index: -1;
}
`;

function sizeCss(v, fallback) {
  if (v == null || v === "") return fallback;
  if (typeof v === "number") return Number.isFinite(v) ? `${v}px` : fallback;
  const s = String(v).trim();
  return !s || s.toLowerCase() === "nan" ? fallback : s;
}

function useSelectionRect(editor) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!editor) return undefined;
    const sync = () => {
      const { state, view } = editor;
      const { empty, from, to } = state.selection;
      if (empty || from === to || isImageNodeSelection(editor) || isInHighlightBlock(editor)) {
        setRect(null);
        return;
      }
      // Also hide text bar when a NodeSelection is active (any atom block).
      if (state.selection.node) {
        setRect(null);
        return;
      }
      try {
        const a = view.coordsAtPos(from);
        const b = view.coordsAtPos(to);
        const top = Math.min(a.top, b.top);
        const bottom = Math.max(a.bottom, b.bottom);
        const left = Math.min(a.left, b.left);
        const right = Math.max(a.right, b.right);
        setRect({
          top,
          bottom,
          left,
          right,
          midX: (left + right) / 2,
        });
      } catch {
        setRect(null);
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
  return rect;
}

function useTableBox(editor) {
  const [box, setBox] = useState(null);
  useEffect(() => {
    if (!editor) return undefined;
    const sync = () => {
      if (!editor.isActive("table") || !editor.state.selection.empty) {
        // When text is selected inside table, selection toolbar takes over.
        if (!editor.state.selection.empty) {
          setBox(null);
          return;
        }
      }
      if (!editor.isActive("table")) {
        setBox(null);
        return;
      }
      try {
        const c = editor.view.coordsAtPos(editor.state.selection.from);
        setBox({ top: Math.round(c.top - 44), left: Math.round(c.left) });
      } catch {
        setBox(null);
      }
    };
    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    sync();
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("transaction", sync);
    };
  }, [editor]);
  return box;
}

export function DocEdit({
  content,
  revision = 0,
  placeholder = "输入 / 或点击左侧 + 插入",
  editable = true,
  editorWidth,
  editorHeight,
  onChange,
  onJsonChange,
  onImagePaste,
  style,
}) {
  const [mountKey, setMountKey] = useState(0);
  const [initial, setInitial] = useState(() => content || "<p></p>");
  const lastRev = useRef(revision);
  const lastHtml = useRef(typeof content === "string" ? content : null);
  const timer = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onJsonRef = useRef(onJsonChange);
  const onImagePasteRef = useRef(onImagePaste);
  onChangeRef.current = onChange;
  onJsonRef.current = onJsonChange;
  onImagePasteRef.current = onImagePaste;

  useEffect(() => {
    if (revision === lastRev.current) return;
    lastRev.current = revision;
    const next = content || "<p></p>";
    setInitial(next);
    lastHtml.current = typeof next === "string" ? next : null;
    setMountKey((k) => k + 1);
  }, [revision, content]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const notify = useCallback((ed) => {
    if (!ed) return;
    const html = ed.getHTML();
    if (html === lastHtml.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const latest = ed.getHTML();
      if (latest === lastHtml.current) return;
      lastHtml.current = latest;
      onChangeRef.current?.(latest);
      onJsonRef.current?.(ed.getJSON());
    }, DEBOUNCE_MS);
  }, []);

  const handleImageFile = useCallback((file) => {
    const ed = editorRef.current;
    if (!ed || !file) return false;
    void insertImageFromFile(ed, file, (src, mime) => {
      onImagePasteRef.current?.(src, mime);
    });
    return true;
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Placeholder.configure({ placeholder: String(placeholder || "") }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer" },
        }),
        FeishuImage.configure({
          allowBase64: true,
          resize: {
            enabled: true,
            directions: [
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ],
            minWidth: 48,
            minHeight: 48,
            alwaysPreserveAspectRatio: true,
          },
        }),
        Highlight.configure({ multicolor: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TextStyle,
        Color,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TableKit.configure({ table: { resizable: true } }),
        HighlightBlock,
      ],
      content: initial,
      editable: !!editable,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => notify(ed),
      editorProps: {
        attributes: { class: "rq-docedit-prose" },
        handlePaste(_view, event) {
          const file = pickImageFileFromDataTransfer(event.clipboardData);
          if (!file) return false;
          event.preventDefault();
          handleImageFile(file);
          return true;
        },
        handleDrop(_view, event, _slice, moved) {
          if (moved) return false;
          const file = pickImageFileFromDataTransfer(event.dataTransfer);
          if (!file) return false;
          event.preventDefault();
          handleImageFile(file);
          return true;
        },
      },
    },
    [mountKey, handleImageFile],
  );

  editorRef.current = editor;

  useEffect(() => {
    if (editor) editor.setEditable(!!editable);
  }, [editor, editable]);

  const selectionRect = useSelectionRect(editor);
  const tableBox = useTableBox(editor);
  const imageBox = useImageBox(editor);
  const highlightBox = useHighlightBox(editor);
  const [linkSession, setLinkSession] = useState(null);
  // { from, to, rect }

  useEffect(() => {
    if (!editor) return undefined;
    return registerLinkOpener(() => {
      const { from, to } = editor.state.selection;
      if (from === to) return;
      let rect = selectionRect;
      if (!rect) {
        try {
          const a = editor.view.coordsAtPos(from);
          const b = editor.view.coordsAtPos(to);
          const top = Math.min(a.top, b.top);
          const bottom = Math.max(a.bottom, b.bottom);
          const left = Math.min(a.left, b.left);
          const right = Math.max(a.right, b.right);
          rect = { top, bottom, left, right, midX: (left + right) / 2 };
        } catch {
          return;
        }
      }
      setLinkSession({ from, to, rect });
    });
  }, [editor, selectionRect]);

  return (
    <div
      className="rq-docedit"
      style={{
        width: sizeCss(editorWidth, "100%"),
        minHeight: sizeCss(editorHeight, "320px"),
        height: "auto",
        overflow: "visible",
        ...style,
      }}
    >
      <style>{CSS}</style>
      {editor ? (
        <>
          <InsertMenu editor={editor} />
          <ImageToolbar editor={editor} box={imageBox} />
          <HighlightBlockToolbar editor={editor} box={highlightBox} />
          {linkSession ? (
            <LinkPopover
              editor={editor}
              rect={linkSession.rect}
              from={linkSession.from}
              to={linkSession.to}
              onClose={() => setLinkSession(null)}
            />
          ) : !imageBox && !highlightBox ? (
            <SelectionFormatBar
              editor={editor}
              rect={selectionRect}
              onOpenLink={() => {
                const { from, to } = editor.state.selection;
                if (from === to || !selectionRect) return;
                setLinkSession({ from, to, rect: selectionRect });
              }}
            />
          ) : null}
          <TableControlsBar editor={editor} box={tableBox} />
        </>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
