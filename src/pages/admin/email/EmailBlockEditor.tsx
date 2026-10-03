import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ImagePlus, Minus, Trash2, Type } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { type EmailBlock, type EmailLayout, newBlock, parseLayout, serializeLayout } from "./emailBlocks";

const BG_PRESETS = ["#ffffff", "#f8fafc", "#eff6ff", "#f0f9ff", "#ecfdf5", "#fffbeb", "#fdf2f8"];

export default function EmailBlockEditor({ html, onChange, resetKey }: { html: string; onChange: (html: string) => void; resetKey: number }) {
  const [layout, setLayout] = useState<EmailLayout>(() => parseLayout(html));
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string | null>(null);

  useEffect(() => { setLayout(parseLayout(html)); /* external reset (template load / AI apply) */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const commit = (l: EmailLayout) => { setLayout(l); onChange(serializeLayout(l)); };
  const update = (id: string, p: Partial<EmailBlock>) => commit({ ...layout, blocks: layout.blocks.map((b) => (b.id === id ? ({ ...b, ...p } as EmailBlock) : b)) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= layout.blocks.length) return;
    const blocks = [...layout.blocks]; [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; commit({ ...layout, blocks });
  };
  const remove = (id: string) => commit({ ...layout, blocks: layout.blocks.filter((b) => b.id !== id) });
  const add = (type: EmailBlock["type"]) => {
    const b = newBlock(type); commit({ ...layout, blocks: [...layout.blocks, b] });
    if (type === "image") { targetRef.current = b.id; setTimeout(() => fileRef.current?.click(), 0); }
  };

  const upload = async (file: File, id: string) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return toast.error("Use PNG, JPG, WebP or GIF");
    if (file.size > 3 * 1024 * 1024) return toast.error("Image must be under 3 MB");
    setUploadingId(id);
    try {
      const path = `email-images/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      const alt = file.name.replace(/\.\w+$/, "").replace(/[-_]+/g, " ").trim() || "MBA Compass image";
      setLayout((l) => {
        const next = { ...l, blocks: l.blocks.map((b) => (b.id === id && b.type === "image" ? { ...b, src: data.publicUrl, alt: b.alt || alt } : b)) };
        onChange(serializeLayout(next));
        return next;
      });
    } catch (e: any) { toast.error(e?.message || "Upload failed"); } finally { setUploadingId(null); }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
        {([["bg", "Email background"], ["card", "Content box colour"]] as const).map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <input type="color" value={layout[k]} onChange={(e) => commit({ ...layout, [k]: e.target.value })} className="h-8 w-10 cursor-pointer rounded border" aria-label={label} />
              {BG_PRESETS.map((c) => (
                <button key={c} type="button" aria-label={c} onClick={() => commit({ ...layout, [k]: c })}
                  className={`h-6 w-6 rounded border ${layout[k] === c ? "ring-2 ring-primary" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; const id = targetRef.current; if (f && id) upload(f, id); e.target.value = ""; }} />

      {layout.blocks.map((b, i) => (
        <div key={b.id} className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold capitalize text-muted-foreground">{b.type === "text" ? "Text" : b.type === "image" ? "Image" : "Divider"} · block {i + 1}</span>
            <div className="flex gap-1">
              <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" disabled={i === layout.blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => remove(b.id)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          {b.type === "text" && (
            <RichTextEditor key={`${b.id}-${resetKey}`} content={b.html} onChange={(h) => update(b.id, { html: h })} placeholder="Write your message…" />
          )}
          {b.type === "image" && (
            <div className="space-y-2">
              {b.src ? <div style={{ textAlign: b.align }}><img src={b.src} alt={b.alt} style={{ width: `${b.width}%` }} className="inline-block h-auto max-w-full rounded" /></div>
                : <p className="text-sm text-muted-foreground">No image yet.</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" disabled={uploadingId === b.id} onClick={() => { targetRef.current = b.id; fileRef.current?.click(); }}>
                  <ImagePlus className="mr-1 h-4 w-4" />{uploadingId === b.id ? "Uploading…" : b.src ? "Replace" : "Upload"}
                </Button>
                {(["left", "center", "right"] as const).map((a) => {
                  const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                  return <Button key={a} type="button" size="icon" variant={b.align === a ? "default" : "outline"} onClick={() => update(b.id, { align: a })} aria-label={`Align ${a}`}><Icon className="h-4 w-4" /></Button>;
                })}
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Width {b.width}%</Label>
                  <input type="range" min={10} max={100} step={5} value={b.width} onChange={(e) => update(b.id, { width: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={b.alt} onChange={(e) => update(b.id, { alt: e.target.value.replace(/["<>]/g, "").slice(0, 120) })} placeholder="Short description (required)" />
                <Input value={b.href} onChange={(e) => update(b.id, { href: e.target.value })} placeholder="Link when clicked (optional) https://…" />
              </div>
            </div>
          )}
          {b.type === "divider" && (
            <div className="flex flex-wrap items-center gap-2">
              {(["solid", "dashed", "dotted", "space"] as const).map((s) => (
                <Button key={s} type="button" size="sm" variant={b.style === s ? "default" : "outline"} onClick={() => update(b.id, { style: s })} className="capitalize">{s === "space" ? "Blank space" : s}</Button>
              ))}
              {b.style !== "space" && <input type="color" value={b.color} onChange={(e) => update(b.id, { color: e.target.value })} className="h-8 w-10 rounded border" aria-label="Divider colour" />}
              <Label className="text-sm">Size</Label>
              <input type="range" min={1} max={6} value={b.thickness} onChange={(e) => update(b.id, { thickness: Number(e.target.value) })} />
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => add("text")}><Type className="mr-1 h-4 w-4" />Add text</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => add("image")}><ImagePlus className="mr-1 h-4 w-4" />Add image</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => add("divider")}><Minus className="mr-1 h-4 w-4" />Add divider</Button>
      </div>
    </div>
  );
}
