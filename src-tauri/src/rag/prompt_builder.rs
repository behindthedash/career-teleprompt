use super::search::ScoredChunk;

/// Build the RAG context string to prepend to an LLM prompt.
///
/// Assembles custom instructions (if any) and retrieved chunks into a
/// structured context block suitable for injection into a system prompt.
/// Explicit prepared interview Q&A chunks are promoted ahead of generic
/// evidence so a semantically retrieved prepared answer is easy for the
/// interview response coach to distinguish from supporting material.
///
/// - `chunks`: scored and ranked chunks from the search pipeline
/// - `custom_instructions`: user-provided custom instructions text
///
/// Returns the assembled context string.
pub fn build_rag_context(chunks: &[ScoredChunk], custom_instructions: &str) -> String {
    let mut parts: Vec<String> = Vec::new();

    if !custom_instructions.is_empty() {
        parts.push(format!("## Custom Instructions\n{}\n", custom_instructions));
    }

    if chunks.is_empty() {
        return parts.join("\n");
    }

    let (prepared, general): (Vec<&ScoredChunk>, Vec<&ScoredChunk>) = chunks
        .iter()
        .partition(|chunk| prepared_qa_question(&chunk.text).is_some());

    if !prepared.is_empty() {
        parts.push(
            "## Prepared Interview Q&A\nThese are user-authored prepared interview answers retrieved for the current question. Prefer a directly relevant prepared answer over inventing new wording, but do not force a tangential match."
                .to_string(),
        );

        for (i, chunk) in prepared.iter().enumerate() {
            let source_label = build_source_label(chunk);
            let prepared_question = prepared_qa_question(&chunk.text).unwrap_or_default();
            parts.push(format!(
                "[Prepared Q&A {}: {}]\nPrepared question: {}\n{}\n---",
                i + 1,
                source_label,
                prepared_question,
                chunk.text
            ));
        }
    }

    if !general.is_empty() {
        parts.push("## Relevant Context (Retrieved via RAG)".to_string());

        for (i, chunk) in general.iter().enumerate() {
            let source_label = build_source_label(chunk);
            parts.push(format!(
                "[Source {}: {}]\n{}\n---",
                i + 1,
                source_label,
                chunk.text
            ));
        }
    }

    parts.join("\n")
}

/// Recognize explicit prepared interview Q&A without relying on filenames.
/// Supported forms include:
/// - `Q: ...` followed by `A: ...`
/// - `Question: ...` followed by `Answer: ...`
/// - Markdown `## Question` / `## Answer` headings
pub fn prepared_qa_question(text: &str) -> Option<String> {
    let lines: Vec<&str> = text.lines().collect();
    let mut question: Option<String> = None;
    let mut collecting_heading_question = false;
    let mut saw_answer = false;

    for raw_line in &lines {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let without_heading = trimmed.trim_start_matches('#').trim();
        let lower = without_heading.to_ascii_lowercase();

        if lower == "question" {
            collecting_heading_question = true;
            continue;
        }
        if lower == "answer" {
            saw_answer = true;
            collecting_heading_question = false;
            continue;
        }

        if let Some(value) = strip_prefix_case_insensitive(without_heading, "question:")
            .or_else(|| strip_prefix_case_insensitive(without_heading, "q:"))
        {
            let value = value.trim();
            if !value.is_empty() {
                question = Some(value.to_string());
            }
            collecting_heading_question = false;
            continue;
        }

        if strip_prefix_case_insensitive(without_heading, "answer:").is_some()
            || strip_prefix_case_insensitive(without_heading, "a:").is_some()
        {
            saw_answer = true;
            collecting_heading_question = false;
            continue;
        }

        if collecting_heading_question {
            question = match question {
                Some(existing) => Some(format!("{} {}", existing, without_heading)),
                None => Some(without_heading.to_string()),
            };
        }
    }

    if saw_answer {
        question.filter(|value| !value.trim().is_empty())
    } else {
        None
    }
}

fn strip_prefix_case_insensitive<'a>(value: &'a str, prefix: &str) -> Option<&'a str> {
    if value.len() < prefix.len() || !value[..prefix.len()].eq_ignore_ascii_case(prefix) {
        return None;
    }
    Some(&value[prefix.len()..])
}

