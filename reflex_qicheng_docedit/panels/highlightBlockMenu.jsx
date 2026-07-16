/** 高亮块：常用区入口 */
import React from "react";

export function insertHighlightBlock(editor) {
  editor.chain().focus().insertHighlightBlock().run();
}

export function HighlightBlockCommonItem({ onClick }) {
  return (
    <button
      type="button"
      className="rq-docedit-btn"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: "#fff7ed",
          border: "1px solid #ff8800",
          color: "#ff8800",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        ▣
      </span>
      <span>
        <strong>高亮块</strong>
        <span
          style={{
            display: "block",
            fontSize: 12,
            color: "#8f959e",
            fontWeight: 400,
          }}
        >
          强调提示与说明
        </span>
      </span>
    </button>
  );
}
