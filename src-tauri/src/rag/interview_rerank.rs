use std::collections::HashSet;

use super::prompt_builder::prepared_qa_question;
use super::search::ScoredChunk;

const PREPARED_QA_MAX_BONUS: f64 = 0.18;
const TRANSCRIPT_PENALTY: f64 = 0.12;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InterviewEvidenceKind {
    PreparedQa,
    FileEvidence,
    ConversationRecall,
}

impl InterviewEvidenceKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::PreparedQa => "prepared_qa",
            Self::FileEvidence => "file_evidence",
            Self::ConversationRecall => "conversation_recall",
        }
    }
}

pub fn evidence_kind(chunk: &ScoredChunk) -> InterviewEvidenceKind {
    if chunk.source_type == "transcript" {
        InterviewEvidenceKind::ConversationRecall
    } else if prepared_qa_question(&chunk.text).is_some() {
        InterviewEvidenceKind::PreparedQa
    } else {
        InterviewEvidenceKind::FileEvidence
    }
}

pub fn question_overlap_for_chunk(chunk: &ScoredChunk, question: Option<&str>) -> f64 {
    if evidence_kind(chunk) != InterviewEvidenceKind::PreparedQa {
        return 0.0;
    }

    let Some(question) = question else {
        return 0.0;
    };
    let Some(prepared_question) = prepared_qa_question(&chunk.text) else {
        return 0.0;
    };

    lexical_overlap(question, &prepared_question)
}

pub fn interview_ranking_score(chunk: &ScoredChunk, question: Option<&str>) -> f64 {
    let base = chunk.normalized_score;
    match evidence_kind(chunk) {
        InterviewEvidenceKind::PreparedQa => {
            base + PREPARED_QA_MAX_BONUS * question_overlap_for_chunk(chunk, question)
        }
        InterviewEvidenceKind::FileEvidence => base,
        InterviewEvidenceKind::ConversationRecall => (base - TRANSCRIPT_PENALTY).max(0.0),
    }
}

pub fn rerank_interview_chunks(chunks: &mut [ScoredChunk], question: Option<&str>) {
    chunks.sort_by(|a, b| {
        let a_rank = interview_ranking_score(a, question);
        let b_rank = interview_ranking_score(b, question);
        b_rank
            .partial_cmp(&a_rank)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| {
                b.normalized_score
                    .partial_cmp(&a.normalized_score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .then_with(|| a.chunk_index.cmp(&b.chunk_index))
    });
}

fn lexical_overlap(a: &str, b: &str) -> f64 {
    let a_tokens = meaningful_tokens(a);
    let b_tokens = meaningful_tokens(b);
    if a_tokens.is_empty() || b_tokens.is_empty() {
        return 0.0;
    }

    let intersection = a_tokens.intersection(&b_tokens).count();
    if intersection == 0 {
        return 0.0;
    }

    let denominator = a_tokens.len().min(b_tokens.len());
    intersection as f64 / denominator as f64
}

fn meaningful_tokens(text: &str) -> HashSet<String> {
    text.split(|c: char| !c.is_alphanumeric())
        .map(|token| token.to_lowercase())
        .filter(|token| token.len() >= 2 && !is_stopword(token))
        .collect()
}

fn is_stopword(token: &str) -> bool {
    matches!(
        token,
        "a" | "an" | "and" | "are" | "as" | "at" | "be" | "been" | "but" | "by"
            | "can" | "did" | "do" | "does" | "for" | "from" | "had" | "has" | "have"
            | "how" | "i" | "in" | "is" | "it" | "me" | "of" | "on" | "or" | "our"
            | "so" | "that" | "the" | "their" | "them" | "there" | "these" | "they"
            | "this" | "to" | "us" | "was" | "we" | "were" | "what" | "when" | "where"
            | "which" | "who" | "why" | "with" | "you" | "your" | "tell" | "about"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chunk(source_type: &str, text: &str, score: f64, index: usize) -> ScoredChunk {
        ScoredChunk {
            chunk_id: format!("chunk-{index}"),
            text: text.to_string(),
            score,
            normalized_score: score,
            source_file: "prep.md".to_string(),
            chunk_index: index,
            source_type: source_type.to_string(),
        }
    }

    #[test]
    fn directly_matching_prepared_qa_can_outrank_slightly_higher_generic_evidence() {
        let mut chunks = vec![
            chunk("file", "Snowflake architecture and dbt modeling experience", 0.91, 0),
            chunk(
                "file",
                "Question: Tell me about an AI agent you built.\nAnswer: I built an autonomous engineering agent with specialized subagents.",
                0.82,
                1,
            ),
        ];

        rerank_interview_chunks(&mut chunks, Some("Tell me about the AI agent you built"));

        assert_eq!(chunks[0].chunk_index, 1);
        assert!(question_overlap_for_chunk(&chunks[0], Some("AI agent you built")) > 0.9);
    }

    #[test]
    fn transcript_recall_is_penalized_below_equally_relevant_file_evidence() {
        let mut chunks = vec![
            chunk("transcript", "You: I used Snowflake and dbt", 0.88, 0),
            chunk("file", "Implemented Snowflake and dbt pipelines", 0.84, 1),
        ];

        rerank_interview_chunks(&mut chunks, Some("Tell me about Snowflake"));

        assert_eq!(chunks[0].chunk_index, 1);
        assert_eq!(evidence_kind(&chunks[1]), InterviewEvidenceKind::ConversationRecall);
    }

    #[test]
    fn common_interview_words_do_not_create_a_prepared_answer_bonus() {
        let prepared = chunk(
            "file",
            "Question: Tell me about your background.\nAnswer: General background answer.",
            0.8,
            0,
        );

        assert_eq!(
            question_overlap_for_chunk(&prepared, Some("Tell me about your architecture work")),
            0.0
        );
    }

    #[test]
    fn classifies_prepared_file_and_transcript_evidence() {
        assert_eq!(
            evidence_kind(&chunk("file", "Question: Q?\nAnswer: A.", 0.8, 0)),
            InterviewEvidenceKind::PreparedQa
        );
        assert_eq!(
            evidence_kind(&chunk("file", "Resume evidence", 0.8, 1)),
            InterviewEvidenceKind::FileEvidence
        );
        assert_eq!(
            evidence_kind(&chunk("transcript", "Question: Q?\nAnswer: A.", 0.8, 2)),
            InterviewEvidenceKind::ConversationRecall
        );
    }
}
