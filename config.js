export default function handler(req, res) {
  res.status(200).json({ needsCode: Boolean(process.env.ACCESS_CODE) });
}
