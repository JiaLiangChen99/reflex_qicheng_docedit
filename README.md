# reflex-qicheng-docedit

飞书风块文档编辑器，自用 Reflex 组件包（作者：qicheng）。底层基于 [TipTap](https://tiptap.dev) 实现。

## 安装 / 运行 demo

```bash
pip install -e .
reflex run
```

## 使用

```python
import reflex as rx
from reflex_qicheng_docedit import doc_edit


class State(rx.State):
    content: str = "<p></p>"
    revision: int = 0

    @rx.event
    def on_change(self, html: str):
        self.content = html  # 日常编辑不要改 revision


def index():
    return doc_edit(
        content=State.content,
        revision=State.revision,
        on_change=State.on_change,
        height="70vh",
    )


app = rx.App()
app.add_page(index)
```

仅在需要从 Python 强制重载编辑器内容时，才递增 `revision`。

## 包结构

```
reflex_qicheng_docedit/
  editor.jsx              # 编辑器入口
  panels/
    insertMenu.jsx        # 「+」/「/」边栏
    blockGutter.jsx       # 块边栏（拖拽 / 高亮）
    selectionToolbar.jsx  # 选区浮动工具栏
    basic.jsx             # 基础插入
    table.jsx             # 表格
    task.jsx              # 任务
    media.jsx             # 图片 / 视频
    imageExt.jsx          # 图片节点扩展
    highlightBlockExt.jsx # 高亮块
    shared.jsx            # 共用组件
```
