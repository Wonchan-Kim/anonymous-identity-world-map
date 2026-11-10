import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(toolDir, "..");
const projectDir = path.resolve(repoDir, "../..");
const indexPath = path.join(repoDir, "index.html");
const localLatestPath = path.join(projectDir, "anonymous-identity-world-map.index.html");

const iso3ByIso2 = {
  AL: "ALB", AD: "AND", AR: "ARG", AM: "ARM", AT: "AUT", AZ: "AZE",
  BE: "BEL", BA: "BIH", BR: "BRA", BG: "BGR", CL: "CHL", CN: "CHN",
  CO: "COL", CR: "CRI", HR: "HRV", CY: "CYP", CZ: "CZE", DK: "DNK",
  EC: "ECU", EE: "EST", FO: "FRO", FI: "FIN", FR: "FRA", GE: "GEO",
  DE: "DEU", GR: "GRC", GL: "GRL", HU: "HUN", IS: "ISL", IE: "IRL",
  IL: "ISR", IT: "ITA", KZ: "KAZ", XK: "XKX", KG: "KGZ", LV: "LVA",
  LI: "LIE", LT: "LTU", LU: "LUX", MT: "MLT", MD: "MDA", ME: "MNE",
  NL: "NLD", MK: "MKD", NO: "NOR", PK: "PAK", PE: "PER", PH: "PHL",
  PL: "POL", PT: "PRT", QA: "QAT", RO: "ROU", SA: "SAU", RS: "SRB",
  SK: "SVK", SI: "SVN", ES: "ESP", SE: "SWE", CH: "CHE", TJ: "TJK",
  TT: "TTO", TR: "TUR", UA: "UKR", GB: "GBR", US: "USA", UY: "URY",
  DZ: "DZA", AO: "AGO", BJ: "BEN", BW: "BWA", BF: "BFA", BI: "BDI",
  CM: "CMR", CV: "CPV", CF: "CAF", TD: "TCD", CG: "COG", CD: "COD",
  DJ: "DJI", EG: "EGY", GQ: "GNQ", ER: "ERI", SZ: "SWZ", ET: "ETH",
  GA: "GAB", GM: "GMB", GH: "GHA", GN: "GIN", CI: "CIV", KE: "KEN",
  LS: "LSO", LR: "LBR", LY: "LBY", MG: "MDG", MW: "MWI", ML: "MLI",
  MR: "MRT", MU: "MUS", MA: "MAR", MZ: "MOZ", NA: "NAM", NE: "NER",
  NG: "NGA", RE: "REU", RW: "RWA", SN: "SEN", SC: "SYC", SL: "SLE",
  SO: "SOM", ZA: "ZAF", SS: "SSD", SD: "SDN", TZ: "TZA", TG: "TGO",
  TN: "TUN", UG: "UGA", ZM: "ZMB", ZW: "ZWE", CA: "CAN", MX: "MEX"
};

const finite = (...values) => values.find((value) => Number.isFinite(value));

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(projectDir, filename), "utf8"));
}

function routesFor(review) {
  if (Array.isArray(review.eligible_manual_routes)) {
    return review.eligible_manual_routes.flatMap((route) => {
      const networks = route.network_names ?? (route.network ? [route.network] : []);
      const kind = route.route_type ?? "";
      const eduroam = networks.some((network) => /eduroam/i.test(network)) ||
        kind.startsWith("eduroam_") || kind.startsWith("combined_eduroam_");
      const school = networks.some((network) => !/eduroam/i.test(network)) ||
        /^(school_wifi_|campus_|combined_eduroam_)/.test(kind);
      if (!eduroam && !school) throw new Error(`Unassigned manual network: ${review.country} ${route.institution}`);
      return [eduroam && "eduroam", school && "school_wifi"].filter(Boolean).map((view) => ({
        ...route, view, category: route.anonymous_identity_category,
        credential_required: route.credentials_required
      }));
    });
  }
  if (Array.isArray(review.eligible_routes)) return review.eligible_routes;
  if (Array.isArray(review.manual_routes)) return review.manual_routes;
  return [];
}

function routeView(route) {
  const value = route.view ?? route.type ?? route.network_view ?? "";
  return value === "school_wifi" || value === "schoolWifi" ? "schoolWifi" :
    value === "eduroam" ? "eduroam" : null;
}

