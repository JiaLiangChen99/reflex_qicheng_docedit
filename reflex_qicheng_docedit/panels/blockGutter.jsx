/**
 * 飞书风块边栏：当前行高亮 + 类型标识 + 拖拽手柄
 */
import React, { useCallback, useEffect, useState } from "react";
import { TextSelection } from "@tiptap/pm/state";
import { dropPoint } from "@tiptap/pm/transform";

function getOuterDom(view, node) {
  let el = node;
  if (el?.nodeType === 3) el = el.parentElement;
  while (el && el.parentElement && el.parentElement !== view.dom) {
    el = el.parentElement;
  }
  return el;
}

function resolveBlockDepth($pos) {
  for (let d = $pos.depth; d >= 1; d -= 1) {
    const name = $pos.node(d).type.name;
    if (name === "listItem" || name === "highlightBlock") return d;
    if ($pos.node(d - 1).type.name === "doc") return d;
  }
  return 1;
}

/** 解析光标所在可拖拽块（列表项 / 高亮块 / 文档顶层块） */
export function findActiveBlock(editor) {
  if (!editor?.isEditable || !editor.isFocused) return null;

  const { state, view } = editor;
  const { selection } = state;
  if (!selection.empty) return null;
  if (editor.isActive("table") || editor.isActive("codeBlock")) return null;

  const { $from } = selection;
  if (!$from.parent.isTextblock && $from.parent.type.name !== "highlightBlock") {
    return null;
  }

  const blockDepth = resolveBlockDepth($from);
  const blockPos = $from.before(blockDepth);
  const blockNode = $from.node(blockDepth);

  let blockDom = view.nodeDOM(blockPos);
  if (!blockDom || blockDom.nodeType === 3) {
    const found = view.domAtPos($from.pos);
    blockDom = getOuterDom(view, found.node);
  }
  if (!blockDom?.getBoundingClientRect) return null;

  const blockRect = blockDom.getBoundingClientRect();
  const proseRect = view.dom.getBoundingClientRect();
  const lineCoords = view.coordsAtPos($from.pos);

  return {
    blockPos,
    blockNode,
    blockDom,
    blockRect,
    blockType: blockNode.type.name,
    top: Math.round(lineCoords.top),
    gutterLeft: Math.round(proseRect.left + 6),
    plusLeft: Math.round(proseRect.left + 46),
    panelAnchorLeft: Math.round(proseRect.left + 46),
    panelAnchorTop: Math.round(lineCoords.top),
  };
}

export function useActiveBlock(editor) {
  const [active, setActive] = useState(null);

  const sync = useCallback(() => {
    setActive(findActiveBlock(editor));
  }, [editor]);

  useEffect(() => {
    if (!editor) return undefined;
    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    editor.on("focus", sync);
    editor.on("blur", sync);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    sync();
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("transaction", sync);
      editor.off("focus", sync);
      editor.off("blur", sync);
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [editor, sync]);

  return active;
}

/** 当前块浅灰高亮（飞书风） */
export function useBlockHighlight(active) {
  useEffect(() => {
    const dom = active?.blockDom;
    if (!dom) return undefined;
    dom.classList.add("rq-docedit-active-block");
    return () => dom.classList.remove("rq-docedit-active-block");
  }, [active?.blockDom, active?.blockPos]);
}

function blockTypeLabel(type) {
  if (type === "heading") return "H";
  if (type === "blockquote") return "❝";
  if (type === "codeBlock") return "</>";
  if (type === "bulletList" || type === "orderedList" || type === "taskList") {
    return "≡";
  }
  if (type === "listItem") return "•";
  if (type === "highlightBlock") return "▣";
  return "T";
}

function resolveDropTarget(editor, clientX, clientY) {
  const { view, state } = editor;
  const prose = view.dom.getBoundingClientRect();
  if (clientY < prose.top - 24 || clientY > prose.bottom + 24) return null;

  const coords = view.posAtCoords({
    left: Math.max(prose.left + 24, Math.min(clientX, prose.right - 24)),
    top: clientY,
  });

  if (coords) {
    const $pos = state.doc.resolve(coords.pos);
    const blockDepth = resolveBlockDepth($pos);
    const blockPos = $pos.before(blockDepth);
    const blockNode = $pos.node(blockDepth);

    let blockDom = view.nodeDOM(blockPos);
    if (!blockDom || blockDom.nodeType === 3) {
      const found = view.domAtPos(coords.pos);
      blockDom = getOuterDom(view, found.node);
    }

    const rect = blockDom?.getBoundingClientRect?.();
    if (rect) {
      const mid = rect.top + rect.height / 2;
      const insertBeforePos =
        clientY < mid ? blockPos : blockPos + blockNode.nodeSize;
      const lineTop = clientY < mid ? rect.top - 1 : rect.bottom - 1;
      return {
        insertBeforePos,
        lineTop,
        left: prose.left,
        right: prose.right,
      };
    }
  }

  // 指针在左侧边栏时，posAtCoords 可能失效；按 Y 扫描顶层块兜底。
  const blocks = [];
  state.doc.forEach((node, offset) => {
    let dom = view.nodeDOM(offset);
    if (!dom || dom.nodeType === 3) {
      const found = view.domAtPos(offset + 1);
      dom = getOuterDom(view, found.node);
    }
    const rect = dom?.getBoundingClientRect?.();
    if (!rect) return;
    blocks.push({ pos: offset, nodeSize: node.nodeSize, rect });
  });

  if (!blocks.length) return null;

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const mid = block.rect.top + block.rect.height / 2;
    if (clientY < mid) {
      return {
        insertBeforePos: block.pos,
        lineTop: block.rect.top - 1,
        left: prose.left,
        right: prose.right,
      };
    }
    const isLast = i === blocks.length - 1;
    const nextMid = isLast
      ? Number.POSITIVE_INFINITY
      : blocks[i + 1].rect.top + blocks[i + 1].rect.height / 2;
    if (clientY < nextMid) {
      return {
        insertBeforePos: block.pos + block.nodeSize,
        lineTop: block.rect.bottom - 1,
        left: prose.left,
        right: prose.right,
      };
    }
  }

  const last = blocks[blocks.length - 1];
  return {
    insertBeforePos: last.pos + last.nodeSize,
    lineTop: last.rect.bottom - 1,
    left: prose.left,
    right: prose.right,
  };
}

