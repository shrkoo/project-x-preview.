import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../workers/api/index.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../workers/api/migrations/0001-regional-profile.sql", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../workers/api/data/catalog-validation.js", import.meta.url), "utf8");
const columns = ["first_name","last_name","country","currency","calendar","number_format","week_start","language","account_type","app_lock_type","app_lock_hash","app_lock_timeout","lock_failed_attempts","onboarding_completed","number_system","date_format","text_direction"];
for (const column of columns) assert.ok(migration.includes("ADD COLUMN " + column), "Preview migration missing " + column);
for (const column of ["number_system","date_format","text_direction"]) {
  assert.ok(worker.includes(column), "Worker does not persist " + column);
}
assert.ok(worker.includes("numberSystemCodes.has(number_system)"), "Worker must validate number system");
assert.ok(catalog.includes('export const numberSystemCodes = new Set(NUMBER_SYSTEM_CODES)'), "Worker catalog must expose numbering systems");
assert.ok(worker.includes("u.number_system,u.date_format,u.text_direction"), "Session user query must read regional fields");
assert.ok(worker.includes("number_system=?,date_format=?,text_direction=?"), "Profile update must write regional fields");
console.log("PASS: preview D1 profile migration and Worker regional schema are aligned");
