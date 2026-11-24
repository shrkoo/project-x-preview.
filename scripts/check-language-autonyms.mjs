import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

// Keep this allowlist limited to languages whose established endonym is
// conventionally identical to their English label.
const sameNameAutonyms = new Set(["af", "ak", "bi", "en", "eo", "ha", "ho", "ia", "ie", "io", "kl", "kr", "mg", "oc", "tw", "vo", "wo"]);

const source = readFileSync(new URL("../app/data/languages.ts", import.meta.url), "utf8");
assert.match(source, /export const languages: LanguageOption\[\] = \[/, "languages.ts must be a TypeScript source file with a typed language array");
const match = source.match(/export const languages: LanguageOption\[\] = (\[.*\]);\s*export const languageByCode/s);
assert.ok(match, "Could not parse the typed language catalog");
const languages = JSON.parse(match[1]);
assert.ok(languages.length >= 180, "Expected the full language catalog");
const failures = languages.filter(({ code, name, nativeName }) =>
  !nativeName || nativeName.trim() === "" ||
  nativeName.toLocaleLowerCase() === code.toLocaleLowerCase() ||
  (nativeName.toLocaleLowerCase() === name.toLocaleLowerCase() && !sameNameAutonyms.has(code))
);
assert.deepEqual(failures, [], "Every language needs a real autonym; review equal-to-code/English entries");

const byCode = new Map(languages.map(language => [language.code, language]));
assert.equal(byCode.get("ckb")?.rtl, true, "Sorani must be RTL");
assert.equal(byCode.get("ku")?.rtl, false, "Kurmanji must be LTR");
for (const code of ["ar", "fa", "he", "ur", "ps", "sd", "ug", "dv", "yi", "ks"]) {
  assert.equal(byCode.get(code)?.rtl, true, `${code} must be RTL`);
}
console.log(`PASS: ${languages.length} language autonyms and RTL flags`);
