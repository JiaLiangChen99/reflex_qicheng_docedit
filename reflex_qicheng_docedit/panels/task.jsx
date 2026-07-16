/** 任务：常用区入口 + 一键插入任务列表 */
import React from "react";

export function insertTaskList(editor) {
  editor.chain().focus().toggleTaskList().run();
}

export function TaskCommonItem({ onClick }) {
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
          background: "#f3e8ff",
          color: "#7c3aed",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        ☑
      </span>
      <span>
        <strong>任务</strong>
        <span style={{ display: "block", fontSize: 12, color: "#8f959e", fontWeight: 400 }}>
          待办勾选列表
        </span>
      </span>
    </button>
  );
}
