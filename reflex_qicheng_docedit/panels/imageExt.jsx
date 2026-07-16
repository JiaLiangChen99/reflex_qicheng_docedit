/**
 * Feishu-style Image: align + caption, keeps TipTap resize handles.
 * Click always creates a NodeSelection so the image toolbar shows (not the text bar).
 */
import Image from "@tiptap/extension-image";
import { mergeAttributes, ResizableNodeView } from "@tiptap/core";

function applyAlign(dom, align) {
  const a = align || "center";
  dom.dataset.align = a;
  dom.style.display = "flex";
  dom.style.flexDirection = "column";
  dom.style.width = "100%";
  if (a === "left") dom.style.alignItems = "flex-start";
  else if (a === "right") dom.style.alignItems = "flex-end";
  else dom.style.alignItems = "center";
}

/**
 * Extended Image node with data-align / data-caption and a caption under the image.
 */
export const FeishuImage = Image.extend({
  name: "image",

  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align || "center" }),
      },
      caption: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-caption") || null,
        renderHTML: (attrs) =>
          attrs.caption ? { "data-caption": attrs.caption } : {},
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled) {
      return null;
    }
    if (typeof document === "undefined") return null;

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } =
      this.options.resize;
    const editor = this.editor;

    return ({ node, getPos, HTMLAttributes }) => {
      const el = document.createElement("img");
      el.draggable = false;

      const merged = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      Object.entries(merged).forEach(([key, value]) => {
        if (value == null) return;
        if (key === "width" || key === "height") return;
        if (key === "data-caption" || key === "caption") return;
        el.setAttribute(key, value);
      });
      if (merged.src != null) el.src = merged.src;

      const resizeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (typeof pos !== "number") return;
          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes("image", { width, height })
            .run();
        },
        onUpdate: (updatedNode) => updatedNode.type.name === "image",
        options: {
          directions,
          min: { width: minWidth, height: minHeight },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      // Column sized to the image so left/center/right alignment is visible.
      const shell = document.createElement("div");
      shell.dataset.imageShell = "";
      shell.style.display = "inline-flex";
      shell.style.flexDirection = "column";
      shell.style.maxWidth = "100%";
      shell.style.width = "fit-content";

      const resizeDom = resizeView.dom;
      resizeDom.style.width = "fit-content";
      resizeDom.style.maxWidth = "100%";
      shell.appendChild(resizeDom);

      const captionEl = document.createElement("div");
      captionEl.dataset.imageCaption = "";
      captionEl.contentEditable = "false";
      const syncCaption = (caption) => {
        const text = caption || "";
        captionEl.textContent = text;
        captionEl.style.display = text ? "block" : "none";
      };
      syncCaption(node.attrs.caption);
      shell.appendChild(captionEl);

      const outer = document.createElement("div");
      outer.dataset.imageBlock = "";
      applyAlign(outer, node.attrs.align);
      outer.style.maxWidth = "100%";
      outer.style.margin = "0.6em 0";
      outer.appendChild(shell);

      const selectThis = () => {
        const pos = getPos();
        if (typeof pos !== "number") return;
        if (!editor.isEditable) return;
        editor.chain().setNodeSelection(pos).run();
      };

      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        // Let resize handles do their own thing; still keep node selected.
        if (e.target?.closest?.("[data-resize-handle]")) {
          selectThis();
          return;
        }
        e.preventDefault();
        selectThis();
      };
      outer.addEventListener("mousedown", onMouseDown);

      resizeDom.style.visibility = "hidden";
      resizeDom.style.pointerEvents = "none";
      const reveal = () => {
        resizeDom.style.visibility = "";
        resizeDom.style.pointerEvents = "";
      };
      el.onload = reveal;
      if (el.complete && el.naturalWidth) reveal();

      let current = node;

      return {
        dom: outer,
        update: (updatedNode, decorations, inner) => {
          if (updatedNode.type.name !== "image") return false;
          const ok = resizeView.update(updatedNode, decorations, inner);
          if (ok === false) return false;

          if (updatedNode.attrs.src && updatedNode.attrs.src !== el.getAttribute("src")) {
            el.src = updatedNode.attrs.src;
          }
          if (updatedNode.attrs.width != null) {
            el.style.width = `${updatedNode.attrs.width}px`;
          }
          if (updatedNode.attrs.height != null) {
            el.style.height = `${updatedNode.attrs.height}px`;
          }
          if (updatedNode.attrs.align !== current.attrs.align) {
            applyAlign(outer, updatedNode.attrs.align);
          }
          if (updatedNode.attrs.caption !== current.attrs.caption) {
            syncCaption(updatedNode.attrs.caption);
          }
          current = updatedNode;
          return true;
        },
        selectNode: () => {
          outer.classList.add("ProseMirror-selectednode");
          resizeDom.classList.add("ProseMirror-selectednode");
        },
        deselectNode: () => {
          outer.classList.remove("ProseMirror-selectednode");
          resizeDom.classList.remove("ProseMirror-selectednode");
        },
        stopEvent: (event) => {
          // Allow interactive crop/caption UI outside; inside block, only stop handle drags from bubbling oddly.
          if (event.target?.closest?.("[data-resize-handle]")) return true;
          return false;
        },
        destroy: () => {
          outer.removeEventListener("mousedown", onMouseDown);
          resizeView.destroy?.();
        },
        ignoreMutation: (mutation) => {
          if (mutation.type === "selection") return false;
          return captionEl.contains(mutation.target);
        },
      };
    };
  },
});

/** True when the current selection is an image node. */
export function isImageNodeSelection(editor) {
  if (!editor) return false;
  const sel = editor.state.selection;
  if (sel.node?.type?.name === "image") return true;
  return editor.isActive("image");
}
