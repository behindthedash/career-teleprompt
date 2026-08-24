import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const axeSource = require("axe-core").source;

const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = (baseUrlArg?.split("=")[1] ?? "http://127.0.0.1:4173").replace(/\/$/, "");
const outputDir = path.resolve("artifacts/visual-review");
const screenshotDir = path.join(outputDir, "screenshots");

const settingsTabs = [
  ["audio-devices", "Audio & Devices"],
  ["llm-providers", "LLM Providers"],
  ["stt-providers", "STT Providers"],
  ["translation", "Translation"],
  ["ai-actions", "AI Actions"],
  ["context-strategy", "Context Strategy"],
  ["ai-scenarios", "AI Scenarios"],
  ["noise-presets", "Noise Presets"],
  ["confidence", "Confidence"],
  ["hotkeys", "Hotkeys"],
  ["general", "General"],
  ["about", "About"],
];

const screens = [
  { id: "launcher", title: "Launcher", url: "/visual-review.html?screen=launcher", viewport: { width: 1180, height: 760 } },
  { id: "overlay", title: "Meeting overlay", url: "/visual-review.html?screen=overlay", viewport: { width: 1200, height: 440 } },
  { id: "settings-modal", title: "Settings modal", url: "/visual-review.html?screen=settings-modal", viewport: { width: 900, height: 640 } },
  { id: "devlog", title: "Developer log", url: "/visual-review.html?screen=devlog", viewport: { width: 1100, height: 720 } },
  ...settingsTabs.map(([id, label]) => ({
    id: `settings-${id}`,
    title: `Settings — ${label}`,
    url: "/visual-review.html?screen=settings",
    viewport: { width: 1180, height: 760 },
    tab: label,
  })),
  ...["Welcome", "Audio", "STT", "LLM", "Ready"].map((label, step) => ({
    id: `wizard-${step + 1}-${label.toLowerCase()}`,
    title: `Setup wizard — ${label}`,
    url: `/visual-review.html?screen=wizard&step=${step}`,
    viewport: { width: 1100, height: 760 },
  })),
];

const findings = [];
const screenshots = [];

