import fs from "node:fs/promises";
import crypto from "node:crypto";

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
const stepSummary = process.env.GITHUB_STEP_SUMMARY;

if (!token || !repository) {
  throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
}

const [owner, repo] = repository.split("/");
const report = JSON.parse(await fs.readFile("artifacts/visual-review/report.json", "utf8"));
const publishable = report.findings.filter((finding) => finding.severity === "high" || finding.severity === "medium");

const severityRank = { low: 1, medium: 2, high: 3 };
const grouped = new Map();

for (const finding of publishable) {
  const key = finding.issueKey;
  const current = grouped.get(key) ?? {
    key,
    title: finding.title,
    category: finding.category,
    severity: finding.severity,
    recommendation: finding.recommendation,
    findings: [],
  };
  current.findings.push(finding);
  if (severityRank[finding.severity] > severityRank[current.severity]) {
    current.severity = finding.severity;
  }
  grouped.set(key, current);
}

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

async function github(apiPath, options = {}) {
  const response = await fetch(`https://api.github.com${apiPath}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function appendSummary(markdown) {
  if (!stepSummary) return;
  await fs.appendFile(stepSummary, `${markdown}\n`);
}

async function listOpenIssues() {
  const issues = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await github(`/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}`);
    issues.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) break;
  }
  return issues;
}

function markerFor(key) {
  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 20);
  return `<!-- career-teleprompt-visual-review:${hash} -->`;
}

function issueBody(group) {
  const marker = markerFor(group.key);
  const runUrl = runId ? `https://github.com/${repository}/actions/runs/${runId}` : `https://github.com/${repository}/actions`;
  const screenLines = group.findings
    .map((finding) => `- **${finding.screenTitle}** (\`${finding.screen}\`): ${finding.details}`)
    .join("\n");

  return `${marker}\n## Automated visual/UX review finding\n\n**Severity:** ${group.severity}\n**Category:** ${group.category}\n\n${screenLines}\n\n### Suggested improvement\n\n${group.recommendation}\n\n### Evidence\n\nThe CI visual review captured the affected screens and stored the PNGs plus \`report.json\` and \`summary.md\` in the **career-teleprompt-visual-review** workflow artifact.\n\nLatest review run: ${runUrl}\n\n---\n_This issue is created and refreshed automatically. The workflow intentionally groups the same concern across screens so the issue tracker does not get flooded with duplicates._\n`;
}

const repoInfo = await github(`/repos/${owner}/${repo}`);
if (!repoInfo.has_issues) {
  const message = `GitHub Issues are disabled for ${repository}. Captured ${report.screenshotCount} screenshots and found ${grouped.size} medium/high finding group(s), but issue publication is paused until Issues are enabled in repository settings.`;
  console.warn(`::warning title=Visual UX issue publishing paused::${message}`);
  await appendSummary(`## Visual UX issue publishing paused\n\n${message}\n\nOnce Issues are enabled, rerun this workflow (or push to \`dev\`) and the findings will be created automatically.`);
  process.exit(0);
}

const openIssues = await listOpenIssues();
let created = 0;
let updated = 0;

for (const group of grouped.values()) {
  const marker = markerFor(group.key);
  const existing = openIssues.find((issue) => issue.body?.includes(marker));
  const title = `[Visual UX] ${group.title}`;
  const body = issueBody(group);

  if (existing) {
    if (existing.title !== title || existing.body !== body) {
      await github(`/repos/${owner}/${repo}/issues/${existing.number}`, {
        method: "PATCH",
        body: JSON.stringify({ title, body }),
      });
      updated += 1;
    }
  } else {
    await github(`/repos/${owner}/${repo}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body }),
    });
    created += 1;
  }
}

const result = `Publishable finding groups: ${grouped.size}; issues created: ${created}; refreshed: ${updated}`;
console.log(result);
await appendSummary(`## Visual UX issue publication\n\n${result}.`);
