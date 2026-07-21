import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const args = process.argv.slice(2);
const useRemote = args.includes("--remote");
const DB_NAME = "mednexus-db";
const WRANGLER = join(root, "node_modules", ".bin", "wrangler");
const OUTPUT_DIR = join(root, useRemote ? "failure-reports-remote" : "failure-reports");

function wranglerQuery(sql) {
  const target = useRemote ? "remote" : "local";
  try {
    const out = execSync(`"${WRANGLER}" d1 execute ${DB_NAME} --${target} --json --command "${sql.replace(/"/g, '\\"')}"`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const jsonStart = out.indexOf("[");
    const jsonStr = jsonStart >= 0 ? out.slice(jsonStart) : out;
    return JSON.parse(jsonStr);
  } catch (err) {
    const msg = err.stderr?.toString() || err.message || String(err);
    throw new Error(`wrangler query failed: ${msg}`);
  }
}

function getRows(result) {
  if (!result || !Array.isArray(result.results)) return [];
  return result.results;
}

function escapeMd(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(failures, stats) {
  const lines = [];
  lines.push("# Generation Failure Report");
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total failures | ${stats.total} |`);
  lines.push(`| Unique patterns | ${stats.unique} |`);
  lines.push(`| Auth errors | ${stats.byCategory.auth || 0} |`);
  lines.push(`| Rate limit | ${stats.byCategory.rate_limit || 0} |`);
  lines.push(`| Network errors | ${stats.byCategory.network || 0} |`);
  lines.push(`| Timeout | ${stats.byCategory.timeout || 0} |`);
  lines.push(`| Parse errors | ${stats.byCategory.parse || 0} |`);
  lines.push(`| Model errors | ${stats.byCategory.model_error || 0} |`);
  lines.push(`| Unknown | ${stats.byCategory.unknown || 0} |`);
  lines.push("");

  if (failures.length === 0) {
    lines.push("_No failures recorded._");
    return lines.join("\n");
  }

  lines.push("## Failures");
  lines.push("");

  const grouped = new Map();
  for (const f of failures) {
    const key = `${f.operation}|||${f.model}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(f);
  }

  let idx = 0;
  for (const [key, items] of grouped) {
    const [op, , model] = key.split("|||");
    lines.push(`### ${idx + 1}. ${escapeMd(op)} \`${escapeMd(model)}\``);
    lines.push("");
    lines.push(`Occurrences: **${items.length}**`);
    lines.push("");

    for (const f of items.slice(0, 20)) {
      const ts = f.lastSeenAt || f.createdAt;
      const date = ts ? new Date(ts).toISOString() : "unknown";
      lines.push(`- **${escapeMd(date)}** — ${escapeMd(f.errorMessage || "Unknown error")}`);
      if (f.inputPreview) {
        lines.push(`  - Input: \`${escapeMd(f.inputPreview)}\``);
      }
      if (f.errorStack) {
        const stackLines = (f.errorStack || "").split("\n").slice(0, 5).join("  \n    ");
        lines.push(`  - Stack:  \n    ${escapeMd(stackLines)}`);
      }
      lines.push("");
    }
    idx++;
  }

  return lines.join("\n");
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("Querying local D1 database...");

  const errorResults = getRows(wranglerQuery("SELECT * FROM error_logs ORDER BY last_seen_at DESC"));
  const genFailures = getRows(
    wranglerQuery("SELECT * FROM generation_logs WHERE success = 0 ORDER BY created_at DESC")
  );

  const categoryCounts = { auth: 0, rate_limit: 0, network: 0, timeout: 0, parse: 0, model_error: 0, unknown: 0 };
  for (const e of errorResults) {
    categoryCounts[e.errorType] = (categoryCounts[e.errorType] || 0) + 1;
  }

  const stats = {
    total: errorResults.length,
    unique: new Set(errorResults.map((e) => `${e.operation}|||${e.model}|||${e.inputHash}`)).size,
    byCategory: categoryCounts,
  };

  const markdown = renderMarkdown(errorResults, stats);

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const datedPath = join(OUTPUT_DIR, `${ts}.md`);
  const latestPath = join(OUTPUT_DIR, "latest.md");

  const { writeFileSync } = await import("fs");
  writeFileSync(datedPath, markdown);
  writeFileSync(latestPath, markdown);

  console.log(`Report written to: ${datedPath}`);
  console.log(`Also updated: ${latestPath}`);
  console.log(`Total failure patterns: ${stats.total} (unique: ${stats.unique})`);
}

main().catch((err) => {
  console.error("Failed to export failures:", err.message);
  process.exit(1);
});