function routeCategory(route) {
  return route.category ?? route.outcome ?? route.classification ??
    route.anonymous_identity_category ?? null;
}

function countsFromDeclared(review, mode) {
  const key = mode === "schoolWifi" ? "school_wifi" : "eduroam";
  const source = review.current_counts?.[key] ?? review.summary?.[key] ??
    review.route_counts?.[key] ?? null;
  if (!source) return null;
  return {
    routes: finite(source.routes, source.eligible_routes, 0),
    universities: finite(source.universities, source.unique_universities,
      source.unique_route_universities, source.eligible_manual_guide_universities, 0),
    explicitBlank: finite(source.explicit_blank, 0),
    explicitValue: finite(source.explicit_value, 0),
    sameAsIdentity: finite(source.same_as_identity, 0),
    notMentioned: finite(source.not_mentioned, 0) +
      finite(source.field_shown_no_instruction, 0)
  };
}

function countsFor(review, mode) {
  const routes = routesFor(review).filter((route) => routeView(route) === mode);
  if (!routes.length) return countsFromDeclared(review, mode) ?? {
    routes: 0, universities: 0, explicitBlank: 0, explicitValue: 0,
    sameAsIdentity: 0, notMentioned: 0
  };
  const institutions = new Set(routes.map((route) => route.institution).filter(Boolean));
  const count = (category) => routes.filter((route) => routeCategory(route) === category).length;
  return {
    routes: routes.length,
    universities: institutions.size,
    explicitBlank: count("explicit_blank"),
    explicitValue: count("explicit_value"),
    sameAsIdentity: count("same_as_identity"),
    notMentioned: count("not_mentioned") + count("field_shown_no_instruction")
  };
}

function schoolDenominator(review) {
  return finite(
    review.scope?.unirank_university_count,
    review.scope?.school_wifi_unirank_denominator,
    review.scope?.unirank_rows,
    review.scope?.roster_institutions,
    review.scope?.unirank_university_denominator,
    review.closure?.unirank_rows,
    review.closure?.roster_rows_total,
    review.checkpoint?.roster_rows_closed,
    review.summary?.roster_rows_closed,
    review.current_counts?.roster_rows_closed
  ) ?? 0;
}

function eduroamDenominator(review, fallback) {
  return finite(
    review.scope?.eduroam_participant_roster_denominator,
    review.scope?.eduroam_official_participant_rows,
    review.scope?.eduroam_named_institution_denominator,
    review.scope?.eduroam_denominator,
    review.participation_context?.participant_rows,
    review.coverage_reconciliation?.eduroam?.roster_total
  ) ?? fallback;
}

function appProfileUniversities(review) {
  return finite(
    review.counts?.separate_app_profile_routes,
    review.checkpoint?.app_or_profile_unique_universities,
    review.checkpoint?.manual_or_app_profile_unique_universities,
    review.summary?.app_or_profile_unique_universities,
    review.current_counts?.app_or_profile_unique_universities,
    0
  );
}

function credentialCounts(review, mode) {
  const routes = routesFor(review).filter((route) => routeView(route) === mode);
  return {
    required: routes.filter((route) => route.credential_required === true).length,
    inAnonymous: routes.filter((route) => route.credential_in_anonymous_identity === true).length
  };
}

function unresolvedFor(review, mode) {
  if (Array.isArray(review.eligible_manual_routes)) {
    const eligible = new Set(routesFor(review).filter((route) => routeView(route) === mode).map((route) => route.institution));
    return new Set(africaDispositionIndex.records.filter((record) =>
      record.country === review.country && record.open_lead && !eligible.has(record.institution)
    ).map((record) => record.institution)).size;
  }
  if (review.country_code === "PH") {
    return finite(review.coverage_reconciliation?.[mode === "schoolWifi" ? "school_wifi" : "eduroam"]?.unresolved, 0);
  }
  if (mode === "schoolWifi") {
    return finite(review.closure?.unresolved_school_wifi_rows, 0);
  }
  return finite(review.closure?.unresolved_eduroam_rows, 0);
}

function reviewedOn(review) {
  return review.completed_review_date ?? review.latest_strict_review_date ?? review.review_date ?? review.review_completed ?? review.reviewed_on ?? review.last_updated ??
    review.reviewed_through ?? "2026-10-30";
}

