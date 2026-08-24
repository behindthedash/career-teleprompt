// Sub-PRD 6: Question detection
// Layer 1: interrogative syntax and punctuation
// Layer 2: interview-specific contextual patterns
// Career Teleprompt: assemble adjacent interviewer finals and suppress STT duplicates.

use std::collections::{HashSet, VecDeque};

use serde::{Deserialize, Serialize};

/// A detected question from the transcript.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedQuestion {
    pub text: String,
    pub confidence: f64,
    pub timestamp_ms: u64,
    pub source: String,
}

#[derive(Debug, Clone)]
struct RecentQuestion {
    normalized: String,
    timestamp_ms: u64,
}

/// Stateful detector for interview questions.
///
/// STT engines often finalize one interviewer utterance as several adjacent fragments
/// (or repeat a corrected final). The detector therefore assembles nearby remote-speaker
/// fragments before applying the existing question heuristics and keeps a short duplicate
/// history so one spoken question produces one UI trigger.
pub struct QuestionDetector {
    buffer: String,
    buffer_source: String,
    last_remote_timestamp_ms: Option<u64>,
    recent_questions: VecDeque<RecentQuestion>,
}

const MAX_ASSEMBLY_GAP_MS: u64 = 2_500;
const MAX_ASSEMBLY_CHARS: usize = 1_200;
const MIN_UNPUNCTUATED_TOKENS: usize = 8;
const DUPLICATE_WINDOW_MS: u64 = 15_000;
const RECENT_QUESTION_LIMIT: usize = 8;
const DUPLICATE_JACCARD_THRESHOLD: f64 = 0.85;

/// Interrogative words that commonly start questions.
const INTERROGATIVE_STARTERS: &[&str] = &[
    "what", "why", "how", "when", "where", "who", "which",
    "can", "could", "would", "should",
    "do", "does", "is", "are", "will", "have", "has",
    "tell",
];

/// Interview-specific patterns that indicate a question or prompt.
const INTERVIEW_PATTERNS: &[&str] = &[
    "walk me through",
    "describe a time",
    "tell me about",
    "what would you do",
    "how do you handle",
    "give me an example",
    "explain how",
    "what's your experience with",
    "what is your experience with",
    "can you walk me through",
    "can you describe",
    "can you explain",
    "can you tell me",
    "talk about a time",
    "share an example",
    "how would you",
    "how have you",
    "what approach would you",
    "what's your approach to",
    "what is your approach to",
];

impl QuestionDetector {
    pub fn new() -> Self {
        Self {
            buffer: String::new(),
            buffer_source: String::new(),
            last_remote_timestamp_ms: None,
            recent_questions: VecDeque::with_capacity(RECENT_QUESTION_LIMIT),
        }
    }

    /// Consume one finalized transcript fragment and return newly detected interviewer questions.
    ///
    /// The IntelligenceEngine already calls this only for finalized segments. User/You speech is
    /// treated as a turn boundary: any pending interviewer fragment gets one final chance to emit,
    /// then the assembly buffer is cleared so answers can never be appended to questions.
    pub fn detect_questions(
        &mut self,
        text: &str,
        timestamp_ms: u64,
        source: &str,
    ) -> Vec<DetectedQuestion> {
        self.expire_recent(timestamp_ms);

        if is_user_source(source) {
            return self.flush_pending(timestamp_ms);
        }

        let clean = collapse_whitespace(text);
        if clean.is_empty() {
            return Vec::new();
        }

        let mut emitted = Vec::new();
        let starts_new_utterance = self
            .last_remote_timestamp_ms
            .map(|previous| timestamp_ms.saturating_sub(previous) > MAX_ASSEMBLY_GAP_MS)
            .unwrap_or(true)
            || (!self.buffer_source.is_empty() && self.buffer_source != source);

        if starts_new_utterance && !self.buffer.is_empty() {
            emitted.extend(self.flush_pending(timestamp_ms));
        }

        if self.buffer.is_empty() {
            self.buffer = clean;
            self.buffer_source = source.to_string();
        } else {
            let merged = merge_overlap(&self.buffer, &clean);
            if merged.chars().count() > MAX_ASSEMBLY_CHARS {
                emitted.extend(self.flush_pending(timestamp_ms));
                self.buffer = clean;
                self.buffer_source = source.to_string();
            } else {
                self.buffer = merged;
            }
        }
        self.last_remote_timestamp_ms = Some(timestamp_ms);

        if should_emit_candidate(&self.buffer) {
            emitted.extend(self.flush_pending(timestamp_ms));
        }

        emitted
    }

