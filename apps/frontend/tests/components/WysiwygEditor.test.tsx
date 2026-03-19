import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin } from "@tiptap/pm/state";
import { Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { describe, expect, it, vi } from "vitest";
import { WysiwygEditor } from "@/shared/components/data/WysiwygEditor";

/**
 * Helper: renders the editor and waits for Tiptap to initialize.
 * Returns the onChange spy and a helper to get toolbar buttons by title.
 */
function renderEditor(initialValue = "") {
  const onChangeSpy = vi.fn<(v: string) => void>();
  const result = render(
    <WysiwygEditor value={initialValue} onChange={onChangeSpy} />,
  );

  const getToolbarButton = (label: string) => screen.getByTitle(label);

  return { onChangeSpy, getToolbarButton, ...result };
}

/**
 * Waits for the editor's ProseMirror contenteditable to appear.
 */
function waitForEditor() {
  return waitFor(() => {
    const el = document.querySelector('[contenteditable="true"]');
    expect(el).not.toBeNull();
    return el as HTMLElement;
  });
}

/**
 * Gets the latest markdown value from the onChange spy.
 */
function latestMarkdown(spy: ReturnType<typeof vi.fn>): string {
  const calls = spy.mock.calls;
  if (calls.length === 0) return "";
  return calls[calls.length - 1][0] as string;
}

// ─── Direct Tiptap editor helpers (no React) ────────────────────────────────

/**
 * Reproduces the exact same extension stack as the WysiwygEditor component.
 * This includes CleanupEmptyHeadings to match production behavior.
 */
const CleanupEmptyHeadings = Extension.create({
  name: "cleanupEmptyHeadings",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const { doc } = newState;
          const tr = newState.tr;
          let changed = false;
          let offset = 0;
          for (let i = 0; i < doc.childCount; i++) {
            const node = doc.child(i);
            if (
              node.type.name === "heading" &&
              node.textContent === "" &&
              node.childCount === 0
            ) {
              tr.setNodeMarkup(offset, newState.schema.nodes.paragraph);
              changed = true;
            }
            offset += node.nodeSize;
          }
          return changed ? tr : null;
        },
      }),
    ];
  },
});

function createEditor(content = "") {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      CleanupEmptyHeadings,
      Placeholder.configure({ placeholder: "test" }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
  });
}

function getEditorMarkdown(editor: Editor): string {
  // biome-ignore lint/suspicious/noExplicitAny: tiptap-markdown storage type
  return (editor.storage as any).markdown.getMarkdown();
}