function makeRow(review, mode, easyroamProfiles = 0) {
  const counts = countsFor(review, mode);
  const schoolTotal = schoolDenominator(review);
  const total = mode === "eduroam" ? eduroamDenominator(review, schoolTotal) : schoolTotal;
  const unresolved = Math.min(unresolvedFor(review, mode), Math.max(0, total - counts.universities));
  const guideFound = Math.min(counts.universities, total || counts.universities);
  const credentials = credentialCounts(review, mode);
  const iso3 = iso3ByIso2[review.country_code];
  if (!iso3) throw new Error(`Missing ISO-3 mapping for ${review.country_code}`);
  const coverageTotal = total || guideFound;
  return {
    iso3,
    country: review.country === "Czech Republic" ? "Czechia" : review.country,
    total: coverageTotal,
    completed: coverageTotal,
    pending: 0,
    guideFound,
    guideNotFound: Math.max(0, coverageTotal - guideFound - unresolved),
    guideUnclear: unresolved,
    profileTotal: counts.routes,
    anonymousValue: 0,
    explicitValue: counts.explicitValue,
    realIdentity: counts.sameAsIdentity,
    explicitBlank: counts.explicitBlank,
    notSpecified: counts.notMentioned,
    fieldShown: 0,
    needsReview: 0,
    notApplicable: 0,
    unclear: 0,
    anonymousShare: 0,
    credentialRequired: credentials.required,
    credentialInAnonymousIdentity: credentials.inAnonymous,
    easyroamProfiles: mode === "eduroam" ? easyroamProfiles : 0,
    securew2Profiles: 0,
    appProfileUniversities: appProfileUniversities(review),
    reviewComplete: true,
    identityUnit: "Android EAP routes",
    taxonomy: "current-four-category",
    reviewedOn: reviewedOn(review),
    ...(review.strict_review_disposition_pass ? { dispositionPassFinalizedOn: review.strict_review_disposition_pass.review_date } : {}),
    methodNote: `${reviewedOn(review)}: ${Array.isArray(review.eligible_manual_routes) ? "institution-level Android EAP public-guide review; documented dispositions include access-limited outcomes" : "official-source Android/mobile EAP review"}. ` +
      `${counts.routes} eligible ${mode === "eduroam" ? "eduroam" : "school Wi-Fi"} routes from ` +
      `${counts.universities} universities: explicit blank ${counts.explicitBlank}, explicit value ` +
      `${counts.explicitValue}, same as Identity ${counts.sameAsIdentity}, and not mentioned ` +
      `${counts.notMentioned}. Visible fields without an instruction are merged into not mentioned. ` +
      `Missing, inaccessible, app/profile-only, captive-portal, PSK and non-EAP cases stay outside the pie.` +
      (Array.isArray(review.eligible_manual_routes) ? ` App/profile universities is a country-wide separate count, not inspected profile contents. ` +
        `Both network views use the frozen uniRank discovery roster, not an eduroam participation census. ` +
        `A combined-network manual can appear in both views; the Africa summary deduplicates institutions.` : "")
  };
}

