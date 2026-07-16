"""reflex_qicheng_docedit — 飞书风块文档编辑器（自用包）.

底层基于 TipTap 实现；对外 API 以 DocEdit 为准。

UI modules (JSX):
- panels/basic.jsx            基础插入 + 文字缩进/颜色
- panels/selectionToolbar.jsx 选区浮动工具栏（飞书风格）
- panels/imageExt.jsx         图片扩展（对齐 / 描述 / 缩放）
- panels/imageToolbar.jsx     图片浮动工具栏（裁剪 / 描述 / 对齐）
- panels/highlightBlockExt.jsx   高亮块节点
- panels/highlightBlockMenu.jsx  高亮块插入入口
- panels/highlightBlockToolbar.jsx 高亮块颜色工具栏
- panels/blockGutter.jsx        块边栏（高亮 / 拖拽 / 类型标识）
- panels/table.jsx            表格插入与表内操作
- panels/task.jsx             任务
- panels/media.jsx            图片 / 视频
- panels/insertMenu.jsx       「+」/「/」边栏组装
"""

from __future__ import annotations

from pathlib import Path

import reflex as rx
from reflex.components.component import NoSSRComponent

_PKG = Path(__file__).resolve().parent
_PKG_NAME = "reflex_qicheng_docedit"
(_PKG.parent / "assets" / "external" / _PKG_NAME / "panels").mkdir(
    parents=True, exist_ok=True
)

_jsx_path = rx.asset("./editor.jsx", shared=True)

for _rel in (
    "panels/shared.jsx",
    "panels/basic.jsx",
    "panels/table.jsx",
    "panels/task.jsx",
    "panels/media.jsx",
    "panels/insertMenu.jsx",
    "panels/selectionToolbar.jsx",
    "panels/imageExt.jsx",
    "panels/imageToolbar.jsx",
    "panels/highlightBlockExt.jsx",
    "panels/highlightBlockMenu.jsx",
    "panels/highlightBlockToolbar.jsx",
    "panels/blockGutter.jsx",
):
    rx.asset(f"./{_rel}", shared=True)

_V = "3.27.4"


class DocEdit(NoSSRComponent):
    """Feishu-like block document editor for Reflex (NoSSR)."""

    library = f"$/public{_jsx_path}"
    tag = "DocEdit"

    lib_dependencies: list[str] = [
        f"@tiptap/react@{_V}",
        f"@tiptap/pm@{_V}",
        f"@tiptap/starter-kit@{_V}",
        f"@tiptap/extension-placeholder@{_V}",
        f"@tiptap/extension-underline@{_V}",
        f"@tiptap/extension-link@{_V}",
        f"@tiptap/extension-image@{_V}",
        f"@tiptap/extension-highlight@{_V}",
        f"@tiptap/extension-task-list@{_V}",
        f"@tiptap/extension-task-item@{_V}",
        f"@tiptap/extension-text-style@{_V}",
        f"@tiptap/extension-text-align@{_V}",
        f"@tiptap/extension-table@{_V}",
    ]

    content: rx.Var[str] = "<p></p>"
    revision: rx.Var[int] = 0
    placeholder: rx.Var[str] = "输入 / 或点击左侧 + 插入"
    editable: rx.Var[bool] = True
    editor_width: rx.Var[str] = "100%"
    editor_height: rx.Var[str] = "70vh"

    on_change: rx.EventHandler[lambda html: [html]]
    on_json_change: rx.EventHandler[lambda doc: [doc]]
    on_image_paste: rx.EventHandler[lambda src, mime: [src, mime]]

    @classmethod
    def create(cls, *children, **props):
        if "width" in props and "editor_width" not in props:
            props["editor_width"] = props.pop("width")
        if "height" in props and "editor_height" not in props:
            props["editor_height"] = props.pop("height")
        props.setdefault("editor_width", "100%")
        props.setdefault("editor_height", "70vh")
        props.setdefault("content", "<p></p>")
        props.setdefault("revision", 0)
        props.setdefault("editable", True)
        props.setdefault("placeholder", "输入 / 或点击左侧 + 插入")
        return super().create(*children, **props)


doc_edit = DocEdit.create

__all__ = ["DocEdit", "doc_edit"]
