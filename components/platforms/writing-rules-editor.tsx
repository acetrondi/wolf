"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type BrandPlatformGuidance, normalizeJson } from "@wolf/contracts";
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, QuoteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type RulesDocument = NonNullable<BrandPlatformGuidance["writingRules"]>;

type Props = {
  value: RulesDocument | null;
  onChange: (value: RulesDocument) => void;
  supportsTitle: boolean;
  supportsSubtitle: boolean;
};

export function createWritingRulesTemplate({
  supportsTitle,
  supportsSubtitle,
}: Pick<Props, "supportsTitle" | "supportsSubtitle">): RulesDocument {
  const content: unknown[] = [];
  if (supportsTitle) {
    content.push(
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Title" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Define your rule" }] },
    );
  }
  if (supportsSubtitle) {
    content.push(
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Subtitle" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Define your rule" }] },
    );
  }
  content.push(
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Body" }] },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Define how this should read" }],
    },
  );
  return { type: "doc", content };
}

export function WritingRulesEditor({
  value,
  onChange,
  supportsTitle,
  supportsSubtitle,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: (value ??
      createWritingRulesTemplate({ supportsTitle, supportsSubtitle })) as never,
    editorProps: {
      attributes: {
        class:
          "min-h-72 px-5 py-4 text-sm leading-7 text-foreground outline-none [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1:first-child]:mt-0 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      const normalized = normalizeJson(nextEditor.getJSON());
      if (
        typeof normalized === "object" &&
        normalized !== null &&
        !Array.isArray(normalized) &&
        normalized.type === "doc"
      ) {
        onChange(normalized as RulesDocument);
      }
    },
  });

  if (!editor) return null;

  const controls = [
    {
      label: "Bold",
      icon: BoldIcon,
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: ItalicIcon,
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Bulleted list",
      icon: ListIcon,
      active: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrderedIcon,
      active: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: QuoteIcon,
      active: editor.isActive("blockquote"),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-input bg-background shadow-xs">
      <div className="flex items-center gap-1 border-b border-border bg-muted/30 p-2">
        {controls.map(({ label, icon: Icon, active, run }) => (
          <Button
            key={label}
            type="button"
            size="icon-sm"
            variant={active ? "secondary" : "ghost"}
            aria-label={label}
            onClick={run}
          >
            <Icon className="size-4" />
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
