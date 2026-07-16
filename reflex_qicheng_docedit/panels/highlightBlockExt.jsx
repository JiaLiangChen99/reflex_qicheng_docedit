/**
 * 飞书风格高亮块（Callout）
 */
import { Node, mergeAttributes } from "@tiptap/core";

export const HIGHLIGHT_DEFAULTS = {
  emoji: "✏️",
  fillColor: "#fff7ed",
  borderColor: "#ff8800",
  textColor: null,
};

function applyBlockStyles(dom, attrs) {
  dom.style.background = attrs.fillColor || HIGHLIGHT_DEFAULTS.fillColor;
  dom.style.borderColor = attrs.borderColor || HIGHLIGHT_DEFAULTS.borderColor;
  dom.style.borderWidth = "1px";
  dom.style.borderStyle = "solid";
  dom.style.borderRadius = "8px";
  dom.style.padding = "12px 14px";
  dom.style.display = "flex";
  dom.style.gap = "10px";
  dom.style.alignItems = "flex-start";
  dom.style.boxSizing = "border-box";
  dom.style.maxWidth = "100%";
  dom.style.width = "100%";
  const content = dom.querySelector("[data-highlight-content]");
  if (content) {
    content.style.color = attrs.textColor || "";
  }
}

export const HighlightBlock = Node.create({
  name: "highlightBlock",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      emoji: {
        default: HIGHLIGHT_DEFAULTS.emoji,
        parseHTML: (el) => el.getAttribute("data-emoji") || HIGHLIGHT_DEFAULTS.emoji,
        renderHTML: (attrs) => ({ "data-emoji": attrs.emoji || HIGHLIGHT_DEFAULTS.emoji }),
      },
      fillColor: {
        default: HIGHLIGHT_DEFAULTS.fillColor,
        parseHTML: (el) =>
          el.getAttribute("data-fill-color") || HIGHLIGHT_DEFAULTS.fillColor,
        renderHTML: (attrs) => ({
          "data-fill-color": attrs.fillColor || HIGHLIGHT_DEFAULTS.fillColor,
        }),
      },
      borderColor: {
        default: HIGHLIGHT_DEFAULTS.borderColor,
        parseHTML: (el) =>
          el.getAttribute("data-border-color") || HIGHLIGHT_DEFAULTS.borderColor,
        renderHTML: (attrs) => ({
          "data-border-color": attrs.borderColor || HIGHLIGHT_DEFAULTS.borderColor,
        }),
      },
      textColor: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-text-color") || null,
        renderHTML: (attrs) =>
          attrs.textColor ? { "data-text-color": attrs.textColor } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-highlight-block=""]' }, { tag: "div[data-highlight-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-highlight-block": "" }),
      0,
    ];
  },

  addNodeView() {
    if (typeof document === "undefined") return null;
    const editor = this.editor;

    return ({ node, HTMLAttributes, getPos }) => {
      const dom = document.createElement("div");
      dom.dataset.highlightBlock = "";
      Object.entries(HTMLAttributes).forEach(([k, v]) => {
        if (v != null) dom.setAttribute(k, String(v));
      });

      const icon = document.createElement("div");
      icon.dataset.highlightIcon = "";
      icon.contentEditable = "false";
      icon.textContent = node.attrs.emoji || HIGHLIGHT_DEFAULTS.emoji;
      icon.style.flexShrink = "0";
      icon.style.fontSize = "20px";
      icon.style.lineHeight = "1.5";
      icon.style.cursor = editor.isEditable ? "pointer" : "default";
      icon.title = "点击更换图标";
      icon.addEventListener("mousedown", (e) => e.preventDefault());
      icon.addEventListener("click", () => {
        if (!editor.isEditable) return;
        const next = window.prompt("图标（emoji）", icon.textContent || "✏️");
        if (next == null) return;
        const pos = getPos();
        if (typeof pos !== "number") return;
        editor
          .chain()
          .focus()
          .updateAttributes("highlightBlock", {
            emoji: next.trim() || HIGHLIGHT_DEFAULTS.emoji,
          })
          .run();
      });

      const content = document.createElement("div");
      content.dataset.highlightContent = "";
      content.style.flex = "1";
      content.style.minWidth = "0";

      dom.appendChild(icon);
      dom.appendChild(content);
      applyBlockStyles(dom, node.attrs);

      let current = node;

      return {
        dom,
        contentDOM: content,
        update(updatedNode) {
          if (updatedNode.type.name !== "highlightBlock") return false;
          if (updatedNode.attrs.emoji !== current.attrs.emoji) {
            icon.textContent = updatedNode.attrs.emoji || HIGHLIGHT_DEFAULTS.emoji;
          }
          applyBlockStyles(dom, updatedNode.attrs);
          current = updatedNode;
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertHighlightBlock:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: { ...HIGHLIGHT_DEFAULTS },
              content: [{ type: "paragraph" }],
            })
            .run(),
    };
  },
});

/** Cursor or selection is inside a highlight block. */
export function isInHighlightBlock(editor) {
  if (!editor) return false;
  return editor.isActive("highlightBlock");
}

/** Find highlight block DOM rect for floating toolbar. */
export function getHighlightBlockRect(editor) {
  if (!editor || !isInHighlightBlock(editor)) return null;
  try {
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d > 0; d -= 1) {
      if ($from.node(d).type.name === "highlightBlock") {
        const pos = $from.before(d);
        let dom = editor.view.nodeDOM(pos);
        if (dom?.closest) {
          const block = dom.closest("[data-highlight-block]");
          if (block) dom = block;
        }
        if (dom?.getBoundingClientRect) {
          const r = dom.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            right: r.right,
            midX: (r.left + r.right) / 2,
          };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}
