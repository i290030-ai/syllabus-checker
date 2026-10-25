import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { RULES } from "./rules.js";

const MODEL = "claude-opus-5-5";

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["approved", "rejected"] },
    reason: { type: "string" },
    course: { type: "string" },
    lecturer: { type: "string" },
    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          num: { type: "integer" },
          component: { type: "string" },
          status: { type: "string", enum: ["חסר", "חלקי"] },
          missing: { type: "string" },
          fix: { type: "string" },
        },
        required: ["num", "component", "status", "missing", "fix"],
        additionalProperties: false,
      },
    },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["verdict", "reason", "course", "lecturer", "gaps", "notes"],
  additionalProperties: false,
};

export class InputError extends Error {}

// PDF goes to Claude as a document; Word is converted to HTML so tables keep their columns.
async function toContent(filename, buffer) {
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf")) {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
    };
  }
  if (name.endsWith(".docx")) {
    const { value } = await mammoth.convertToHtml({ buffer });
    if (!value.trim()) throw new InputError("הקובץ ריק או שלא ניתן לקרוא אותו");
    return { type: "text", text: `<syllabus filename="${filename}">\n${value}\n</syllabus>` };
  }
  throw new InputError("סוג קובץ לא נתמך. אפשר להעלות Word (docx) או PDF");
}

export async function checkSyllabus(filename, buffer, client = new Anthropic()) {
  const content = await toContent(filename, buffer);
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: RESULT_SCHEMA } },
    system: RULES,
    messages: [
      { role: "user", content: [content, { type: "text", text: "בדוק את הסילבוס המצורף לפי הכללים." }] },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("הבדיקה נדחתה על ידי המודל");
  if (response.stop_reason === "max_tokens") throw new Error("התשובה נקטעה");
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(text);
}