function moveBlockTo(editor, fromPos, insertBeforePos) {
  const { state, view } = editor;
  const node = state.doc.nodeAt(fromPos);
  if (!node) return false;

  const size = node.nodeSize;
  if (insertBeforePos === fromPos || insertBeforePos === fromPos + size) {
    return false;
  }
  if (insertBeforePos > fromPos && insertBeforePos < fromPos + size) return false;

  const slice = state.doc.slice(fromPos, fromPos + size);
  let tr = state.tr.delete(fromPos, fromPos + size);

  let mapped = insertBeforePos;
  if (insertBeforePos > fromPos) mapped -= size;
  mapped = Math.max(0, Math.min(mapped, tr.doc.content.size));

  const point = dropPoint(tr.doc, mapped, slice);
  if (point != null) mapped = point;

  try {
    tr.doc.resolve(mapped);
  } catch {
    return false;
  }

  tr = tr.insert(mapped, slice.content);

  try {
    const inner = Math.min(mapped + 1, tr.doc.content.size - 1);
    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(1, inner))));
  } catch {
    // keep default selection
  }

  view.dispatch(tr.scrollIntoView());
  return true;
}

function useBlockPointerDrag(editor) {
  const [dropLine, setDropLine] = useState(null);

  const onGripPointerDown = useCallback(
    (event, active) => {
      if (!editor || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);

      const session = { fromPos: active.blockPos, lastTarget: null };
      document.body.classList.add("rq-docedit-block-dragging");

      const applyTarget = (target) => {
        if (!target) {
          session.lastTarget = null;
          setDropLine(null);
          return;
        }
        session.lastTarget = target;
        setDropLine({
          top: Math.round(target.lineTop),
          left: Math.round(target.left + 8),
          width: Math.round(target.right - target.left - 16),
        });
      };

      const onMove = (ev) => {
        applyTarget(resolveDropTarget(editor, ev.clientX, ev.clientY));
      };

      const finish = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        document.body.classList.remove("rq-docedit-block-dragging");
        setDropLine(null);

        if (session.lastTarget) {
          moveBlockTo(
            editor,
            session.fromPos,
            session.lastTarget.insertBeforePos,
          );
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      onMove(event);
    },
    [editor],
  );

  return { dropLine, onGripPointerDown };
}

export function BlockGutterRail({ editor, active }) {
  const { dropLine, onGripPointerDown } = useBlockPointerDrag(editor);

  if (!editor || !active) return null;

  return (
    <>
      {dropLine ? (
        <div
          className="rq-docedit-block-drop-line"
          style={{
            top: dropLine.top,
            left: dropLine.left,
            width: dropLine.width,
          }}
        />
      ) : null}
      <div
        className="rq-docedit-gutter"
        style={{
          position: "fixed",
          top: active.top,
          left: active.gutterLeft,
          zIndex: 40,
          transform: "translateY(-1px)",
        }}
      >
        <div className="rq-docedit-gutter-pill">
          <span className="rq-docedit-block-badge" title="块类型">
            {blockTypeLabel(active.blockType)}
          </span>
          <button
            type="button"
            className="rq-docedit-drag-handle rq-docedit-grip-btn"
            title="拖拽移动"
            aria-label="拖拽移动"
            onPointerDown={(e) => onGripPointerDown(e, active)}
          >
            <span className="rq-docedit-drag-grip" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
