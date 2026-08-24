import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("fresh setup migrates interviewer to streaming local STT", async () => {
  const sttSetup = await read("src/components/wizard/STTSetupStep.tsx");

  assert.match(sttSetup, /DEFAULT_INTERVIEWER_STT_PROVIDER/);
  assert.match(sttSetup, /DEFAULT_INTERVIEWER_LOCAL_MODEL/);
  assert.match(sttSetup, /value:\s*"sherpa_onnx"/);
  assert.doesNotMatch(sttSetup, /Recommended \(Free\):[\s\S]*Windows[\s\S]*Them/);
});

test("live setup does not offer batch-only Whisper.cpp for interviewer", async () => {
  const sttSetup = await read("src/components/wizard/STTSetupStep.tsx");
  assert.match(sttSetup, /value:\s*"whisper_cpp"[\s\S]*supportsInterviewer:\s*false/);
  assert.match(sttSetup, /interviewerProviders = PROVIDERS\.filter/);
});

test("wizard gates progression on interviewer transcription readiness", async () => {
  const wizard = await read("src/components/wizard/FirstRunWizard.tsx");
  assert.match(wizard, /const \[sttReady, setSttReady\] = useState\(false\)/);
  assert.match(wizard, /currentStep === 2[\s\S]*\? sttReady/);
  assert.match(wizard, /onReadinessChange={setSttReady}/);
  assert.match(wizard, /currentStep === 3/);
  assert.doesNotMatch(wizard, /setFirstRunCompleted\(true\);[\s\S]*await startMeetingFlow\(\)/);
});

test("meeting start performs interviewer readiness preflight and aborts failed startup", async () => {
  const meetingStore = await read("src/stores/meetingStore.ts");
  assert.match(meetingStore, /getInterviewerTranscriptionReadiness/);
  assert.match(meetingStore, /Interviewer transcription is not ready/);
  assert.match(meetingStore, /await ipcEndMeeting\(meeting\.id\)/);
  assert.doesNotMatch(meetingStore, /Continue anyway — meeting is created/);
  assert.match(meetingStore, /Audio\/transcription failed to start/);
});