    /// Clear per-meeting question assembly and duplicate state.
    pub fn reset(&mut self) {
        self.buffer.clear();
        self.buffer_source.clear();
        self.last_remote_timestamp_ms = None;
        self.recent_questions.clear();
    }

    fn flush_pending(&mut self, timestamp_ms: u64) -> Vec<DetectedQuestion> {
        if self.buffer.is_empty() {
            self.last_remote_timestamp_ms = None;
            return Vec::new();
        }

        let candidate = std::mem::take(&mut self.buffer);
        let source = std::mem::take(&mut self.buffer_source);
        self.last_remote_timestamp_ms = None;

        self.detect_candidate(&candidate, timestamp_ms, &source)
    }

    fn detect_candidate(
        &mut self,
        text: &str,
        timestamp_ms: u64,
        source: &str,
    ) -> Vec<DetectedQuestion> {
        let mut questions = Vec::new();

        for sentence in split_sentences(text) {
            let trimmed = sentence.trim();
            if trimmed.is_empty() || trimmed.len() < 5 {
                continue;
            }

            let confidence = question_confidence(trimmed);
            if confidence < 0.5 {
                continue;
            }

            let normalized = normalize_for_duplicate(trimmed);
            if normalized.is_empty() || self.is_recent_duplicate(&normalized) {
                continue;
            }

            self.remember_question(normalized, timestamp_ms);
            questions.push(DetectedQuestion {
                text: trimmed.to_string(),
                confidence,
                timestamp_ms,
                source: source.to_string(),
            });
        }

        questions
    }

    fn expire_recent(&mut self, now_ms: u64) {
        while self
            .recent_questions
            .front()
            .map(|item| now_ms.saturating_sub(item.timestamp_ms) > DUPLICATE_WINDOW_MS)
            .unwrap_or(false)
        {
            self.recent_questions.pop_front();
        }
    }

    fn is_recent_duplicate(&self, normalized: &str) -> bool {
        self.recent_questions
            .iter()
            .any(|previous| near_duplicate(&previous.normalized, normalized))
    }

    fn remember_question(&mut self, normalized: String, timestamp_ms: u64) {
        if self.recent_questions.len() == RECENT_QUESTION_LIMIT {
            self.recent_questions.pop_front();
        }
        self.recent_questions.push_back(RecentQuestion {
            normalized,
            timestamp_ms,
        });
    }
}

fn question_confidence(text: &str) -> f64 {
    let mut confidence: f64 = 0.0;
    let lower = text.to_lowercase();

    if text.trim_end().ends_with('?') {
        confidence = 0.95;
    }

    if confidence < 0.5 {
        let first_word = lower.split_whitespace().next().unwrap_or("");
        if INTERROGATIVE_STARTERS.contains(&first_word) {
            confidence = confidence.max(0.6);
        }
    }

    if INTERVIEW_PATTERNS.iter().any(|pattern| lower.contains(pattern)) {
        confidence = confidence.max(0.85);
    }

    confidence
}

fn should_emit_candidate(text: &str) -> bool {
    let trimmed = text.trim_end();
    if trimmed.ends_with(['?', '!', '.']) {
        return true;
    }

    let lower = trimmed.to_lowercase();
    let token_count = lower.split_whitespace().count();
    if token_count < MIN_UNPUNCTUATED_TOKENS {
        return false;
    }

    let first_word = lower.split_whitespace().next().unwrap_or("");
    INTERROGATIVE_STARTERS.contains(&first_word)
        || INTERVIEW_PATTERNS.iter().any(|pattern| lower.contains(pattern))
}

fn is_user_source(source: &str) -> bool {
    source.eq_ignore_ascii_case("user") || source.eq_ignore_ascii_case("you")
}

