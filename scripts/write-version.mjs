import { mkdir, writeFile } from "node:fs/promises";

const commit = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || "unknown";
const branch = process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME || "unknown";
const builtAt = new Date().toISOString();

await mkdir("public", { recursive: true });
await writeFile(
  "public/version.json",
  JSON.stringify({ commit, shortCommit: commit.slice(0, 7), branch, builtAt }, null, 2) + "\n",
  "utf8"
);
console.log(`Generated version.json for ${commit.slice(0, 7)} at ${builtAt}`);