function escapeForSrcdoc(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const reviewFiles = fs.readdirSync(projectDir)
  .filter((filename) => filename.endsWith("_Android_Anonymous_Identity_Review.json"))
  .sort();
const easyroam = readJson("Germany_Easyroam_Review.json");
const easyroamProfiles = finite(easyroam.counts?.official_university_deployments_verified, 0);
const rows = { eduroam: [], schoolWifi: [] };
const africaSummary = readJson("Africa_Android_Anonymous_Identity_Review_Summary.json");
const africaDispositionIndex = readJson("research_evidence/africa_completion_2026-11-02/all_institution_dispositions.json");
const africaCodes = new Set(africaSummary.country_results.map((row) => row.code));
const africaOnly = process.argv.includes("--region=africa");

for (const filename of reviewFiles) {
  const review = readJson(filename);
  if (!review.country_code) throw new Error(`Missing country code: ${filename}`);
  if (africaOnly && !africaCodes.has(review.country_code)) continue;
  for (const mode of Object.keys(rows)) {
    rows[mode].push(makeRow(review, mode, review.country_code === "DE" ? easyroamProfiles : 0));
  }
}

for (const mode of Object.keys(rows)) {
  rows[mode].sort((a, b) => a.country.localeCompare(b.country));
}

let html = fs.readFileSync(indexPath, "utf8");
if (africaOnly) {
  const decoded = html.replaceAll("&quot;", '"').replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  const previousMatch = decoded.match(/const currentResearchRows = (\{[\s\S]*?\});\n\s*for \(const \[mode/);
  if (!previousMatch) throw new Error("Existing generated rows not found; cannot safely preserve other regions");
  const previous = JSON.parse(previousMatch[1]);
  for (const mode of Object.keys(rows)) {
    const updated = new Set(rows[mode].map((row) => row.iso3));
    rows[mode].push(...previous[mode].filter((row) => !updated.has(row.iso3)));
    rows[mode].sort((a, b) => a.country.localeCompare(b.country));
  }
}

const africaPublic = {
  reviewDate: africaSummary.review_date,
  publicationDate: "2026-11-10",
  coverageUnit: "Frozen uniRank institution-name entries; documented alias and predecessor/successor limits retained",
  counts: africaSummary.counts,
  strictReview: { baselineTargets: 1171, documented: 1171, recordsIncludingSupplementary: 1179, queryGaps: 0 },
  categories: ["explicit_blank", "explicit_value", "same_as_identity", "not_mentioned"],
  limitations: "Unavailable guides remain outside identity pies. Profiles are route availability, not inspected configuration contents. Participation counts are not guide counts. Combined eduroam/campus guides may appear in both network views; the union is deduplicated.",
  countries: africaSummary.country_results
};
const publicDir = path.join(repoDir, "data");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "africa-review-summary.json"), JSON.stringify(africaPublic, null, 2) + "\n");
if (rows.eduroam.filter((row) => africaCodes.has(africaSummary.country_results.find((country) => iso3ByIso2[country.code] === row.iso3)?.code)).length !== 52) {
  throw new Error("Not all 52 Africa country rows were generated");
}

// The repository had two diverging published snapshots. Preserve the later
// APAN reviews from the local exported site before applying generated rows.
if (!html.includes("// India uses the 894-university")) {
  const localLatest = fs.readFileSync(localLatestPath, "utf8");
  const start = localLatest.indexOf("  // India uses the 894-university");
  const end = localLatest.indexOf("  const ns = &quot;http://www.w3.org/2000/svg&quot;;", start);
  if (start < 0 || end < 0) throw new Error("Could not locate the later APAN override block");
  const laterApan = localLatest.slice(start, end);
  const insertAt = html.indexOf("  // Bangladesh uses the 160-institution");
  if (insertAt < 0) throw new Error("Could not locate Bangladesh insertion point");
  html = html.slice(0, insertAt) + laterApan + html.slice(insertAt);
}

const begin = "  // BEGIN GENERATED CURRENT RESEARCH OVERRIDES";
const end = "  // END GENERATED CURRENT RESEARCH OVERRIDES";
const generated = `${begin}\n` + escapeForSrcdoc(
  `  const currentResearchRows = ${JSON.stringify(rows)};\n` +
  `  for (const [mode, currentRows] of Object.entries(currentResearchRows)) {\n` +
  `    const currentIso3 = new Set(currentRows.map((item) => item.iso3));\n` +
  `    mapData[mode] = mapData[mode].filter((item) => !currentIso3.has(item.iso3));\n` +
  `    mapData[mode].push(...currentRows);\n` +
  `    mapData[mode].sort((a, b) => a.country.localeCompare(b.country));\n` +
  `  }\n`
) + `${end}\n\n`;

const oldStart = html.indexOf(begin);
if (oldStart >= 0) {
  const oldEnd = html.indexOf(end, oldStart);
  if (oldEnd < 0) throw new Error("Generated block end marker is missing");
  html = html.slice(0, oldStart) + generated + html.slice(oldEnd + end.length + 1);
} else {
  const insertAt = html.indexOf("  const ns = &quot;http://www.w3.org/2000/svg&quot;;");
  if (insertAt < 0) throw new Error("Could not locate generated-data insertion point");
  html = html.slice(0, insertAt) + generated + html.slice(insertAt);
}

fs.writeFileSync(indexPath, html);
console.log(`Generated ${rows.eduroam.length * 2} view rows from ${reviewFiles.length} country reviews.`);
