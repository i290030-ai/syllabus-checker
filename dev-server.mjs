// הרצה מקומית בלי Vercel: ANTHROPIC_API_KEY=... node dev-server.mjs  ואז http://localhost:3000
import http from "node:http";
import fs from "node:fs";
import check from "./api/check.js";
import config from "./api/config.js";

const routes = { "/api/check": check, "/api/config": config };

http.createServer((req, res) => {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
  const route = routes[req.url];
  if (!route) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(fs.readFileSync("./public/index.html"));
  }
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    route(req, res);
  });
}).listen(3000, () => console.log("http://localhost:3000"));
