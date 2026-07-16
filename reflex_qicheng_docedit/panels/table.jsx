/** 表格：尺寸选择 + 表内浮动操作（默认无表头） */
import React from "react";
import { Chip } from "./shared.jsx";

export function insertPlainTable(editor, rows = 3, cols = 3) {
  editor
    .chain()
    .focus()
    .insertTable({ rows, cols, withHeaderRow: false })
    .run();
}

export function TableSizePanel({ editor, onBack, onDone }) {
  const sizes = [
    [3, 3],
    [4, 4],
    [5, 3],
    [2, 2],
  ];
  return (
    <>
      <button
        type="button"
        className="rq-docedit-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onBack}
        style={{ padding: "4px 8px 10px", color: "#646a73", fontSize: 13 }}
      >
        ← 返回 · 插入表格（无表头）
      </button>
      {sizes.map(([r, c]) => (
        <button
          key={`${r}x${c}`}
          type="button"
          className="rq-docedit-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            insertPlainTable(editor, r, c);
            onDone?.();
          }}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "10px 12px",
            fontSize: 14,
          }}
        >
          {r} × {c} 表格
        </button>
      ))}
    </>
  );
}

export function TableCommonItem({ onOpen }) {
  return (
    <button
      type="button"
      className="rq-docedit-btn"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onOpen}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "#dcfce7",
            color: "#16a34a",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          ⊞
        </span>
        <span>
          <strong>表格</strong>
          <span style={{ display: "block", fontSize: 12, color: "#8f959e", fontWeight: 400 }}>
            默认无表头
          </span>
        </span>
      </span>
      <span style={{ color: "#bbbfc4" }}>›</span>
    </button>
  );
}

export function TableControlsBar({ editor, box }) {
  if (!editor || !box) return null;
  return (
    <div
      className="rq-docedit-float"
      style={{
        top: Math.max(8, box.top),
        left: Math.max(8, box.left),
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "4px 6px",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: "#22c55e",
          display: "inline-block",
        }}
      />
      <Chip
        title="向右插列"
        disabled={!editor.can().addColumnAfter()}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        插列
      </Chip>
      <Chip
        title="下方插行"
        disabled={!editor.can().addRowAfter()}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        插行
      </Chip>
      <Chip
        title="删列"
        disabled={!editor.can().deleteColumn()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        删列
      </Chip>
      <Chip
        title="删行"
        disabled={!editor.can().deleteRow()}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        删行
      </Chip>
      <Chip
        title="删表"
        disabled={!editor.can().deleteTable()}
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        删表
      </Chip>
    </div>
  );
}
