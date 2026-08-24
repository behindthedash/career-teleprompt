pub mod action_config;
pub mod context_builder;
pub mod prompt_templates;
pub mod question_detector;
pub mod transcript_buffer;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::Emitter;

use action_config::AllActionConfigs;
use context_builder::ContextBuilder;
use question_detector::{DetectedQuestion, QuestionDetector};
use transcript_buffer::TranscriptBuffer;

use crate::llm::provider::GenerationParams;

/// Event payload for question detection events emitted to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionDetectedPayload {
    pub question: DetectedQuestion,
}

/// Orchestrates: read transcript -> detect question -> load context -> build prompt -> LLM stream
pub struct IntelligenceEngine {
    pub transcript_buffer: TranscriptBuffer,
    question_detector: QuestionDetector,
    auto_trigger: AtomicBool,
    is_generating: AtomicBool,
    cancel_requested: Arc<AtomicBool>,
    last_detected_question: Option<DetectedQuestion>,
    action_configs: AllActionConfigs,
}

impl IntelligenceEngine {
    pub fn new() -> Self {
        Self {
            transcript_buffer: TranscriptBuffer::new(),
            question_detector: QuestionDetector::new(),
            auto_trigger: AtomicBool::new(true),
            is_generating: AtomicBool::new(false),
            cancel_requested: Arc::new(AtomicBool::new(false)),
            last_detected_question: None,
            action_configs: AllActionConfigs::default(),
        }
    }

    /// Push a transcript segment into the buffer and run question detection.
    /// Returns detected questions (if any) so the caller can emit events.
    pub fn push_transcript(
        &mut self,
        text: String,
        speaker: String,
        timestamp_ms: u64,
        is_final: bool,
    ) -> Vec<DetectedQuestion> {
        self.transcript_buffer
            .push_segment(text.clone(), speaker.clone(), timestamp_ms, is_final);

        if !is_final {
            return Vec::new();
        }

        let questions = self
            .question_detector
            .detect_questions(&text, timestamp_ms, &speaker);

        if let Some(q) = questions.iter().max_by(|a, b| {
            a.confidence
                .partial_cmp(&b.confidence)
                .unwrap_or(std::cmp::Ordering::Equal)
        }) {
            self.last_detected_question = Some(q.clone());
        }

        questions
    }

    /// Main entry point: generate AI assistance in the given mode.
    pub async fn generate_assist(
        system_prompt: &str,
        mode: &str,
        custom_question: Option<&str>,
        transcript_text: String,
        last_question: Option<DetectedQuestion>,
        context_text: String,
        include_context: bool,
        include_transcript: bool,
        include_question: bool,
        include_rag: bool,
        include_instructions: bool,
        llm_provider: Arc<tokio::sync::Mutex<Box<dyn crate::llm::provider::LLMProvider>>>,
        model: String,
        provider_name: String,
        params: GenerationParams,
        temperature: f64,
        rag_query: Option<String>,
        rag_chunks: Vec<crate::llm::provider::RagChunkInfo>,
        rag_chunks_filtered: usize,
        rag_total_candidates: usize,
        rag_diagnostics: Option<crate::llm::provider::RagDiagnostics>,
        transcript_window_seconds: u64,
        transcript_segments_count: usize,
        transcript_segments_total: usize,
        app_handle: tauri::AppHandle,
        cancel_flag: Arc<AtomicBool>,
    ) -> Result<(), String> {
        cancel_flag.store(false, Ordering::SeqCst);

        let builder = ContextBuilder::new();
        let messages = builder.build_prompt_with_config(
            system_prompt,
            &transcript_text,
            last_question.as_ref(),
            &context_text,
            custom_question,
            include_context,
            include_transcript,
            include_question,
        );

        if cancel_flag.load(Ordering::SeqCst) {
            return Ok(());
        }

        let system_msg = messages.iter()
            .find(|m| m.role == "system")
            .map(|m| m.content.clone())
            .unwrap_or_default();
        let user_msg = messages.iter()
            .find(|m| m.role == "user")
            .map(|m| m.content.clone())
            .unwrap_or_default();

        let _ = app_handle.emit(
            "llm_stream_start",
            crate::llm::provider::StreamStartPayload {
                mode: mode.to_string(),
                model: model.clone(),
                provider: provider_name.clone(),
                system_prompt: system_msg,
                user_prompt: user_msg,
                include_transcript,
                include_rag,
                include_instructions,
                include_question,
                temperature,
                rag_query,
                rag_chunks,
                rag_chunks_filtered,
                rag_total_candidates,
                rag_diagnostics,
                transcript_window_seconds,
                transcript_segments_count,
                transcript_segments_total,
            },
        );

        let provider_guard = llm_provider.lock().await;
        let result = provider_guard
            .stream_completion(messages, &model, params, app_handle.clone())
            .await;

        match result {
            Ok(_stats) => Ok(()),
            Err(e) => {
                let _ = app_handle.emit("llm_stream_error", e.to_string());
                Err(e.to_string())
            }
        }
    }

    pub fn cancel(&self) {
        self.cancel_requested.store(true, Ordering::SeqCst);
    }

    pub fn cancel_flag(&self) -> Arc<AtomicBool> {
        self.cancel_requested.clone()
    }

    pub fn is_generating(&self) -> bool {
        self.is_generating.load(Ordering::SeqCst)
    }

    pub fn set_generating(&self, generating: bool) {
        self.is_generating.store(generating, Ordering::SeqCst);
    }

    pub fn set_auto_trigger(&self, enabled: bool) {
        self.auto_trigger.store(enabled, Ordering::SeqCst);
    }

    pub fn auto_trigger_enabled(&self) -> bool {
        self.auto_trigger.load(Ordering::SeqCst)
    }

    pub fn set_context_window(&mut self, seconds: u64) {
        self.transcript_buffer.set_window_seconds(seconds);
    }

    pub fn last_detected_question(&self) -> Option<&DetectedQuestion> {
        self.last_detected_question.as_ref()
    }

    pub fn get_recent_transcript(&self) -> String {
        let window = self.transcript_buffer.window_seconds();
        self.transcript_buffer.get_recent_text(window)
    }

    pub fn get_all_transcript(&self) -> String {
        self.transcript_buffer.get_all_text()
    }

    pub fn set_action_configs(&mut self, configs: AllActionConfigs) {
        self.action_configs = configs;
    }

    pub fn get_action_configs(&self) -> &AllActionConfigs {
        &self.action_configs
    }

    pub fn get_action_config(&self, mode: &str) -> Option<&action_config::ActionConfig> {
        self.action_configs.actions.get(mode)
    }

    /// Reset per-meeting state so the next meeting starts clean.
    /// Clears transcript, question assembly/deduplication, and the last detected question.
    pub fn clear_session(&mut self) {
        self.transcript_buffer.clear();
        self.question_detector.reset();
        self.last_detected_question = None;
        self.cancel_requested.store(false, std::sync::atomic::Ordering::SeqCst);
        self.is_generating.store(false, std::sync::atomic::Ordering::SeqCst);
        log::info!("[intelligence] session cleared for new meeting");
    }
}