fn collapse_whitespace(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn normalize_for_duplicate(text: &str) -> String {
    text.chars()
        .flat_map(char::to_lowercase)
        .map(|ch| if ch.is_alphanumeric() { ch } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn near_duplicate(left: &str, right: &str) -> bool {
    if left == right {
        return true;
    }

    let left_tokens: Vec<&str> = left.split_whitespace().collect();
    let right_tokens: Vec<&str> = right.split_whitespace().collect();
    if left_tokens.is_empty() || right_tokens.is_empty() {
        return false;
    }

    let shorter = left_tokens.len().min(right_tokens.len()) as f64;
    let longer = left_tokens.len().max(right_tokens.len()) as f64;
    let length_ratio = shorter / longer;
    if length_ratio >= 0.75 && (left.contains(right) || right.contains(left)) {
        return true;
    }

    let left_set: HashSet<&str> = left_tokens.into_iter().collect();
    let right_set: HashSet<&str> = right_tokens.into_iter().collect();
    let intersection = left_set.intersection(&right_set).count() as f64;
    let union = left_set.union(&right_set).count() as f64;
    union > 0.0 && intersection / union >= DUPLICATE_JACCARD_THRESHOLD
}

fn merge_overlap(existing: &str, incoming: &str) -> String {
    let existing_tokens: Vec<&str> = existing.split_whitespace().collect();
    let incoming_tokens: Vec<&str> = incoming.split_whitespace().collect();
    let max_overlap = existing_tokens.len().min(incoming_tokens.len());

    for overlap in (1..=max_overlap).rev() {
        let existing_tail = &existing_tokens[existing_tokens.len() - overlap..];
        let incoming_head = &incoming_tokens[..overlap];
        let matches = existing_tail
            .iter()
            .zip(incoming_head.iter())
            .all(|(a, b)| normalize_for_duplicate(a) == normalize_for_duplicate(b));
        if matches {
            if overlap == incoming_tokens.len() {
                return existing.to_string();
            }
            return format!("{} {}", existing, incoming_tokens[overlap..].join(" "));
        }
    }

    format!("{} {}", existing, incoming)
}

/// Split text into sentences using common sentence terminators.
fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut current = String::new();

    for ch in text.chars() {
        current.push(ch);
        if ch == '.' || ch == '?' || ch == '!' {
            let trimmed = current.trim().to_string();
            if !trimmed.is_empty() {
                sentences.push(trimmed);
            }
            current.clear();
        }
    }

    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        sentences.push(trimmed);
    }

    sentences
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assembles_interviewer_fragments_before_detection() {
        let mut detector = QuestionDetector::new();
        assert!(detector
            .detect_questions("Can you tell me about", 1_000, "Them")
            .is_empty());

        let questions = detector.detect_questions(
            "a time you designed a difficult data system",
            1_800,
            "Them",
        );
        assert_eq!(questions.len(), 1);
        assert_eq!(
            questions[0].text,
            "Can you tell me about a time you designed a difficult data system"
        );
    }

    #[test]
    fn user_turn_never_gets_appended_to_interviewer_question() {
        let mut detector = QuestionDetector::new();
        assert!(detector
            .detect_questions("Tell me about your experience with", 1_000, "Them")
            .is_empty());

        let questions = detector.detect_questions("I have worked with Snowflake", 2_000, "User");
        assert_eq!(questions.len(), 1);
        assert_eq!(questions[0].text, "Tell me about your experience with");
        assert_eq!(questions[0].source, "Them");
    }

    #[test]
    fn suppresses_corrected_near_duplicate_question() {
        let mut detector = QuestionDetector::new();
        let first = detector.detect_questions(
            "Can you walk me through how you built the pipeline?",
            1_000,
            "Them",
        );
        assert_eq!(first.len(), 1);

        let repeated = detector.detect_questions(
            "Can you walk me through how you built that pipeline?",
            2_000,
            "Them",
        );
        assert!(repeated.is_empty());
    }

    #[test]
    fn same_question_can_emit_after_duplicate_window_expires() {
        let mut detector = QuestionDetector::new();
        let text = "How would you design a RAG system for legal documents?";
        assert_eq!(detector.detect_questions(text, 1_000, "Them").len(), 1);
        assert_eq!(detector.detect_questions(text, 20_001, "Them").len(), 1);
    }

    #[test]
    fn reset_clears_duplicate_history() {
        let mut detector = QuestionDetector::new();
        let text = "What is your experience with AI automation?";
        assert_eq!(detector.detect_questions(text, 1_000, "Them").len(), 1);
        detector.reset();
        assert_eq!(detector.detect_questions(text, 2_000, "Them").len(), 1);
    }
}
