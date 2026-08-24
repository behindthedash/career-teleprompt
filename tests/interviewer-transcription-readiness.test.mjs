import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("fresh setup defaults interviewer to streaming local STT", async () => {
  const audioSetup = await read("src/components/wizard/AudioSetupStep.tsx");
  const sttSetup = await read("src/components/wizard/STTSetupStep.tsx");

  assert.match(audioSetup, /stt_provider:\s*DEFAULT_INTERVIEWER_STT_PROVIDER/);
  assert.match(audioSetup, /local_model_id:\s*DEFAULT_INTERVIEWER_LOCAL_MODEL/);
  assert.match(sttSetup, /DEFAULT_INTERVIEWER_STT_PROVIDER/);
  assert.doesNotMatch(sttSetup, /Recommended \(Free\):[\s\S]*Windows[\s\S]*Them/);
});

test("live setup does not offer batch-only Whisper.cpp for interviewer", async () => {
  const sttSetup = await read("src/components/wizard/STTSetupStep.tsx");
  assert.match(sttSetup, /supportsInterviewer:\s*false/);
  assert.match(sttSetup, /value:\s*"whisper_cpp"/);
});

test("wizard gates progression on interviewer transcription readiness", async () => {
  const wizard = await read("src/components/wizard/FirstRunWizard.tsx");
  assert.match(wizard, /const \[sttReady, setSttReady\] = useState\(false\)/);
  assert.match(wizard, /currentStep === 2 \? sttReady/);
  assert.match(wizard, /onReadinessChange={setSttReady}/);
  assert.match(wizard, /currentStep !== 2/);
});

test("meeting start performs interviewer readiness preflight", async () => {
  const meetingStore = await read("src/stores/meetingStore.ts");
  assert.match(meetingStore, /getInterviewerTranscriptionReadiness/);
  assert.match(meetingStore, /Interviewer transcription is not ready/);
  assert.match(meetingStore, /await ipcEndMeeting\(meeting\.id\)/);
});
