import { expect, it } from "vitest";
import { editorialFaqs } from "./editorialFaq";
it("extracts only visible FAQ questions and answers without unrelated text", () => {
  expect(editorialFaqs('<h2>Introduction</h2><p>Not an answer</p><h2>Frequently Asked Questions</h2><h3>What is CAT?</h3><p>An <strong>entrance</strong> exam.</p><h3>Is XAT accepted?</h3><p>Check each college.</p><h2>Related Reads</h2><p>Unrelated</p>')).toEqual([{ q: "What is CAT?", a: "An entrance exam." }, { q: "Is XAT accepted?", a: "Check each college." }]);
  expect(editorialFaqs('<h2>FAQ</h2><h3>Missing answer?</h3>')).toEqual([]);
});