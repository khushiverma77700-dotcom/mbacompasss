import { Parser } from "htmlparser2";
/** Linear extraction of visible FAQ headings and answers; never generate Q&A. */
export function editorialFaqs(html: string) {
  const faqs: { q: string; a: string }[] = [];
  let inFaq = false, tag = "", text = "", depth = 0, question = "", answer: string[] = [];
  const flush = () => { if (question && answer.length) faqs.push({ q: question, a: answer.join(" ") }); question = ""; answer = []; };
  const parser = new Parser({
    onopentag(name) {
      if (depth) { depth++; return; }
      if (/^h[2-6]$/.test(name) || (inFaq && ["p", "li"].includes(name))) { tag = name; text = ""; depth = 1; }
    },
    ontext(value) { if (depth) text += value; },
    onclosetag() {
      if (!depth || --depth) return;
      const value = text.replace(/\s+/g, " ").trim();
      if (/^h/.test(tag)) {
        if (/^(?:\d+[.)]?\s*)?(?:FAQs?|Frequently Asked Questions)(?:\s*[:—-].*)?$/i.test(value)) { flush(); inFaq = true; }
        else if (inFaq && value.endsWith("?")) { flush(); question = value; }
        else if (inFaq && tag === "h2") { flush(); inFaq = false; }
      } else if (inFaq && question && value) answer.push(value);
    },
  }, { decodeEntities: true });
  parser.write(html); parser.end(); flush();
  return faqs;
}
export function faqMarkup(faqs: { q: string; a: string }[]) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}