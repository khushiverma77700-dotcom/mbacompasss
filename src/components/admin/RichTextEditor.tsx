import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table as TipTapTable } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Image as ImageIcon,
  Table2, Highlighter, Undo, Redo, Quote, Code, Minus,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  RemoveFormatting, Type, Palette, RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/admin/FileUpload";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const FONT_SIZES = [
  { label: "10px", value: "10px" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "36px", value: "36px" },
  { label: "48px", value: "48px" },
];

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Verdana", value: "Verdana" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
  { label: "Impact", value: "Impact" },
  { label: "Comic Sans MS", value: "Comic Sans MS" },
];

const TEXT_COLORS = [
  { label: "Black", value: "#111827" },
  { label: "Grey", value: "#4b5563" },
  { label: "Blue", value: "#2563eb" },
  { label: "Sky", value: "#0284c7" },
  { label: "Green", value: "#15803d" },
  { label: "Amber", value: "#b45309" },
  { label: "Red", value: "#dc2626" },
  { label: "Magenta", value: "#be185d" },
];

type TextStyleAttribute = "fontSize" | "fontFamily" | "color";

const selectedStyleValue = (editor: NonNullable<ReturnType<typeof useEditor>>, attribute: TextStyleAttribute) => {
  const { from, to, empty } = editor.state.selection;
  if (empty) return (editor.getAttributes("textStyle")[attribute] as string | undefined) || "default";

  const values = new Set<string>();
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    const mark = node.marks.find((candidate) => candidate.type.name === "textStyle");
    values.add((mark?.attrs[attribute] as string | undefined) || "default");
  });
  return values.size === 1 ? Array.from(values)[0] : "mixed";
};

