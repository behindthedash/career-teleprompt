#![cfg(windows)]

use std::collections::HashSet;
use std::time::Duration;

use nexq_lib::audio::vad::calculate_rms;
use nexq_lib::audio::{AudioCaptureManager, AudioSource};
use tokio::sync::mpsc;

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn provisioned_virtual_endpoints_emit_both_party_sources() {
    let you_device = std::env::var("CAREER_TELEPROMPT_YOU_DEVICE")
        .expect("CAREER_TELEPROMPT_YOU_DEVICE must name the provisioned candidate microphone");
    let them_device = std::env::var("CAREER_TELEPROMPT_THEM_DEVICE")
        .expect("CAREER_TELEPROMPT_THEM_DEVICE must name the provisioned interviewer endpoint");
    let them_is_input = std::env::var("CAREER_TELEPROMPT_THEM_IS_INPUT")
        .map(|value| value.eq_ignore_ascii_case("true") || value == "1")
        .unwrap_or(false);

    let (tx, mut rx) = mpsc::channel(256);
    let mut manager = AudioCaptureManager::new();
    manager
        .start_capture(&you_device, &them_device, them_is_input, tx)
        .expect("native dual-party capture must start on the provisioned endpoints");

    let mut observed = HashSet::new();
    let deadline = tokio::time::Instant::now() + Duration::from_secs(12);

    while tokio::time::Instant::now() < deadline && observed.len() < 2 {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        match tokio::time::timeout(remaining.min(Duration::from_secs(2)), rx.recv()).await {
            Ok(Some(chunk)) if calculate_rms(&chunk.pcm_data) > 50.0 => {
                observed.insert(chunk.source.clone());
            }
            Ok(Some(_)) => {}
            Ok(None) | Err(_) => {}
        }
    }

    manager.stop_capture();

    assert!(
        observed.contains(&AudioSource::Mic),
        "candidate microphone produced no non-silent native audio; observed={observed:?}"
    );
    assert!(
        observed.contains(&AudioSource::System),
        "interviewer endpoint produced no non-silent native audio; observed={observed:?}"
    );
}
