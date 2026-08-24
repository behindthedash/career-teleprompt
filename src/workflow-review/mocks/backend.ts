type EventHandler = (event: { event: string; id: number; payload: unknown }) => void;

export interface CommandCall {
  command: string;
  args: Record<string, unknown> | undefined;
}

const listeners = new Map<string, Set<EventHandler>>();
const commandCalls: CommandCall[] = [];
let eventId = 0;

const failureMode = new URLSearchParams(globalThis.location?.search ?? "").get("failure");

const workflowAnswer =
  "I would design the pipeline around durable event streams, idempotent consumers, explicit backpressure controls, and observable recovery paths.";

const ragAnswer =
  "The candidate built agentic retrieval workflows with evaluation, grounded context, and explicit human approval gates.";

const noMatchAnswer =
  "I could not find grounded knowledge-base evidence for that question, so I would ask for more context rather than invent an answer.";

const resource = {
  id: "workflow-resume",
  name: "workflow-resume.md",
  file_type: "md",
  file_path: "/fixtures/workflow-resume.md",
  size_bytes: 2048,
  token_count: 340,
  preview: "Agentic AI engineer with RAG, data engineering, and workflow automation experience.",
  loaded_at: "2026-08-24T00:00:00Z",
  chunk_count: 3,
  index_status: "indexed",
  last_indexed_at: "2026-08-24T00:00:00Z",
};

