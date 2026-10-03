// Block model for the email body. Blocks serialise to inline-styled HTML (email-client safe)
// with data-* attributes so the editor can parse them back.

export type ImageAlign = "left" | "center" | "right";
export type EmailBlock =
  | { id: string; type: "text"; html: string }
  | { id: string; type: "image"; src: string; alt: string; align: ImageAlign; width: number; href: string }
  | { id: string; type: "divider"; style: "solid" | "dashed" | "dotted" | "space"; color: string; thickness: number };

export interface EmailLayout { bg: string; card: string; blocks: EmailBlock[] }

export const DEFAULT_BG = "#ffffff";
export const DEFAULT_CARD = "#ffffff";
const uid = () => Math.random().toString(36).slice(2, 10);
export const newBlock = (type: EmailBlock["type"]): EmailBlock =>
  type === "text" ? { id: uid(), type, html: "" }
  : type === "image" ? { id: uid(), type, src: "", alt: "", align: "center", width: 100, href: "" }
  : { id: uid(), type, style: "solid", color: "#e2e8f0", thickness: 1 };

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hex = (s: string, d: string) => (/^#[0-9a-f]{3,8}$/i.test(s) ? s : d);

export function serializeLayout(l: EmailLayout): string {
  const inner = l.blocks.map((b) => {
    if (b.type === "text") return `<div data-eb="text">${b.html}</div>`;
    if (b.type === "image") {
      if (!b.src) return "";
      const w = Math.min(100, Math.max(10, Math.round(b.width)));
      const img = `<img src="${esc(b.src)}" alt="${esc(b.alt || "MBA Compass image")}" width="${Math.round(536 * w / 100)}" style="display:inline-block;width:${w}%;max-width:100%;height:auto;border:0;border-radius:8px" />`;
      const body = b.href ? `<a href="${esc(b.href)}">${img}</a>` : img;
      return `<div data-eb="image" data-align="${b.align}" data-width="${w}" style="text-align:${b.align};margin:16px 0">${body}</div>`;
    }
    const c = hex(b.color, "#e2e8f0");
    const t = Math.min(6, Math.max(1, b.thickness));
    const line = b.style === "space" ? `<div style="height:${t * 8}px"></div>` : `<hr style="border:0;border-top:${t}px ${b.style} ${c};margin:24px 0" />`;
    return `<div data-eb="divider" data-style="${b.style}" data-color="${c}" data-thickness="${t}">${line}</div>`;
  }).join("");
  return `<div data-eb-root="1" data-bg="${hex(l.bg, DEFAULT_BG)}" data-card="${hex(l.card, DEFAULT_CARD)}">${inner}</div>`;
}

export function parseLayout(html: string): EmailLayout {
  const fallback: EmailLayout = { bg: DEFAULT_BG, card: DEFAULT_CARD, blocks: [{ id: uid(), type: "text", html: html || "" }] };
  if (typeof DOMParser === "undefined" || !/data-eb-root/.test(html || "")) return fallback;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.querySelector("[data-eb-root]");
  if (!root) return fallback;
  const blocks: EmailBlock[] = [];
  root.querySelectorAll(":scope > [data-eb]").forEach((el) => {
    const t = el.getAttribute("data-eb");
    if (t === "text") blocks.push({ id: uid(), type: "text", html: el.innerHTML });
    else if (t === "image") {
      const img = el.querySelector("img");
      blocks.push({ id: uid(), type: "image", src: img?.getAttribute("src") || "", alt: img?.getAttribute("alt") || "",
        align: (el.getAttribute("data-align") as ImageAlign) || "center", width: Number(el.getAttribute("data-width")) || 100,
        href: el.querySelector("a")?.getAttribute("href") || "" });
    } else if (t === "divider") {
      blocks.push({ id: uid(), type: "divider", style: (el.getAttribute("data-style") as any) || "solid",
        color: el.getAttribute("data-color") || "#e2e8f0", thickness: Number(el.getAttribute("data-thickness")) || 1 });
    }
  });
  return { bg: root.getAttribute("data-bg") || DEFAULT_BG, card: root.getAttribute("data-card") || DEFAULT_CARD, blocks: blocks.length ? blocks : fallback.blocks };
}

export function layoutColors(html: string) {
  const bg = /data-bg="(#[0-9a-f]{3,8})"/i.exec(html || "")?.[1] || DEFAULT_BG;
  const card = /data-card="(#[0-9a-f]{3,8})"/i.exec(html || "")?.[1] || DEFAULT_CARD;
  return { bg, card };
}
