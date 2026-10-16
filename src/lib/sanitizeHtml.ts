// SSR-safe HTML sanitizer.
//
// isomorphic-dompurify needs a DOM. In the edge SSR runtime there is none, and
// simply importing it can throw ("Cannot read properties of undefined (reading
// 'bind')"), which aborts server rendering of the whole route. So DOMPurify is
// loaded lazily in the browser only, and the server uses a small DOM-free
// fallback that removes the dangerous constructs (scripts, styles, inline event
// handlers, javascript: URLs) while keeping the markup intact.

import sanitize from "sanitize-html";
type SanitizeConfig = Record<string, unknown>;

export function sanitizeEditorialHtml(html: string): string {
  return sanitize(html, {
    allowedTags: [...sanitize.defaults.allowedTags, "img", "nav", "section", "article", "figure", "figcaption"],
    allowedAttributes: {
      "*": ["id", "class", "title", "style", "role", "aria-*", "data-*"],
      a: ["href", "target", "rel"], img: ["src", "alt", "width", "height", "loading", "decoding"],
      th: ["scope", "colspan", "rowspan"], td: ["colspan", "rowspan"], ol: ["start", "type"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedStyles: { "*": {
      color: [/^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d.,%\s]+\))$/i],
      "background-color": [/^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d.,%\s]+\))$/i],
      "text-align": [/^(left|right|center|justify)$/],
      "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
      "font-weight": [/^(bold|normal|[1-9]00)$/],
      "font-style": [/^(italic|normal)$/],
      "text-decoration": [/^(underline|line-through|none)$/],
    } },
  });
}

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let purify: any = null;

if (isBrowser) {
  // Static import is safe here: this branch only evaluates in the browser,
  // but the import itself must not run during SSR — hence require-style load.
  void import("isomorphic-dompurify").then((m) => {
    purify = m.default ?? m;
  });
}

const DANGEROUS_TAGS = /<\s*(script|style|iframe|object|embed|link|meta|base)\b[\s\S]*?(?:<\s*\/\s*\1\s*>|>)/gi;
const EVENT_ATTRS = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URLS = /\s(?:href|src|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi;

function fallbackSanitize(html: string): string {
  return String(html)
    .replace(DANGEROUS_TAGS, "")
    .replace(EVENT_ATTRS, "")
    .replace(JS_URLS, "");
}

/** Sanitize untrusted/AI HTML. Uses DOMPurify in the browser, regex fallback on the server. */
export function sanitizeHtml(html: string | null | undefined, config?: SanitizeConfig): string {
  const input = html ?? "";
  if (!input) return "";
  if (isBrowser && purify?.sanitize) {
    return config ? purify.sanitize(input, config) : purify.sanitize(input);
  }
  return fallbackSanitize(input);
}

export default sanitizeHtml;
