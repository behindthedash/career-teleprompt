import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = baseUrlArg?.split("=")[1] ?? "http://127.0.0.1:4174";
const artifactDir = path.resolve("artifacts/resilience-e2e");
await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const results = [];

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

async function openKnowledgeBase(page) {
  await page.getByRole("heading", { name: "NexQ" }).waitFor();
  await page.getByRole("button", { name: "Test Knowledge Base", exact: true }).click();
  await page.getByRole("heading", { name: "Test Knowledge Base" }).waitFor();
}

async function askKnowledgeBase(page, query) {
  await page.getByPlaceholder("Ask a question about your documents...").fill(query);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
}

async function startInterview(page) {
  await page.getByRole("button", { name: /^Start Meeting\b/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Meeting setup" });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: /^Online\b/ }).first().click();
  await dialog.getByRole("button", { name: /^Team Meeting\b/ }).first().click();
  await dialog.getByRole("button", { name: /^Interview\b/ }).last().click();
  await dialog.getByRole("button", { name: "Start Meeting", exact: true }).click();
  await page.waitForFunction(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.state().view === "overlay");
}

async function runScenario(name, failure, body) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  let error = null;
  try {
    await page.goto(`${baseUrl}/workflow-review.html?failure=${encodeURIComponent(failure)}`, {
      waitUntil: "networkidle",
    });
    await body(page);
    await screenshot(page, `${name}-passed`);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    await screenshot(page, `${name}-failed`).catch(() => {});
  }

  results.push({ name, failure, passed: error === null, error, consoleErrors, pageErrors });
  await page.close();
  if (error) throw new Error(`${name}: ${error}`);
}

let failure = null;
try {
  await runScenario("rag-empty", "rag-empty", async (page) => {
    await openKnowledgeBase(page);
    await askKnowledgeBase(page, "What evidence exists for an unsupported topic?");
    await page.getByText(/could not find grounded knowledge-base evidence/i).waitFor();
    const calls = await page.evaluate(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.commandCalls() ?? []);
    if (!calls.some((call) => call.command === "test_rag_search")) throw new Error("RAG search did not run");
    if (!calls.some((call) => call.command === "test_rag_answer")) throw new Error("grounded answer path did not run");
  });

  await runScenario("rag-error", "rag-error", async (page) => {
    await openKnowledgeBase(page);
    await askKnowledgeBase(page, "Trigger retrieval failure");
    await page.getByText(/Synthetic RAG search failure/i).waitFor();
    await page.getByRole("button", { name: "Ask", exact: true }).waitFor({ state: "visible" });
  });

  await runScenario("llm-timeout", "llm-error", async (page) => {
    await openKnowledgeBase(page);
    await askKnowledgeBase(page, "Trigger LLM timeout");
    await page.getByText(/Synthetic LLM timeout/i).waitFor();
    await page.getByRole("button", { name: "Ask", exact: true }).waitFor({ state: "visible" });
  });

  await runScenario("capture-error", "capture-error", async (page) => {
    await page.getByRole("heading", { name: "NexQ" }).waitFor();
    await startInterview(page);
    await page.getByText("CI Interview", { exact: true }).first().waitFor();
    const state = await page.evaluate(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.state());
    if (state?.activeMeetingId !== "workflow-meeting-001") {
      throw new Error("meeting did not remain active after capture failure");
    }
    const calls = await page.evaluate(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.commandCalls() ?? []);
    if (!calls.some((call) => call.command === "start_capture_per_party")) {
      throw new Error("capture failure path was not exercised");
    }
    await page.getByRole("button", { name: "End meeting", exact: true }).click();
    await page.getByRole("heading", { name: "NexQ" }).waitFor();
  });
} catch (caught) {
  failure = caught instanceof Error ? caught : new Error(String(caught));
} finally {
  await fs.writeFile(
    path.join(artifactDir, "report.json"),
    JSON.stringify({ passed: failure === null, failure: failure?.message ?? null, results }, null, 2),
  );
  await context.tracing.stop({ path: path.join(artifactDir, "trace.zip") });
  await browser.close();
}

if (failure) {
  console.error(failure.stack ?? failure.message);
  process.exit(1);
}

console.log(`Resilience E2E passed ${results.length} failure/recovery scenarios.`);
