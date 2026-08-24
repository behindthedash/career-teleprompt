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
  const kbButton = page.getByRole("button", { name: /test.*(knowledge|kb)|knowledge base/i }).first();
  await kbButton.waitFor({ state: "visible" });
  await kbButton.click();
  await page.getByRole("heading", { name: "Test Knowledge Base" }).waitFor();
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

  // Start a real UI meeting flow and select interview mode.
  await page.getByRole("button", { name: "Start Meeting", exact: true }).first().click();
  const setupDialog = page.getByRole("dialog", { name: "Meeting setup" });
  await setupDialog.waitFor();
  await setupDialog.getByRole("button", { name: /Online/i }).first().click();
  const scenarioButton = setupDialog.getByRole("button", { name: /Team Meeting|Interview/i }).filter({ has: page.locator("svg") }).last();
  if (await scenarioButton.count()) {
    await scenarioButton.click();
  } else {
    await setupDialog.getByText("Team Meeting", { exact: true }).click();
  }
  const interviewOption = setupDialog.getByRole("button", { name: /Interview/i }).last();
  if (await interviewOption.count()) await interviewOption.click();
  await setupDialog.getByRole("button", { name: "Start Meeting", exact: true }).click();
  await page.getByRole("heading", { name: "CI Interview" }).waitFor();
  await checkpoint("meeting-started");

  // Simulate the native STT boundary: system audio becomes Interviewer transcript.
  const interviewerQuestion =
    "Can you walk me through how you would design a reliable real-time data pipeline?";
  await page.evaluate((text) => {
    window.__CAREER_TELEPROMPT_WORKFLOW__?.emitTranscriptFinal("Interviewer", text);
  }, interviewerQuestion);
  await page.getByText(interviewerQuestion).waitFor();

  // Click the production What to Say control. The mocked native command streams back
  // through the same llm_stream_* event subscriptions used by the Tauri app.
  await page.getByRole("button", { name: /What to Say/i }).click();
  await page.getByText(/I would design the pipeline around durable event streams/i).waitFor();
  await page.waitForFunction(() =>
    (window.__CAREER_TELEPROMPT_WORKFLOW__?.state().stream.responseCount ?? 0) > 0
  );
  const generationCall = await page.evaluate(() =>
    window.__CAREER_TELEPROMPT_WORKFLOW__?.commandCalls().find((call) => call.command === "generate_assist")
  );
  assert(generationCall, "What to Say did not invoke generate_assist");
  const serializedTranscript = String(generationCall.args?.transcriptSegments ?? "");
  assert(serializedTranscript.includes("reliable real-time data pipeline"), "generate_assist did not receive the live transcript");
  await checkpoint("what-to-say-answer");

  // Send the completed AI answer into the production teleprompter.
  await page.getByRole("button", { name: "Prompt this answer" }).click();
  await page.getByRole("heading", { name: "Teleprompter" }).waitFor();
  let state = await bridgeState();
  assert(state?.teleprompter.hasDocument, "AI answer was not loaded into the teleprompter");
  assert(state?.teleprompter.origin === "generated", "Teleprompter answer was not marked generated");

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
  await page.getByRole("button", { name: "Larger text" }).click();
  const afterFont = await page.evaluate(() => window.__CAREER_TELEPROMPT_WORKFLOW__?.state().teleprompter.fontSize);
  assert(Number(afterFont) > Number(beforeFont), "Larger text button did not change teleprompter font size");

  const followerButton = page.getByRole("button", { name: /Following|Recovered|Holding|Lost|Ready/i }).first();
  await followerButton.click();
  await page.getByRole("button", { name: /Paused/i }).waitFor();
  state = await bridgeState();
  assert(state?.teleprompter.followingEnabled === false, "Pause control did not disable speech following");
  await page.getByRole("button", { name: /Paused/i }).click();
  state = await bridgeState();
  assert(state?.teleprompter.followingEnabled === true, "Resume control did not re-enable speech following");
  await checkpoint("teleprompter-following");

  // End the meeting and prove the control returns the workflow to the launcher.
  const endButton = page.getByRole("button", { name: /End Meeting|Stop Meeting|End/i }).last();
  await endButton.waitFor({ state: "visible" });
  await endButton.click();
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
