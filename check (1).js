import { checkSyllabus, InputError } from "../lib/check.js";

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const accessCode = process.env.ACCESS_CODE;
  if (accessCode && req.headers["x-access-code"] !== accessCode) {
    return res.status(401).json({ error: "קוד גישה שגוי" });
  }

  const { filename, data } = req.body || {};
  if (!filename || !data) return res.status(400).json({ error: "לא התקבל קובץ" });

  try {
    const result = await checkSyllabus(filename, Buffer.from(data, "base64"));
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof InputError) return res.status(400).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "הבדיקה נכשלה. נסו שוב בעוד רגע." });
  }
}
