/** 图片 / 视频 */
import React from "react";
import { askImage, askVideo } from "./shared.jsx";

export function MediaCommonItems({ editor, onDone }) {
  return (
    <>
      <button
        type="button"
        className="rq-docedit-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          askImage(editor);
          onDone?.();
        }}
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
            background: "#fef3c7",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          🖼
        </span>
        <span>
          <strong>图片</strong>
          <span style={{ display: "block", fontSize: 12, color: "#8f959e", fontWeight: 400 }}>
            粘贴截图，或选择本地文件
          </span>
        </span>
      </button>
      <button
        type="button"
        className="rq-docedit-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          askVideo(editor);
          onDone?.();
        }}
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
            background: "#dbeafe",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          ▶
        </span>
        <span>
          <strong>视频或文件</strong>
          <span style={{ display: "block", fontSize: 12, color: "#8f959e", fontWeight: 400 }}>
            插入可播放视频地址
          </span>
        </span>
      </button>
    </>
  );
}