/** Returns the count of top-level block nodes in the editor. */
function nodeCount(editor: Editor): number {
  return editor.getJSON().content?.length ?? 0;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("WysiwygEditor", () => {
  describe("rendering", () => {
    it("should render the editor with toolbar buttons", async () => {
      renderEditor();
      await waitForEditor();

      expect(screen.getByTitle("Bold")).toBeInTheDocument();
      expect(screen.getByTitle("Italic")).toBeInTheDocument();
      expect(screen.getByTitle("Strikethrough")).toBeInTheDocument();
      expect(screen.getByTitle("Heading 1")).toBeInTheDocument();
      expect(screen.getByTitle("Heading 2")).toBeInTheDocument();
      expect(screen.getByTitle("Heading 3")).toBeInTheDocument();
      expect(screen.getByTitle("Bullet list")).toBeInTheDocument();
      expect(screen.getByTitle("Numbered list")).toBeInTheDocument();
      expect(screen.getByTitle("Blockquote")).toBeInTheDocument();
      expect(screen.getByTitle("Undo")).toBeInTheDocument();
      expect(screen.getByTitle("Redo")).toBeInTheDocument();
    });

    it("should render initial markdown content", async () => {
      renderEditor("# Hello World");
      const editorEl = await waitForEditor();

      await waitFor(() => {
        expect(editorEl.innerHTML).toContain("Hello World");
      });
    });
  });

  // ─── Inline formatting ──────────────────────────────────────────────────

  describe("inline formatting", () => {
    it("should output bold markdown when Bold is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "hello");
      await user.keyboard("{Control>}a{/Control}");
      await user.click(getToolbarButton("Bold"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("**hello**");
      });
    });

    it("should output italic markdown when Italic is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "hello");
      await user.keyboard("{Control>}a{/Control}");
      await user.click(getToolbarButton("Italic"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("*hello*");
      });
    });

    it("should output strikethrough markdown when Strikethrough is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "hello");
      await user.keyboard("{Control>}a{/Control}");
      await user.click(getToolbarButton("Strikethrough"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("~~hello~~");
      });
    });
  });

  // ─── Headings ───────────────────────────────────────────────────────────

  describe("headings", () => {
    it("should output H1 markdown when Heading 1 is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "My Title");
      await user.click(getToolbarButton("Heading 1"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("# My Title");
      });
    });

    it("should output H2 markdown when Heading 2 is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "My Subtitle");
      await user.click(getToolbarButton("Heading 2"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("## My Subtitle");
      });
    });

    it("should output H3 markdown when Heading 3 is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "Section");
      await user.click(getToolbarButton("Heading 3"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("### Section");
      });
    });

    it("should toggle heading off when clicked again", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "Title");

      // Toggle H1 on
      await user.click(getToolbarButton("Heading 1"));
      await waitFor(() => {
        expect(latestMarkdown(onChangeSpy)).toContain("# Title");
      });

      // Toggle H1 off
      await user.click(getToolbarButton("Heading 1"));
      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).not.toContain("#");
        expect(md).toContain("Title");
      });
    });
  });

  // ─── Lists ──────────────────────────────────────────────────────────────

  describe("lists", () => {
    it("should output bullet list markdown when Bullet list is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "item one");
      await user.click(getToolbarButton("Bullet list"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toMatch(/^[-*+] item one/m);
      });
    });

    it("should output ordered list markdown when Numbered list is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "first item");
      await user.click(getToolbarButton("Numbered list"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toMatch(/^1\. first item/m);
      });
    });
  });

  // ─── Blockquote ─────────────────────────────────────────────────────────

  describe("blockquote", () => {
    it("should output blockquote markdown when Blockquote is clicked", async () => {
      const user = userEvent.setup();
      const { onChangeSpy, getToolbarButton } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "a quote");
      await user.click(getToolbarButton("Blockquote"));

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("> a quote");
      });
    });
  });

  // ─── External value sync ───────────────────────────────────────────────

  describe("external value sync", () => {
    it("should update editor content when value prop changes externally", async () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <WysiwygEditor value="initial" onChange={onChange} />,
      );
      await waitForEditor();

      rerender(
        <WysiwygEditor value="## Updated heading" onChange={onChange} />,
      );

      const editorEl = document.querySelector(
        '[contenteditable="true"]',
      ) as HTMLElement;

      await waitFor(() => {
        expect(editorEl.innerHTML).toContain("Updated heading");
      });
    });
  });

  // ─── Direct Tiptap editor tests ────────────────────────────────────────

  describe("tiptap editor direct (no React)", () => {
    // ── Markdown serialization ──────────────────────────────────────────

    it("should parse markdown input and serialize back correctly", () => {
      const editor = createEditor("Hello");
      const md = getEditorMarkdown(editor);
      expect(md.trim()).toBe("Hello");
      editor.destroy();
    });

    it("should serialize H1 to markdown after toggleHeading", () => {
      const editor = createEditor("Hello");
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level: 1 });
      expect(getEditorMarkdown(editor)).toContain("# Hello");
      editor.destroy();
    });

    it("should serialize H2 to markdown after toggleHeading", () => {
      const editor = createEditor("Hello");
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level: 2 });
      expect(getEditorMarkdown(editor)).toContain("## Hello");
      editor.destroy();
    });

    it("should serialize H3 to markdown after toggleHeading", () => {
      const editor = createEditor("Hello");
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level: 3 });
      expect(getEditorMarkdown(editor)).toContain("### Hello");
      editor.destroy();
    });

    // ── Markdown round-trip ─────────────────────────────────────────────

    it("should round-trip heading: markdown → editor → markdown", () => {
      const input = "# My Title";
      const editor = createEditor(input);
      expect(getEditorMarkdown(editor).trim()).toBe(input);
      editor.destroy();
    });

    it("should round-trip H2: markdown → editor → markdown", () => {
      const input = "## Subtitle";
      const editor = createEditor(input);
      expect(getEditorMarkdown(editor).trim()).toBe(input);
      editor.destroy();
    });

    it("should preserve heading after setContent round-trip", () => {
      const editor = createEditor("Text");
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level: 1 });
      const md1 = getEditorMarkdown(editor);
      expect(md1).toContain("# Text");

      editor.commands.setContent(md1);
      expect(getEditorMarkdown(editor)).toContain("# Text");
      editor.destroy();
    });

    it("should not lose heading when markdown is fed back via setContent", () => {
      const editor = createEditor("Hello World");
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level: 1 });
      const md = getEditorMarkdown(editor);
      editor.destroy();

      const editor2 = createEditor(md);
      expect(getEditorMarkdown(editor2).trim()).toBe(md.trim());
      editor2.destroy();
    });

    it("should handle bold markdown correctly", () => {
      const editor = createEditor("Hello");
      editor.commands.selectAll();
      editor.commands.toggleBold();
      expect(getEditorMarkdown(editor)).toContain("**Hello**");
      editor.destroy();
    });

    it("markdown comparison should be stable (no phantom diffs)", () => {
      const editor = createEditor("Some text");
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level: 1 });
      const md1 = getEditorMarkdown(editor);
      const md2 = getEditorMarkdown(editor);
      expect(md1).toBe(md2);
      editor.destroy();
    });

    it("setContent should properly parse markdown heading", () => {
      const editor = createEditor("");
      editor.commands.setContent("# Hello World");
      expect(getEditorMarkdown(editor).trim()).toBe("# Hello World");

      const firstNode = editor.getJSON().content?.[0];
      expect(firstNode?.type).toBe("heading");
      expect(firstNode?.attrs?.level).toBe(1);
      editor.destroy();
    });

    it("setContent should properly parse complex markdown", () => {
      const editor = createEditor("");
      editor.commands.setContent(
        "## Subtitle\n\nSome **bold** text\n\n- item 1\n- item 2",
      );
      const md = getEditorMarkdown(editor);
      expect(md).toContain("## Subtitle");
      expect(md).toContain("**bold**");
      editor.destroy();
    });

    it("setContent with heading markdown should NOT produce a phantom diff", () => {
      const editor = createEditor("Hello");
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level: 1 });
      const mdAfterToggle = getEditorMarkdown(editor);

      editor.commands.setContent(mdAfterToggle);
      expect(getEditorMarkdown(editor)).toBe(mdAfterToggle);
      editor.destroy();
    });

    it("getMarkdown before and after setContent should be identical", () => {
      const editor = createEditor("Test paragraph");
      editor.commands.selectAll();
      editor.commands.toggleHeading({ level: 2 });
      const md1 = getEditorMarkdown(editor);
      const currentMd = getEditorMarkdown(editor);
      expect(md1 !== currentMd).toBe(false);
      editor.destroy();
    });

    // ── DOM output verification ─────────────────────────────────────────

    describe("DOM output for each formatting tool", () => {
      it("H1 produces <h1> element", () => {
        const editor = createEditor("Title");
        editor.commands.toggleHeading({ level: 1 });
        expect(editor.getHTML()).toContain("<h1>Title</h1>");
        editor.destroy();
      });

      it("H2 produces <h2> element", () => {
        const editor = createEditor("Subtitle");
        editor.commands.toggleHeading({ level: 2 });
        expect(editor.getHTML()).toContain("<h2>Subtitle</h2>");
        editor.destroy();
      });

      it("H3 produces <h3> element", () => {
        const editor = createEditor("Section");
        editor.commands.toggleHeading({ level: 3 });
        expect(editor.getHTML()).toContain("<h3>Section</h3>");
        editor.destroy();
      });

      it("Bold produces <strong> element", () => {
        const editor = createEditor("bold text");
        editor.commands.selectAll();
        editor.commands.toggleBold();
        expect(editor.getHTML()).toContain("<strong>bold text</strong>");
        editor.destroy();
      });

      it("Italic produces <em> element", () => {
        const editor = createEditor("italic text");
        editor.commands.selectAll();
        editor.commands.toggleItalic();
        expect(editor.getHTML()).toContain("<em>italic text</em>");
        editor.destroy();
      });

      it("Strike produces <s> element", () => {
        const editor = createEditor("struck text");
        editor.commands.selectAll();
        editor.commands.toggleStrike();
        expect(editor.getHTML()).toContain("<s>struck text</s>");
        editor.destroy();
      });

      it("Bullet list produces <ul><li> elements", () => {
        const editor = createEditor("item text");
        editor.commands.toggleBulletList();
        const html = editor.getHTML();
        expect(html).toContain("<ul");
        expect(html).toContain("<li>");
        expect(html).toContain("item text");
        editor.destroy();
      });

      it("Ordered list produces <ol><li> elements", () => {
        const editor = createEditor("item text");
        editor.commands.toggleOrderedList();
        const html = editor.getHTML();
        expect(html).toContain("<ol");
        expect(html).toContain("<li>");
        expect(html).toContain("item text");
        editor.destroy();
      });

      it("Blockquote produces <blockquote> element", () => {
        const editor = createEditor("quote text");
        editor.commands.toggleBlockquote();
        const html = editor.getHTML();
        expect(html).toContain("<blockquote>");
        expect(html).toContain("quote text");
        editor.destroy();
      });
    });

    // ── Markdown output verification ────────────────────────────────────

    describe("markdown output for each formatting tool", () => {
      it("Bullet list outputs markdown list", () => {
        const editor = createEditor("item one");
        editor.commands.toggleBulletList();
        expect(getEditorMarkdown(editor)).toMatch(/^[-*+] item one/m);
        editor.destroy();
      });

      it("Ordered list outputs numbered markdown list", () => {
        const editor = createEditor("first item");
        editor.commands.toggleOrderedList();
        expect(getEditorMarkdown(editor)).toMatch(/^1\. first item/m);
        editor.destroy();
      });

      it("Blockquote outputs markdown blockquote", () => {
        const editor = createEditor("wise words");
        editor.commands.toggleBlockquote();
        expect(getEditorMarkdown(editor)).toContain("> wise words");
        editor.destroy();
      });

      it("Italic outputs markdown italic", () => {
        const editor = createEditor("emphasis");
        editor.commands.selectAll();
        editor.commands.toggleItalic();
        expect(getEditorMarkdown(editor)).toContain("*emphasis*");
        editor.destroy();
      });

      it("Strikethrough outputs markdown strikethrough", () => {
        const editor = createEditor("removed");
        editor.commands.selectAll();
        editor.commands.toggleStrike();
        expect(getEditorMarkdown(editor)).toContain("~~removed~~");
        editor.destroy();
      });
    });

    // ── Toggle behavior ─────────────────────────────────────────────────

    describe("toggle behavior", () => {
      it("H1 toggles off back to paragraph", () => {
        const editor = createEditor("Title");
        editor.commands.toggleHeading({ level: 1 });
        expect(editor.getHTML()).toContain("<h1>");

        editor.commands.toggleHeading({ level: 1 });
        expect(editor.getHTML()).not.toContain("<h1>");
        expect(editor.getHTML()).toContain("<p>");
        editor.destroy();
      });

      it("Bullet list toggles off back to paragraph", () => {
        const editor = createEditor("item");
        editor.commands.toggleBulletList();
        expect(editor.getHTML()).toContain("<ul");

        editor.commands.toggleBulletList();
        expect(editor.getHTML()).not.toContain("<ul");
        expect(editor.getHTML()).toContain("<p>");
        editor.destroy();
      });

      it("Ordered list toggles off back to paragraph", () => {
        const editor = createEditor("item");
        editor.commands.toggleOrderedList();
        expect(editor.getHTML()).toContain("<ol");

        editor.commands.toggleOrderedList();
        expect(editor.getHTML()).not.toContain("<ol");
        expect(editor.getHTML()).toContain("<p>");
        editor.destroy();
      });

      it("Blockquote toggles off back to paragraph", () => {
        const editor = createEditor("quote");
        editor.commands.toggleBlockquote();
        expect(editor.getHTML()).toContain("<blockquote>");

        editor.commands.toggleBlockquote();
        expect(editor.getHTML()).not.toContain("<blockquote>");
        expect(editor.getHTML()).toContain("<p>");
        editor.destroy();
      });

      it("Bold toggles off back to plain text", () => {
        const editor = createEditor("text");
        editor.commands.selectAll();
        editor.commands.toggleBold();
        expect(editor.getHTML()).toContain("<strong>");

        editor.commands.selectAll();
        editor.commands.toggleBold();
        expect(editor.getHTML()).not.toContain("<strong>");
        editor.destroy();
      });

      it("Switching heading levels replaces previous level", () => {
        const editor = createEditor("Title");
        editor.commands.toggleHeading({ level: 1 });
        expect(editor.getHTML()).toContain("<h1>");

        editor.commands.toggleHeading({ level: 2 });
        expect(editor.getHTML()).toContain("<h2>");
        expect(editor.getHTML()).not.toContain("<h1>");
        editor.destroy();
      });
    });

    // ── Idempotency: repeated clicks must NOT create extra nodes ────────

    describe("idempotency (no extra nodes on repeated operations)", () => {
      it("toggling H1 without selectAll should not accumulate nodes", () => {
        const editor = createEditor("Hello");

        for (let i = 0; i < 6; i++) {
          editor.commands.toggleHeading({ level: 1 });
          // Max 2 nodes: the content block + ProseMirror trailing paragraph
          expect(nodeCount(editor)).toBeLessThanOrEqual(2);
        }

        editor.destroy();
      });

      it("toggling H1 with selectAll should not accumulate nodes", () => {
        const editor = createEditor("Hello");

        for (let i = 0; i < 6; i++) {
          editor.commands.selectAll();
          editor.commands.toggleHeading({ level: 1 });
          // CleanupEmptyHeadings prevents accumulation
          expect(nodeCount(editor)).toBeLessThanOrEqual(2);
        }

        editor.destroy();
      });

      it("toggling H2 with selectAll should not accumulate nodes", () => {
        const editor = createEditor("Hello");

        for (let i = 0; i < 6; i++) {
          editor.commands.selectAll();
          editor.commands.toggleHeading({ level: 2 });
          expect(nodeCount(editor)).toBeLessThanOrEqual(2);
        }

        editor.destroy();
      });

      it("toggling bullet list should not accumulate nodes", () => {
        const editor = createEditor("Hello");

        for (let i = 0; i < 4; i++) {
          editor.commands.toggleBulletList();
          // List wraps content in bulletList>listItem>paragraph, + trailing p
          expect(nodeCount(editor)).toBeLessThanOrEqual(2);
        }

        editor.destroy();
      });

      it("toggling ordered list should not accumulate nodes", () => {
        const editor = createEditor("Hello");

        for (let i = 0; i < 4; i++) {
          editor.commands.toggleOrderedList();
          expect(nodeCount(editor)).toBeLessThanOrEqual(2);
        }

        editor.destroy();
      });

      it("toggling blockquote should not accumulate nodes", () => {
        const editor = createEditor("Hello");

        for (let i = 0; i < 4; i++) {
          editor.commands.toggleBlockquote();
          expect(nodeCount(editor)).toBeLessThanOrEqual(2);
        }

        editor.destroy();
      });

      it("chain().focus().toggleHeading should not accumulate nodes", () => {
        const editor = createEditor("Hello");

        for (let i = 0; i < 6; i++) {
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          expect(nodeCount(editor)).toBeLessThanOrEqual(2);
        }

        editor.destroy();
      });

      it("markdown should be clean after repeated heading toggles", () => {
        const editor = createEditor("Hello");

        for (let i = 0; i < 6; i++) {
          editor.commands.selectAll();
          editor.commands.toggleHeading({ level: 1 });
        }

        const md = getEditorMarkdown(editor);
        // Should only contain "# Hello" — no extra blank lines or content
        expect(md.trim()).toBe("# Hello");
        editor.destroy();
      });
    });
  });

  // ─── Enter key behavior in headings ────────────────────────────────────

  describe("Enter key behavior in headings", () => {
    it("should create paragraph (not heading) when pressing Enter at end of heading", async () => {
      const user = userEvent.setup();
      const { onChangeSpy } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "Title");
      await user.click(screen.getByTitle("Heading 1"));

      await waitFor(() => {
        expect(latestMarkdown(onChangeSpy)).toContain("# Title");
      });

      await user.keyboard("{Enter}");
      await user.type(editorEl, "body text");

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("# Title");
        expect(md).toContain("body text");
        expect(md).not.toContain("# body text");
        expect(md).not.toMatch(/^# .*body text/m);
      });
    });

    it("should convert empty heading to paragraph when pressing Enter", async () => {
      const user = userEvent.setup();
      const { onChangeSpy } = renderEditor();
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "Title");
      await user.click(screen.getByTitle("Heading 1"));

      await waitFor(() => {
        expect(latestMarkdown(onChangeSpy)).toContain("# Title");
      });

      await user.keyboard("{Enter}");
      await user.type(editorEl, "normal paragraph");

      await waitFor(() => {
        const md = latestMarkdown(onChangeSpy);
        expect(md).toContain("# Title");
        expect(md).toContain("normal paragraph");
        expect(md).not.toContain("# normal paragraph");
      });
    });
  });

  // ─── Markdown round-trip stability ─────────────────────────────────────

  describe("markdown round-trip stability", () => {
    it("should preserve heading after toolbar click without resetting", async () => {
      const user = userEvent.setup();
      let currentValue = "";
      const onChange = vi.fn<(v: string) => void>().mockImplementation((v) => {
        currentValue = v;
      });

      const { rerender } = render(
        <WysiwygEditor value={currentValue} onChange={onChange} />,
      );
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "My Title");
      await user.click(screen.getByTitle("Heading 1"));

      await waitFor(() => {
        expect(latestMarkdown(onChange)).toContain("# My Title");
      });

      currentValue = latestMarkdown(onChange);
      rerender(<WysiwygEditor value={currentValue} onChange={onChange} />);

      await waitFor(() => {
        const editorContent = document.querySelector(
          '[contenteditable="true"]',
        ) as HTMLElement;
        const h1 = editorContent.querySelector("h1");
        expect(h1).not.toBeNull();
        expect(h1?.textContent).toContain("My Title");
      });
    });

    it("should preserve bold after toolbar click and re-render", async () => {
      const user = userEvent.setup();
      let currentValue = "";
      const onChange = vi.fn<(v: string) => void>().mockImplementation((v) => {
        currentValue = v;
      });

      const { rerender } = render(
        <WysiwygEditor value={currentValue} onChange={onChange} />,
      );
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "bold text");
      await user.keyboard("{Control>}a{/Control}");
      await user.click(screen.getByTitle("Bold"));

      await waitFor(() => {
        expect(latestMarkdown(onChange)).toContain("**bold text**");
      });

      currentValue = latestMarkdown(onChange);
      rerender(<WysiwygEditor value={currentValue} onChange={onChange} />);

      await waitFor(() => {
        const editorContent = document.querySelector(
          '[contenteditable="true"]',
        ) as HTMLElement;
        expect(editorContent.querySelector("strong")).not.toBeNull();
      });
    });

    it("should preserve heading after multiple rapid re-renders", async () => {
      const user = userEvent.setup();
      let currentValue = "";
      const onChange = vi.fn<(v: string) => void>().mockImplementation((v) => {
        currentValue = v;
      });

      const { rerender } = render(
        <WysiwygEditor value={currentValue} onChange={onChange} />,
      );
      const editorEl = await waitForEditor();

      await user.click(editorEl);
      await user.type(editorEl, "Heading Test");
      await user.click(screen.getByTitle("Heading 1"));

      await waitFor(() => {
        expect(latestMarkdown(onChange)).toContain("# Heading Test");
      });

      currentValue = latestMarkdown(onChange);
      rerender(<WysiwygEditor value={currentValue} onChange={onChange} />);
      rerender(<WysiwygEditor value={currentValue} onChange={onChange} />);
      rerender(<WysiwygEditor value={currentValue} onChange={onChange} />);

      await waitFor(() => {
        const editorContent = document.querySelector(
          '[contenteditable="true"]',
        ) as HTMLElement;
        const h1 = editorContent.querySelector("h1");
        expect(h1).not.toBeNull();
        expect(h1?.textContent).toContain("Heading Test");
      });
    });

    it("should accept external value update (e.g., initial data load)", async () => {
      const onChange = vi.fn();

      const { rerender } = render(
        <WysiwygEditor value="" onChange={onChange} />,
      );
      await waitForEditor();

      rerender(<WysiwygEditor value="# Company Prompt" onChange={onChange} />);

      await waitFor(() => {
        const editorContent = document.querySelector(
          '[contenteditable="true"]',
        ) as HTMLElement;
        const h1 = editorContent.querySelector("h1");
        expect(h1).not.toBeNull();
        expect(h1?.textContent).toContain("Company Prompt");
      });
    });
  });
});
