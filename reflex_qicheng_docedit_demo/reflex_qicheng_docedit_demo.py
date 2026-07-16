"""Demo: reflex_qicheng_docedit."""

from __future__ import annotations

from typing import Any

import reflex as rx

from reflex_qicheng_docedit import doc_edit

SAMPLE = """
<h1>crm功能文档</h1>
<p></p>
<table>
  <tbody>
    <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
    <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
    <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
  </tbody>
</table>
<h2>工作流程</h2>
<p>把光标放在空行左侧点「+」，或输入「/」插入表格与样式。</p>
<p></p>
""".strip()


class State(rx.State):
    content: str = SAMPLE
    revision: int = 0

    @rx.event
    def on_change(self, html: str):
        self.content = html

    @rx.event
    def on_json(self, doc: dict[str, Any]):
        print(doc)

    @rx.event
    def reload(self):
        self.content = SAMPLE
        self.revision += 1


def index() -> rx.Component:
    return rx.el.div(
        rx.el.p(
            "reflex_qicheng_docedit：无顶栏 · 左侧+插入 · 选中出格式条 · 表内插行/列",
            class_name="text-sm text-gray-500 mb-3",
        ),
        rx.el.button(
            "重置示例",
            on_click=State.reload,
            class_name="text-sm px-3 py-1.5 border rounded mb-4",
        ),
        doc_edit(
            content=State.content,
            revision=State.revision,
            on_change=State.on_change,
            on_json_change=State.on_json,
            height="80vh",
        ),
        class_name="max-w-3xl mx-auto px-4 py-6 bg-white min-h-screen",
    )


app = rx.App()
app.add_page(index)
