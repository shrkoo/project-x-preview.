import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const roots = ["app/components", "app"];
const seen = new Set();
function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) seen.add(full);
  }
}
for (const root of roots) {
  try { walk(root); } catch {}
}
const failures = [];
for (const file of seen) {
  if (file.replaceAll("\\", "/") === "app/lib/money.ts") continue;
  const source = readFileSync(file, "utf8");
  if (/\.toFixed\s*\(/.test(source)) failures.push(`${file}: toFixed() is forbidden for money`);
  if (/new\\s+Intl\\.NumberFormat\\s*\\([\\s\\S]{0,400}?style\\s*:\\s*["']currency["']/.test(source)) failures.push(`${file}: currency Intl.NumberFormat must live in app/lib/money.ts`);
  if (/["']\\$\\s*\\d|["']\\$["']/.test(source)) failures.push(`${file}: hard-coded dollar display is forbidden`);
}
if (failures.length) {
  process.stderr.write(failures.join("\\n") + "\\n");
  process.exit(1);
}
console.log(`money formatting guard: PASS (${seen.size} source files scanned)`);