function severityFromImpact(impact) {
  if (impact === "critical" || impact === "serious") return "high";
  if (impact === "moderate") return "medium";
  return "low";
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function addFinding(finding) {
  const issueKey = finding.issueKey ?? `${finding.category}:${finding.rule ?? finding.title}`;
  findings.push({
    ...finding,
    issueKey,
    fingerprint: fingerprint(`${issueKey}:${finding.screen}`),
  });
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const screen of screens) {
    const context = await browser.newContext({ viewport: screen.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`${baseUrl}${screen.url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    if (screen.tab) {
      const tab = page.getByRole("tab", { name: screen.tab, exact: true });
      if ((await tab.count()) === 0) {
        addFinding({
          screen: screen.id,
          screenTitle: screen.title,
          category: "navigation",
          severity: "high",
          rule: "settings-tab-missing",
          issueKey: `navigation:settings-tab-missing:${screen.tab}`,
          title: `Settings tab cannot be reached: ${screen.tab}`,
          details: `The visual review harness could not find the ${screen.tab} tab by its accessible role and name.`,
          recommendation: "Ensure the settings destination is exposed as a labeled tab and remains keyboard/accessibility discoverable.",
        });
      } else {
        await tab.click();
        await page.waitForTimeout(350);
      }
    }

    const screenshotPath = path.join(screenshotDir, `${screen.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push({ id: screen.id, title: screen.title, path: path.relative(outputDir, screenshotPath), viewport: screen.viewport });

    const renderFailure = await page.getByText("Visual review screen failed to render", { exact: false }).count();
    if (renderFailure > 0) {
      addFinding({
        screen: screen.id,
        screenTitle: screen.title,
        category: "rendering",
        severity: "high",
        rule: "screen-render-failure",
        issueKey: `rendering:screen-render-failure:${screen.id}`,
        title: `${screen.title} fails to render in the visual harness`,
        details: "The application ErrorBoundary rendered its fallback instead of the requested screen.",
        recommendation: "Fix the screen's browser-safe rendering path or extend the visual harness mock for the required native call.",
      });
    }

    for (const message of [...new Set(pageErrors)]) {
      addFinding({
        screen: screen.id,
        screenTitle: screen.title,
        category: "runtime",
        severity: "high",
        rule: "page-error",
        issueKey: `runtime:page-error:${fingerprint(message)}`,
        title: `${screen.title} throws a browser runtime error`,
        details: message.slice(0, 1200),
        recommendation: "Resolve the runtime exception or make the affected native dependency degrade safely in the review harness.",
      });
    }

    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        resultTypes: ["violations"],
        rules: {
          "color-contrast": { enabled: true },
        },
      });
      return result.violations;
    });

    for (const violation of axe) {
      const severity = severityFromImpact(violation.impact);
      addFinding({
        screen: screen.id,
        screenTitle: screen.title,
        category: "accessibility",
        severity,
        rule: violation.id,
        issueKey: `accessibility:${violation.id}`,
        title: violation.help,
        details: `${violation.description} Affected nodes on this screen: ${violation.nodes.length}. Example target: ${violation.nodes[0]?.target?.join(" ") ?? "n/a"}.`,
        recommendation: violation.helpUrl,
      });
    }

    const layout = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const interactive = Array.from(document.querySelectorAll("button, a[href], input, select, textarea, [role='button'], [role='tab'], [tabindex]"))
        .filter((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const label = (
            el.getAttribute("aria-label") ||
            el.getAttribute("title") ||
            el.getAttribute("placeholder") ||
            el.textContent ||
            ""
          ).trim();
          return {
            tag: el.tagName.toLowerCase(),
            label: label.slice(0, 120),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
          };
        });

      const unlabeled = interactive.filter((item) => !item.label);
      const offscreen = interactive.filter((item) => item.right > viewportWidth + 2 || item.left < -2 || item.bottom > viewportHeight + 2 || item.top < -2);
      const tinyTargets = interactive.filter((item) => item.width < 24 || item.height < 24);
      const documentOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewportWidth;
      const headings = Array.from(document.querySelectorAll("h1, h2, [role='heading']"))
        .map((el) => (el.textContent || "").trim())
        .filter(Boolean);
      const buttons = interactive.filter((item) => item.tag === "button" || item.tag === "a");

      return {
        unlabeled,
        offscreen,
        tinyTargets,
        documentOverflow,
        headings,
        buttonCount: buttons.length,
      };
    });

    if (layout.documentOverflow > 2) {
      addFinding({
        screen: screen.id,
        screenTitle: screen.title,
        category: "layout",
        severity: "high",
        rule: "horizontal-overflow",
        issueKey: "layout:horizontal-overflow",
        title: "Screen introduces horizontal overflow",
        details: `${screen.title} is ${layout.documentOverflow}px wider than its review viewport (${screen.viewport.width}px).`,
        recommendation: "Remove unintended fixed-width overflow or make the affected region intentionally scrollable without pushing the whole screen.",
      });
    }

    if (layout.unlabeled.length > 0) {
      addFinding({
        screen: screen.id,
        screenTitle: screen.title,
        category: "usability",
        severity: "high",
        rule: "unlabeled-interactive-control",
        issueKey: "usability:unlabeled-interactive-control",
        title: "Interactive controls lack understandable labels",
        details: `${layout.unlabeled.length} visible interactive control(s) have no text, aria-label, title, or placeholder.`,
        recommendation: "Give every icon-only or otherwise non-text control an accessible name that also explains its purpose to assistive technology.",
      });
    }

    if (layout.offscreen.length > 0) {
      const sample = layout.offscreen.slice(0, 3).map((item) => `${item.tag} “${item.label || "unlabeled"}”`).join(", ");
      addFinding({
        screen: screen.id,
        screenTitle: screen.title,
        category: "layout",
        severity: "medium",
        rule: "interactive-control-offscreen",
        issueKey: "layout:interactive-control-offscreen",
        title: "Interactive controls extend outside the visible screen",
        details: `${layout.offscreen.length} visible interactive control(s) extend outside the viewport. Examples: ${sample}.`,
        recommendation: "Keep primary controls within the visible application window or place them in an intentional, discoverable scroll region.",
      });
    }

    if (layout.tinyTargets.length > 0) {
      addFinding({
        screen: screen.id,
        screenTitle: screen.title,
        category: "usability",
        severity: "low",
        rule: "small-target",
        issueKey: "usability:small-target",
        title: "Some interactive targets are very small",
        details: `${layout.tinyTargets.length} visible target(s) are under 24px in at least one dimension.`,
        recommendation: "Consider increasing hit areas for frequently used or icon-only controls, especially in the meeting overlay where speed matters.",
      });
    }

    if (layout.headings.length === 0 && layout.buttonCount >= 4) {
      addFinding({
        screen: screen.id,
        screenTitle: screen.title,
        category: "information-architecture",
        severity: "medium",
        rule: "missing-screen-heading",
        issueKey: "information-architecture:missing-screen-heading",
        title: "Feature-dense screen lacks a clear heading",
        details: `${screen.title} exposes ${layout.buttonCount} interactive actions but no visible h1/h2/heading landmark.`,
        recommendation: "Add a concise screen or section heading so users can immediately understand where they are and what the surface is for.",
      });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const counts = findings.reduce((acc, finding) => {
  acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
  return acc;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  screenCount: screens.length,
  screenshotCount: screenshots.length,
  counts,
  screenshots,
  findings,
};

await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));

const markdown = [
  "# Visual UX review",
  "",
  `Screens captured: **${screens.length}**`,
  `Findings: **${findings.length}** (high: ${counts.high ?? 0}, medium: ${counts.medium ?? 0}, low: ${counts.low ?? 0})`,
  "",
  "## Screenshots",
  "",
  ...screenshots.map((shot) => `- ${shot.title}: \`${shot.path}\``),
  "",
  "## Findings",
  "",
  ...(findings.length === 0
    ? ["No automated accessibility, layout, or discoverability concerns were detected."]
    : findings.map((finding) => `- **[${finding.severity.toUpperCase()}] ${finding.screenTitle} — ${finding.title}** — ${finding.details}`)),
  "",
].join("\n");

await fs.writeFile(path.join(outputDir, "summary.md"), markdown);

console.log(`Captured ${screens.length} screens and found ${findings.length} review item(s).`);
console.log(`High: ${counts.high ?? 0}; medium: ${counts.medium ?? 0}; low: ${counts.low ?? 0}`);
