import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = baseUrlArg?.split("=")[1] ?? "http://127.0.0.1:4174";
const artifactDir = path.resolve("artifacts/full-workflow-e2e");
await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const checkpoints = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));

async function checkpoint(name) {
  checkpoints.push(name);
  await page.screenshot({
    path: path.join(artifactDir, `${String(checkpoints.length).padStart(2, "0")}-${name}.png`),
    fullPage: true,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function bridgeState() {
  return page.evaluate(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.state());
}

let failure = null;
try {
  await page.goto(`${baseUrl}/workflow-review.html`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "NexQ" }).waitFor();
  await checkpoint("launcher");

  // RAG search + streamed answer through the real Knowledge Base dialog.
  const kbButton = page.getByRole("button", { name: "Test Knowledge Base", exact: true });
  await kbButton.waitFor({ state: "visible" });
  await kbButton.click();
  const kbHeading = page.getByRole("heading", { name: "Test Knowledge Base" });
  await kbHeading.waitFor();
  const ragQuery = "What AI and RAG experience does the candidate have?";
  await page.getByPlaceholder("Ask a question about your documents...").fill(ragQuery);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByText(/Built agentic RAG workflows that retrieve grounded evidence/i).waitFor();
  await page.getByText(/candidate built agentic retrieval workflows with evaluation/i).waitFor();
  const ragCalls = await page.evaluate(() =>
    window.__CAREER_TELEPROMPT_WORKFLOW__?.commandCalls().filter((call) =>
      call.command === "test_rag_search" || call.command === "test_rag_answer"
    ) ?? []
  );
  assert(ragCalls.some((call) => call.command === "test_rag_search"), "RAG search command was not invoked");
  assert(ragCalls.some((call) => call.command === "test_rag_answer"), "RAG answer command was not invoked");
  await checkpoint("rag-search-and-answer");
  await page.locator('button[title="Close (Esc)"]').click();
  await kbHeading.waitFor({ state: "hidden" });

  // Start the actual launcher flow. The launcher button includes its Ctrl+M
  // shortcut in the accessible name, so match the real name instead of forcing
  // an exact text-only label.
  const launcherStart = page.getByRole("button", { name: /^Start Meeting\b/ }).first();
  await launcherStart.waitFor({ state: "visible" });
  await launcherStart.click();

  const setupDialog = page.getByRole("dialog", { name: "Meeting setup" });
  await setupDialog.waitFor();
  await setupDialog.getByRole("button", { name: /^Online\b/ }).first().click();

  // Open the real scenario picker and choose Interview.
  await setupDialog.getByRole("button", { name: /^Team Meeting\b/ }).first().click();
  const interviewOption = setupDialog.getByRole("button", { name: /^Interview\b/ }).last();
  await interviewOption.waitFor({ state: "visible" });
  await interviewOption.click();
  await setupDialog.getByRole("button", { name: "Start Meeting", exact: true }).click();

  await page.waitForFunction(() => {
    const state = window.__CAREER_TELEPROMPT_WORKFLOW__?.state();
    return state?.view === "overlay" && state.activeMeetingId === "workflow-meeting-001";
  });
  await page.getByText("CI Interview", { exact: true }).first().waitFor();
  await checkpoint("meeting-started");

  // Give the production event hooks a render turn after the launcher swaps to
  // the overlay, then simulate the native STT boundary.
  await page.waitForTimeout(100);
  const interviewerQuestion =
    "Can you walk me through how you would design a reliable real-time data pipeline?";
  await page.evaluate((text) => {
    window.__CAREER_TELEPROMPT_WORKFLOW__?.emitTranscriptFinal("Interviewer", text);
  }, interviewerQuestion);
  await page.getByText(interviewerQuestion).waitFor();

  // Click the production interview "Say" action. Its configured mode remains
  // WhatToSay; the current UI exposes the control as "Say (1)".
  await page.getByRole("button", { name: /^Say \(1\)$/ }).click();
  await page.getByText(/I would design the pipeline around durable event streams/i).waitFor();
  await page.waitForFunction(() =>
    (window.__CAREER_TELEPROMPT_WORKFLOW__?.state().stream.responseCount ?? 0) > 0
  );
  const generationCall = await page.evaluate(() =>
    window.__CAREER_TELEPROMPT_WORKFLOW__?.commandCalls().find((call) => call.command === "generate_assist")
  );
  assert(generationCall, "Say did not invoke generate_assist");
  assert(generationCall.args?.mode === "WhatToSay", "Say did not use the WhatToSay generation mode");
  const serializedTranscript = String(generationCall.args?.transcriptSegments ?? "");
  assert(serializedTranscript.includes("reliable real-time data pipeline"), "generate_assist did not receive the live transcript");

  // Production intentionally auto-hands the first completed WhatToSay response
  // into an empty teleprompter and switches the overlay to teleprompt mode.
  await page.getByRole("heading", { name: "Teleprompter" }).waitFor();
  let state = await bridgeState();
  assert(state?.teleprompter.hasDocument, "WhatToSay answer did not auto-load into the teleprompter");
  assert(state?.teleprompter.origin === "generated", "Auto-loaded teleprompter answer was not marked generated");
  await checkpoint("what-to-say-auto-handoff");

  // Simulate microphone/STT output from the user's speech. This enters through
  // transcript_final and drives the real speech-following hook.
  await page.evaluate(() => {
    window.__CAREER_TELEPROMPT_WORKFLOW__?.emitTranscriptFinal(
      "User",
      "I would design the pipeline around durable event streams, idempotent consumers,"
    );
    window.__CAREER_TELEPROMPT_WORKFLOW__?.emitTranscriptFinal(
      "User",
      "explicit backpressure controls, and observable recovery paths."
    );
  });
  await page.waitForFunction(() => {
    const teleprompter = window.__CAREER_TELEPROMPT_WORKFLOW__?.state().teleprompter;
    return Boolean(teleprompter && teleprompter.cursorTokenIndex > 0 && teleprompter.followerStatus !== "idle");
  });
  state = await bridgeState();
  assert((state?.teleprompter.cursorTokenIndex ?? 0) > 0, "User speech did not advance the teleprompter cursor");

  // Exercise live teleprompter controls, not just rendering.
  const beforeFont = await page.evaluate(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.state().teleprompter.fontSize);
  await page.locator('button[title="Larger text"]').click();
  const afterFont = await page.evaluate(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.state().teleprompter.fontSize);
  assert(Number(afterFont) > Number(beforeFont), "Larger text button did not change teleprompter font size");

  await page.locator('button[title="Pause speech following"]').click();
  await page.waitForFunction(() =>
    window.__CAREER_TELEPROMPT_WORKFLOW__?.state().teleprompter.followingEnabled === false
  );
  await page.locator('button[title="Resume speech following"]').click();
  await page.waitForFunction(() =>
    window.__CAREER_TELEPROMPT_WORKFLOW__?.state().teleprompter.followingEnabled === true
  );
  await checkpoint("teleprompter-following");

  // End the meeting and prove the real control returns to the launcher.
  const endButton = page.getByRole("button", { name: "End meeting", exact: true });
  await endButton.waitFor({ state: "visible" });
  await endButton.click();
  await page.waitForFunction(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.state().view === "launcher");
  await page.getByRole("heading", { name: "NexQ" }).waitFor();
  await checkpoint("meeting-ended");
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
  await page.screenshot({ path: path.join(artifactDir, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  const finalState = await bridgeState().catch(() => null);
  const commandCalls = await page.evaluate(() =>
    window.__CAREER_TELEPROMPT_WORKFLOW__?.commandCalls() ?? []
  ).catch(() => []);
  await fs.writeFile(
    path.join(artifactDir, "report.json"),
    JSON.stringify(
      {
        passed: failure === null,
        failure: failure?.message ?? null,
        checkpoints,
        consoleErrors,
        pageErrors,
        finalState,
        commandCalls,
      },
      null,
      2,
    ),
  );
  await context.tracing.stop({ path: path.join(artifactDir, "trace.zip") });
  await browser.close();
}

if (failure) {
  console.error(failure.stack ?? failure.message);
  process.exit(1);
}

console.log(`Full workflow E2E passed with ${checkpoints.length} checkpoints.`);