const ragResults = [
  {
    chunk_id: "workflow-chunk-1",
    text: "Built agentic RAG workflows that retrieve grounded evidence, evaluate retrieval quality, and keep high-risk actions behind explicit human approval gates.",
    score: 0.94,
    normalized_score: 0.94,
    source_file: "workflow-resume.md",
    source_id: "workflow-resume",
    chunk_index: 0,
  },
  {
    chunk_id: "workflow-chunk-2",
    text: "Designed data and AI systems spanning Snowflake, dbt, semantic retrieval, and autonomous engineering agents.",
    score: 0.86,
    normalized_score: 0.86,
    source_file: "workflow-resume.md",
    source_id: "workflow-resume",
    chunk_index: 1,
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function listen(event: string, handler: EventHandler): () => void {
  const handlers = listeners.get(event) ?? new Set<EventHandler>();
  handlers.add(handler);
  listeners.set(event, handlers);
  return () => handlers.delete(handler);
}

export function emit(event: string, payload: unknown): void {
  eventId += 1;
  const message = { event, id: eventId, payload };
  for (const handler of listeners.get(event) ?? []) {
    handler(message);
  }
}

async function streamAnswer(
  mode: string,
  content: string,
  options: { query?: string; includeRag?: boolean; transcriptCount?: number } = {},
) {
  await sleep(35);
  emit("llm_stream_start", {
    mode,
    model: "workflow-model",
    provider: "workflow-provider",
    system_prompt: "Workflow E2E system prompt",
    user_prompt: options.query ?? "Use the live interview context",
    include_transcript: mode !== "AskQuestion",
    include_rag: options.includeRag ?? true,
    include_instructions: true,
    include_question: true,
    temperature: 0.2,
    rag_query: options.query ?? "pipeline architecture experience",
    rag_chunks: options.includeRag === false ? [] : ragResults,
    rag_chunks_filtered: 0,
    rag_total_candidates: options.includeRag === false ? 0 : ragResults.length,
    transcript_window_seconds: 120,
    transcript_segments_count: options.transcriptCount ?? 0,
    transcript_segments_total: options.transcriptCount ?? 0,
  });

  const pieces = content.match(/.{1,34}(?:\s|$)/g) ?? [content];
  for (const piece of pieces) {
    await sleep(8);
    emit("llm_stream_token", { token: piece });
  }
  await sleep(10);
  emit("llm_stream_end", { total_tokens: 48, latency_ms: 120 });
}

export async function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  commandCalls.push({ command, args });

  switch (command) {
    case "list_meetings":
    case "search_meetings":
      return JSON.stringify([]) as T;
    case "list_context_resources":
      return JSON.stringify([resource]) as T;
    case "get_token_budget":
      return JSON.stringify({
        total: 340,
        limit: 12000,
        segments: [
          { label: "Resume", tokens: 340, color: "#60a5fa", category: "resume" },
          { label: "Headroom", tokens: 11660, color: "#64748b", category: "headroom" },
        ],
      }) as T;
    case "get_rag_status":
      return JSON.stringify({
        enabled: true,
        indexed_files: 1,
        total_files: 1,
        total_chunks: 3,
        total_tokens: 340,
        last_indexed_at: "2026-08-24T00:00:00Z",
      }) as T;
    case "get_rag_config":
      return JSON.stringify({
        enabled: true,
        embedding_model: "workflow-embedding",
        ollama_url: "http://127.0.0.1:11434",
        batch_size: 8,
        chunk_size: 500,
        chunk_overlap: 80,
        top_k: 5,
        similarity_threshold: 0.35,
        search_mode: "hybrid",
      }) as T;
    case "test_rag_search":
      await sleep(25);
      if (failureMode === "rag-error") {
        throw new Error("Synthetic RAG search failure");
      }
      return JSON.stringify(failureMode === "rag-empty" ? [] : ragResults) as T;
    case "test_rag_answer": {
      const query = String(args?.query ?? "knowledge base question");
      if (failureMode === "llm-error") {
        await sleep(35);
        emit("llm_stream_error", "Synthetic LLM timeout");
        return undefined as T;
      }
      const empty = failureMode === "rag-empty";
      await streamAnswer("AskQuestion", empty ? noMatchAnswer : ragAnswer, {
        query,
        includeRag: !empty,
      });
      return undefined as T;
    }
    case "start_meeting":
      return JSON.stringify({
        id: "workflow-meeting-001",
        title: "CI Interview",
        start_time: new Date().toISOString(),
        end_time: null,
        duration_seconds: null,
        transcript: [],
        ai_interactions: [],
        summary: null,
        config_snapshot: null,
        audio_mode: "online",
        ai_scenario: "interview",
      }) as T;
    case "start_capture_per_party":
      if (failureMode === "capture-error") {
        throw new Error("Synthetic audio device unavailable");
      }
      return undefined as T;
    case "generate_assist": {
      const rawSegments = String(args?.transcriptSegments ?? "[]");
      let transcriptCount = 0;
      try {
        transcriptCount = JSON.parse(rawSegments).length;
      } catch {
        transcriptCount = 0;
      }
      if (failureMode === "llm-error") {
        await sleep(35);
        emit("llm_stream_error", "Synthetic LLM timeout");
        return undefined as T;
      }
      await streamAnswer(String(args?.mode ?? "WhatToSay"), workflowAnswer, {
        includeRag: true,
        transcriptCount,
      });
      return undefined as T;
    }
    case "list_local_stt_engines":
      return JSON.stringify([]) as T;
    case "has_api_key":
      // The workflow harness models a provisioned Deepgram interviewer path so
      // production readiness checks pass before exercising meeting/capture E2E.
      // Other providers remain unconfigured unless a scenario explicitly adds them.
      return (args?.provider === "deepgram") as T;
    case "get_api_key":
      return null as T;
    case "get_custom_instructions":
      return "" as T;
    case "get_recording_enabled":
      return false as T;
    default:
      return undefined as T;
  }
}

export function getCommandCalls(): CommandCall[] {
  return commandCalls.map((call) => ({
    command: call.command,
    args: call.args ? { ...call.args } : undefined,
  }));
}

export function resetBackend(): void {
  commandCalls.length = 0;
}

export const workflowFixtures = {
  workflowAnswer,
  ragAnswer,
  noMatchAnswer,
  ragResults,
};