const RichTextEditor = ({ content, onChange, placeholder = "Start writing...", className }: RichTextEditorProps) => {
  const lastExternalContent = useRef(content);
  const imageAltId = useId();
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageError, setImageError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      Subscript,
      Superscript,
      TipTapTable.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-hidden min-h-[180px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== lastExternalContent.current) {
      lastExternalContent.current = content;
      const currentHTML = editor.getHTML();
      if (content !== currentHTML) {
        editor.commands.setContent(content || "");
      }
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  // Dropdowns take focus away from the editor; remember the text selection so the change lands on it.
  const savedSel = useRef<{ from: number; to: number } | null>(null);
  const rememberSelection = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    savedSel.current = { from, to };
  }, [editor]);
  const restored = useCallback(() => {
    if (!editor) return null;
    const c = editor.chain().focus();
    const sel = savedSel.current;
    const max = editor.state.doc.content.size;
    return sel ? c.setTextSelection({ from: Math.min(sel.from, max), to: Math.min(sel.to, max) }) : c;
  }, [editor]);
  const applyToSelection = useCallback((attrs: Record<string, string | null>) => {
    if (!editor) return;
    const { from, to } = savedSel.current ?? editor.state.selection;
    // No text selected: apply to the whole current paragraph/heading so the change is visible.
    const chain = from === to
      ? editor.chain().focus().setTextSelection({ from: editor.state.doc.resolve(from).start(), to: editor.state.doc.resolve(from).end() })
      : restored();
    chain?.setMark("textStyle", attrs).removeEmptyTextStyle().run();
  }, [editor, restored]);
  const setFontSize = useCallback((size: string) => {
    applyToSelection({ fontSize: size === "default" || size === "" ? null : size });
  }, [applyToSelection]);

  const setFontFamily = useCallback((family: string) => {
    applyToSelection({ fontFamily: family === "default" || family === "" ? null : family });
  }, [applyToSelection]);

  const setTextColor = useCallback((color: string) => {
    applyToSelection({ color: color === "default" || color === "" ? null : color });
  }, [applyToSelection]);

  const clearFormatting = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  }, [editor]);

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: activeEditor }) => activeEditor
      ? {
          fontSize: selectedStyleValue(activeEditor, "fontSize"),
          fontFamily: selectedStyleValue(activeEditor, "fontFamily"),
          color: selectedStyleValue(activeEditor, "color"),
        }
      : { fontSize: "default", fontFamily: "default", color: "default" },
  });

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={title}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick();
            }}
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-[0.25rem] transition-colors shrink-0",
              active
                ? "bg-primary text-primary-foreground shadow-xs"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {children}
          </Button>
        </TooltipTrigger>
        {title && <TooltipContent side="bottom" className="text-xs">{title}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );

  const Divider = () => <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />;

  return (
    <div className={cn("border border-input rounded-lg overflow-hidden flex flex-col", className)} style={{ maxHeight: "500px" }}>
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border shrink-0">
        {/* Row 1: Font family, font size, heading */}
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-b border-border/50">
          {/* Font Family */}
          <Select
            value={toolbarState?.fontFamily || "default"}
            onValueChange={setFontFamily}
          >
            <SelectTrigger onPointerDown={rememberSelection} onKeyDown={rememberSelection} className="h-7 w-[130px] text-xs border-border/60">
              <Type className="w-3 h-3 mr-1 shrink-0" />
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
              {toolbarState?.fontFamily === "mixed" && <SelectItem value="mixed" disabled>Mixed fonts</SelectItem>}
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value || "default"} className="text-xs" style={{ fontFamily: f.value || "inherit" }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select
            value={toolbarState?.fontSize || "default"}
            onValueChange={setFontSize}
          >
            <SelectTrigger onPointerDown={rememberSelection} onKeyDown={rememberSelection} className="h-7 w-[80px] text-xs border-border/60">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
              {toolbarState?.fontSize === "mixed" && <SelectItem value="mixed" disabled>Mixed sizes</SelectItem>}
              <SelectItem value="default" className="text-xs">Default</SelectItem>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onPointerDown={rememberSelection}
                      className="h-7 gap-1.5 border-border/60 px-2 text-xs"
                      aria-label="Text colour"
                    >
                      <Palette className="h-3.5 w-3.5" />
                      <span
                        className="h-2.5 w-5 rounded-sm border border-border"
                        style={{ backgroundColor: toolbarState?.color === "mixed" || toolbarState?.color === "default" ? "currentColor" : toolbarState?.color }}
                      />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Text colour</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent align="start" className="w-64 p-3" onOpenAutoFocus={(event) => event.preventDefault()}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Text colour</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setTextColor("default")}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {TEXT_COLORS.map((color) => (
                  <Button
                    key={color.value}
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn("h-6 w-6 p-0", toolbarState?.color?.toLowerCase() === color.value ? "ring-2 ring-primary ring-offset-1" : "")}
                    onClick={() => setTextColor(color.value)}
                    aria-label={color.label}
                    title={color.label}
                  >
                    <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: color.value }} />
                  </Button>
                ))}
              </div>
              <label className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-sm">
                Custom colour
                <input
                  type="color"
                  value={toolbarState?.color !== "mixed" && toolbarState?.color !== "default" ? toolbarState?.color : "#111827"}
                  onPointerDown={rememberSelection}
                  onChange={(event) => setTextColor(event.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border bg-background p-0.5"
                  aria-label="Choose a custom text colour"
                />
              </label>
            </PopoverContent>
          </Popover>

          <Divider />

          {/* Headings */}
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
            <Heading1 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
            <Heading2 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
            <Heading3 className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive("heading", { level: 4 })} title="Heading 4">
            <Heading4 className="w-3.5 h-3.5" />
          </ToolBtn>

          <Divider />

          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <Undo className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <Redo className="w-3.5 h-3.5" />
          </ToolBtn>
        </div>

        {/* Row 2: Formatting, alignment, inserts */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
            <Bold className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
            <Italic className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
            <Highlighter className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} title="Subscript">
            <SubscriptIcon className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} title="Superscript">
            <SuperscriptIcon className="w-3.5 h-3.5" />
          </ToolBtn>

          <Divider />

          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
            <List className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
            <Quote className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
            <Code className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
            <Minus className="w-3.5 h-3.5" />
          </ToolBtn>

          <Divider />

          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
            <AlignRight className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify">
            <AlignJustify className="w-3.5 h-3.5" />
          </ToolBtn>

          <Divider />

          <ToolBtn onClick={setLink} active={editor.isActive("link")} title="Link">
            <Link2 className="w-3.5 h-3.5" />
          </ToolBtn>
          <Popover open={imageOpen} onOpenChange={(open) => {
            if (open) {
              rememberSelection();
              setImageUrl("");
              setImageAlt("");
              setImageError("");
            }
            setImageOpen(open);
          }}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" aria-label="Image" title="Insert image" onPointerDown={rememberSelection}>
                <ImageIcon className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-3" onCloseAutoFocus={(event) => event.preventDefault()}>
              <h3 className="text-base font-semibold">Insert image</h3>
              <FileUpload bucket="uploads" folder="editor-images" value={imageUrl} onChange={(url) => { setImageUrl(url); setImageError(""); }} accept="image/*" label="Image file or link" />
              <div className="space-y-2">
                <Label htmlFor={imageAltId}>Image description (alt text)</Label>
                <Input id={imageAltId} value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the image" />
              </div>
              {imageError && <p role="alert" className="text-sm text-destructive">{imageError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setImageOpen(false)}>Cancel</Button>
                <Button type="button" size="sm" disabled={!imageUrl.trim()} onClick={() => {
                  let url: URL;
                  try { url = new URL(imageUrl.trim()); } catch { setImageError("Enter a valid image link or upload an image."); return; }
                  if (url.protocol !== "https:" && url.protocol !== "http:") { setImageError("Use an HTTP or HTTPS image link."); return; }
                  restored()?.setImage({ src: url.href, alt: imageAlt.trim() }).run();
                  setImageOpen(false);
                }}>Insert image</Button>
              </div>
            </PopoverContent>
          </Popover>
          <ToolBtn onClick={addTable} title="Insert Table">
            <Table2 className="w-3.5 h-3.5" />
          </ToolBtn>

          <Divider />

          <ToolBtn onClick={clearFormatting} title="Clear Formatting">
            <RemoveFormatting className="w-3.5 h-3.5" />
          </ToolBtn>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: "380px" }}>
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none focus-within:outline-hidden [&_.tiptap]:outline-hidden [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_table]:border-collapse [&_.tiptap_table]:w-full [&_.tiptap_td]:border [&_.tiptap_td]:border-border [&_.tiptap_td]:p-2 [&_.tiptap_th]:border [&_.tiptap_th]:border-border [&_.tiptap_th]:p-2 [&_.tiptap_th]:bg-muted/50 [&_.tiptap_th]:font-semibold [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_li]:my-1 [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-border [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:italic [&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:my-3 [&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:my-2 [&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:my-2 [&_.tiptap_h4]:text-base [&_.tiptap_h4]:font-semibold [&_.tiptap_h4]:my-1.5 [&_.tiptap_p]:my-1 [&_.tiptap_hr]:my-4 [&_.tiptap_hr]:border-border"
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