/// Build a human-readable source label for a chunk.
///
/// - For transcript chunks: "Live Transcript, segment N"
/// - For file chunks: "filename, chunk N"
fn build_source_label(chunk: &ScoredChunk) -> String {
    if chunk.source_type == "transcript" {
        format!("Live Transcript, segment {}", chunk.chunk_index)
    } else {
        format!("{}, chunk {}", chunk.source_file, chunk.chunk_index)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_chunk(
        source_type: &str,
        source_file: &str,
        chunk_index: usize,
        text: &str,
    ) -> ScoredChunk {
        ScoredChunk {
            chunk_id: format!("chunk_{}", chunk_index),
            text: text.to_string(),
            score: 0.9,
            normalized_score: 0.9,
            source_file: source_file.to_string(),
            chunk_index,
            source_type: source_type.to_string(),
        }
    }

    #[test]
    fn test_empty_chunks_no_instructions() {
        let result = build_rag_context(&[], "");
        assert!(result.is_empty());
    }

    #[test]
    fn test_custom_instructions_only() {
        let result = build_rag_context(&[], "Be concise.");
        assert!(result.contains("## Custom Instructions"));
        assert!(result.contains("Be concise."));
    }

    #[test]
    fn test_file_source_label() {
        let chunks = vec![make_chunk("file", "resume.pdf", 0, "Experience section")];
        let result = build_rag_context(&chunks, "");
        assert!(result.contains("[Source 1: resume.pdf, chunk 0]"));
        assert!(result.contains("Experience section"));
    }

    #[test]
    fn test_transcript_source_label() {
        let chunks = vec![make_chunk("transcript", "transcript_abc", 3, "They asked about...")];
        let result = build_rag_context(&chunks, "");
        assert!(result.contains("[Source 1: Live Transcript, segment 3]"));
    }

    #[test]
    fn test_multiple_chunks_with_instructions() {
        let chunks = vec![
            make_chunk("file", "notes.md", 0, "First chunk"),
            make_chunk("transcript", "t_123", 5, "Second chunk"),
        ];
        let result = build_rag_context(&chunks, "Focus on technical details.");
        assert!(result.contains("## Custom Instructions"));
        assert!(result.contains("Focus on technical details."));
        assert!(result.contains("[Source 1: notes.md, chunk 0]"));
        assert!(result.contains("[Source 2: Live Transcript, segment 5]"));
        assert!(result.contains("---"));
    }

    #[test]
    fn recognizes_colon_prepared_qa() {
        let text = "Q: Tell me about a difficult data problem.\nA: I inherited a seven-billion-row reporting model and redesigned the processing path.";
        assert_eq!(
            prepared_qa_question(text).as_deref(),
            Some("Tell me about a difficult data problem.")
        );
    }

    #[test]
    fn recognizes_markdown_prepared_qa() {
        let text = "## Question\nHow have you used RAG in your work?\n\n## Answer\nI built an MCP-accessible source-code RAG workflow.";
        assert_eq!(
            prepared_qa_question(text).as_deref(),
            Some("How have you used RAG in your work?")
        );
    }

    #[test]
    fn does_not_promote_question_without_answer() {
        assert!(prepared_qa_question("Question: What is your approach to AI?").is_none());
    }

    #[test]
    fn prepared_qa_is_rendered_before_generic_context() {
        let chunks = vec![
            make_chunk("file", "resume.pdf", 0, "Snowflake and dbt experience"),
            make_chunk(
                "file",
                "interview-prep.md",
                1,
                "Question: Tell me about a difficult data problem.\nAnswer: I redesigned a large reporting pipeline.",
            ),
        ];

        let result = build_rag_context(&chunks, "");
        let prepared_pos = result.find("## Prepared Interview Q&A").unwrap();
        let generic_pos = result.find("## Relevant Context").unwrap();
        assert!(prepared_pos < generic_pos);
        assert!(result.contains("Prepared question: Tell me about a difficult data problem."));
    }
}
