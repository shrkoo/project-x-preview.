import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "out");
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".woff":"font/woff", ".woff2":"font/woff2", ".ico":"image/x-icon" };
const server = createServer((req,res) => {
  let pathname = "/";
  try { pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname); } catch {}
  let file = resolve(root, "." + pathname);
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end("Forbidden"); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) || !statSync(file).isFile()) {
    file = join(root, "404.html");
    if (!existsSync(file)) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(404, { "content-type":"text/html; charset=utf-8" });
  } else {
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  }
  res.end(readFileSync(file));
});
server.listen(Number(process.env.PORT || 3000), "127.0.0.1");
