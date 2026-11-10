import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(repoDir, "index.html"), "utf8");

const srcdocMatch = html.match(/<iframe[\s\S]*?srcdoc="([\s\S]*?)"><\/iframe>/);
if (!srcdocMatch) throw new Error("srcdoc document not found");
const inner = srcdocMatch[1]
  .replaceAll("&quot;", '"')
  .replaceAll("&#x27;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&amp;", "&");

const moduleMatch = inner.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!moduleMatch) throw new Error("module script not found");
const syntax = spawnSync(process.execPath, ["--check", "--input-type=module"], {
  input: moduleMatch[1], encoding: "utf8"
});
if (syntax.status !== 0) throw new Error(`module syntax check failed:\n${syntax.stderr}`);

const rowsMatch = moduleMatch[1].match(/const currentResearchRows = (\{[\s\S]*?\});\n\s*for \(const \[mode/);
if (!rowsMatch) throw new Error("generated review rows not found");
const rows = JSON.parse(rowsMatch[1]);
const projectDir = path.resolve(repoDir, "../..");
const reviewSummary = JSON.parse(fs.readFileSync(path.join(projectDir, "Africa_Android_Anonymous_Identity_Review_Summary.json"), "utf8"));
const publishedSummary = JSON.parse(fs.readFileSync(path.join(repoDir, "data", "africa-review-summary.json"), "utf8"));
if (JSON.stringify(publishedSummary.counts) !== JSON.stringify(reviewSummary.counts)) throw new Error("Africa public snapshot differs from audited research counts");

for (const mode of ["eduroam", "schoolWifi"]) {
  if (rows[mode].length < 118) throw new Error(`${mode}: expected existing 66 plus all 52 Africa countries`);
  const seen = new Set();
  for (const row of rows[mode]) {
    if (seen.has(row.iso3)) throw new Error(`${mode}: duplicate ${row.iso3}`);
    seen.add(row.iso3);
    const categorized = row.explicitBlank + row.explicitValue + row.realIdentity + row.notSpecified;
    if (categorized !== row.profileTotal) {
      throw new Error(`${mode} ${row.country}: ${categorized} categories != ${row.profileTotal} routes`);
    }
    if (row.guideFound + row.guideNotFound + row.guideUnclear !== row.total) {
      throw new Error(`${mode} ${row.country}: coverage counts do not equal total`);
    }
  }
}

for (const expected of reviewSummary.country_results) {
  const views = ["eduroam", "schoolWifi"].map((mode) => rows[mode].find((row) => row.country === expected.country));
  if (views.some((row) => !row)) throw new Error(`Africa view missing: ${expected.country}`);
  for (const row of views) {
    if (row.total !== expected.denominator || row.appProfileUniversities !== expected.app_profile) throw new Error(`Africa country coverage/profile mismatch: ${expected.country}`);
    if (row.dispositionPassFinalizedOn !== "2026-11-02" || row.reviewedOn < "2026-10-31") throw new Error(`Stale Africa review: ${expected.country}`);
  }
}

// The Africa-only publication must preserve every pre-existing non-Africa row.
const prior = spawnSync("git", ["show", "HEAD:index.html"], { cwd: repoDir, encoding: "utf8", maxBuffer: 5 * 1024 * 1024 });
if (prior.status !== 0) throw new Error("Could not compare against previous published rows");
const priorInner = prior.stdout.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
const previousRows = JSON.parse(priorInner.match(/const currentResearchRows = (\{[\s\S]*?\});\n\s*for \(const \[mode/)[1]);
const africaNames = new Set(reviewSummary.country_results.map((row) => row.country));
for (const mode of ["eduroam", "schoolWifi"]) for (const row of previousRows[mode]) {
  if (africaNames.has(row.country)) continue;
  const current = rows[mode].find((x) => x.iso3 === row.iso3);
  if (JSON.stringify(current) !== JSON.stringify(row)) throw new Error(`Unrelated country changed: ${mode} ${row.country}`);
}

const requiredCountries = [
  "Argentina", "Brazil", "Chile", "Colombia", "Costa Rica", "Ecuador",
  "Peru", "Trinidad and Tobago", "Uruguay", "China", "United States"
];
for (const country of requiredCountries) {
  if (!rows.eduroam.some((row) => row.country === country)) {
    throw new Error(`required country missing: ${country}`);
  }
}

for (const requiredText of [
  "Risk index", "World map", "Globe", "CAT/app/profile universities",
  "BEGIN GENERATED CURRENT RESEARCH OVERRIDES"
]) {
  if (!html.includes(requiredText)) throw new Error(`required site element missing: ${requiredText}`);
}

if (!fs.existsSync(path.join(repoDir, "securew2", "index.html"))) {
  throw new Error("SecureW2 site entry point is missing");
}

console.log(`Site verification passed: ${rows.eduroam.length} generated countries in both views; all 52 Africa rows match audited coverage/profile counts; other regions preserved; module syntax valid.`);
