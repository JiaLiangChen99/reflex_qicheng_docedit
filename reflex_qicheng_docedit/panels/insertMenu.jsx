/**
 * 飞书风插入边栏：组装 基础 / 任务 / 图片视频 / 表格
 */
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { BasicPanel } from "./basic.jsx";
import { TaskCommonItem, insertTaskList } from "./task.jsx";
import { MediaCommonItems } from "./media.jsx";
import { TableCommonItem, TableSizePanel } from "./table.jsx";
import {
  HighlightBlockCommonItem,
  insertHighlightBlock,
} from "./highlightBlockMenu.jsx";
import {
  BlockGutterRail,
  findActiveBlock,
  useActiveBlock,
  useBlockHighlight,
} from "./blockGutter.jsx";

const PANEL_W = 288;
const PANEL_GAP = 8;

/** Place panel to the left of the "+" (or caret), so it won't cover the line. */
function placePanelLeftOf(anchorLeft, anchorTop) {
  let left = Math.round(anchorLeft - PANEL_W - PANEL_GAP);
  if (left < 8) left = 8;
  return { top: Math.round(anchorTop), left };
}

export function InsertMenu({ editor }) {
  const active = useActiveBlock(editor);
  useBlockHighlight(active);
  const [panel, setPanel] = useState(null);
  const [view, setView] = useState("main");
  const panelRef = useRef(null);

  useEffect(() => {
    if (!editor) return undefined;
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!editor.isFocused) return;
      if (editor.isActive("table") || editor.isActive("codeBlock")) return;
      const { $from } = editor.state.selection;
      if (!$from.parent.isTextblock) return;
      const before = $from.parent.textBetween(
        0,
        $from.parentOffset,
        undefined,
        "\ufffc",
      );
      if (before.trim() !== "") return;
      e.preventDefault();
      e.stopPropagation();
      const block = findActiveBlock(editor);
      if (!block) return;
      setView("main");
      setPanel(
        placePanelLeftOf(Math.max(4, block.panelAnchorLeft), block.panelAnchorTop),
      );
    };
    const el = editor.view.dom;
    el.addEventListener("keydown", onKey, true);
    return () => el.removeEventListener("keydown", onKey, true);
  }, [editor]);

  useEffect(() => {
    if (!panel) return undefined;
    const onDoc = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (e.target?.closest?.(".rq-docedit-plus")) return;
      if (e.target?.closest?.(".rq-docedit-gutter")) return;
      setPanel(null);
      setView("main");
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [panel]);

  // After paint: shift up so the whole panel (incl. 表格) fits in the viewport.
  useLayoutEffect(() => {
    if (!panel || !panelRef.current) return;
    const el = panelRef.current;
    const h = el.scrollHeight;
    const pad = 8;
    const viewH = window.innerHeight;
    const maxH = viewH - pad * 2;

    if (h <= maxH) {
      const maxTop = viewH - h - pad;
      const nextTop = Math.max(pad, Math.min(panel.top, maxTop));
      if (nextTop !== panel.top || panel.maxH != null) {
        setPanel((p) => (p ? { ...p, top: nextTop, maxH: undefined } : p));
      }
      return;
    }

    // Taller than viewport — pin to top and scroll inside.
    if (panel.top !== pad || panel.maxH !== maxH) {
      setPanel((p) => (p ? { ...p, top: pad, maxH } : p));
    }
  }, [panel, view]);

  if (!editor) return null;

  const close = () => {
    setPanel(null);
    setView("main");
  };

  const openPanel = () => {
    if (!active) return;
    setView("main");
    setPanel(
      placePanelLeftOf(Math.max(4, active.panelAnchorLeft), active.panelAnchorTop),
    );
  };

  return (
    <>
      <BlockGutterRail editor={editor} active={active} />
      {active ? (
        <button
          type="button"
          className="rq-docedit-plus rq-docedit-btn"
          title="插入"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (panel ? close() : openPanel())}
          style={{
            position: "fixed",
            top: active.top,
            left: Math.max(4, active.plusLeft),
            zIndex: 40,
            width: 22,
            height: 22,
            borderRadius: "50%",
            color: "#8f959e",
            fontSize: 18,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      ) : null}

      {panel ? (
        <div
          ref={panelRef}
          className="rq-docedit-float"
          style={{
            top: panel.top,
            left: panel.left,
            width: PANEL_W,
            maxHeight: panel.maxH,
            overflowX: "visible",
            overflowY: panel.maxH ? "auto" : "visible",
            padding: "10px 8px 12px",
            zIndex: 50,
            boxSizing: "border-box",
          }}
        >
          {view === "main" ? (
            <>
              <BasicPanel editor={editor} onDone={close} />
              <div style={{ fontSize: 12, color: "#8f959e", padding: "4px 8px 6px" }}>
                常用
              </div>
              <TaskCommonItem
                onClick={() => {
                  insertTaskList(editor);
                  close();
                }}
              />
              <MediaCommonItems editor={editor} onDone={close} />
              <HighlightBlockCommonItem
                onClick={() => {
                  insertHighlightBlock(editor);
                  close();
                }}
              />
              <TableCommonItem onOpen={() => setView("table")} />
            </>
          ) : (
            <TableSizePanel
              editor={editor}
              onBack={() => setView("main")}
              onDone={close}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
