import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/components/Onboarding.tsx", import.meta.url), "utf8");
const languages = ["en","fa","ar","ckb"];

function catalogKeys(name) {
  const start = source.indexOf("const " + name);
  assert.notEqual(start, -1, name + " catalog must exist");
  const end = source.indexOf("\n};", start);
  assert.notEqual(end, -1, name + " catalog must close");
  const body = source.slice(start, end);
  const keys = {};
  for (let i=0;i<languages.length;i++) {
    const language = languages[i];
    const at = body.indexOf(language + ":{") >= 0 ? body.indexOf(language + ":{") : body.indexOf(language + ": {");
    assert.notEqual(at, -1, name + " must include " + language);
    const open = body.indexOf("{", at) + 1;
    let close = body.length;
    for (const next of languages.slice(i+1)) {
      const p1 = body.indexOf(next + ":{", open);
      const p2 = body.indexOf(next + ": {", open);
      const p = p1 < 0 ? p2 : p2 < 0 ? p1 : Math.min(p1,p2);
      if (p >= 0) close = Math.min(close,p);
    }
    const fragment = body.slice(open,close);
    keys[language] = new Set([...fragment.matchAll(/(?:^|,)\s*([A-Za-z][A-Za-z0-9]*):\s*"/g)].map(match=>match[1]));
  }
  return keys;
}

const base = catalogKeys("copy");
const flow = catalogKeys("flowCopy");
for (const language of languages) {
  const available = new Set([...base[language],...flow[language]]);
  const required = new Set([...base.en,...flow.en]);
  const missing = [...required].filter(key=>!available.has(key));
  assert.deepEqual(missing, [], language + " is missing auth translations");
}
for (const key of ["country","passwordStrength","step","of","searchClear","noCountries"]) {
  assert.ok(flow.fa.has(key) && flow.ar.has(key) && flow.ckb.has(key) && flow.en.has(key), "Missing required translated key: " + key);
}
const englishAvailable = new Set([...base.en,...flow.en]);
const usedKeys = [...source.matchAll(/\\bt\\("([A-Za-z][A-Za-z0-9]*)"\\)/g)].map(match=>match[1]);
const missingUsed = [...new Set(usedKeys)].filter(key=>!englishAvailable.has(key));
assert.deepEqual(missingUsed, [], "A translation lookup can render a raw key");
console.log("PASS: auth translations exist in English, Persian, Arabic and Sorani; no unresolved t() keys");
