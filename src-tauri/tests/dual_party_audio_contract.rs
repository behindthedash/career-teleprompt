#![cfg(windows)]

use nexq_lib::audio::{AudioCaptureManager, AudioChunk, AudioSource, PartyAudioConfig, PartyRole};
use nexq_lib::stt::provider::TranscriptResult;
use nexq_lib::stt::segment_accumulator::SegmentAccumulator;

fn chunk(source: AudioSource, amplitude: i16) -> AudioChunk {
    AudioChunk {
        pcm_data: (0..4_000)
            .map(|index| if index % 2 == 0 { amplitude } else { -amplitude })
            .collect(),
        source,
        timestamp_ms: 1_000,
        is_speech: false,
    }
}

fn transcript(text: &str, speaker: &str, timestamp_ms: u64) -> TranscriptResult {
    TranscriptResult {
        text: text.to_string(),
        is_final: true,
        confidence: 0.95,
        timestamp_ms,
        speaker: Some(speaker.to_string()),
        language: Some("en-US".to_string()),
        segment_id: None,
    }
}

#[test]
fn party_configuration_round_trips_without_losing_roles() {
    let you = PartyAudioConfig {
        role: PartyRole::You,
        device_id: "Virtual Candidate Mic".to_string(),
        is_input_device: true,
        stt_provider: "whisper_cpp".to_string(),
        local_model_id: Some("base".to_string()),
    };
    let them = PartyAudioConfig {
        role: PartyRole::Them,
        device_id: "Virtual Interview Output".to_string(),
        is_input_device: false,
        stt_provider: "deepgram".to_string(),
        local_model_id: None,
    };

    let serialized = serde_json::to_string(&(you, them)).unwrap();
    let (decoded_you, decoded_them): (PartyAudioConfig, PartyAudioConfig) =
        serde_json::from_str(&serialized).unwrap();

    assert_eq!(decoded_you.role, PartyRole::You);
    assert_eq!(decoded_them.role, PartyRole::Them);
    assert!(decoded_you.is_input_device);
    assert!(!decoded_them.is_input_device);
}

#[test]
fn mic_and_system_audio_do_not_overwrite_each_others_levels() {
    let mut manager = AudioCaptureManager::new();
    manager.process_chunk(chunk(AudioSource::Mic, 6_000));
    let (mic_after_you, system_before_them) = manager.get_audio_levels();

    manager.process_chunk(chunk(AudioSource::System, 15_000));
    let (mic_after_them, system_after_them) = manager.get_audio_levels();

    assert!(mic_after_you.peak > 0.0);
    assert_eq!(system_before_them.peak, 0.0);
    assert_eq!(mic_after_you.peak, mic_after_them.peak);
    assert!(system_after_them.peak > mic_after_them.peak);
}

#[test]
fn diarized_speaker_changes_force_distinct_accumulated_segments() {
    let mut accumulator = SegmentAccumulator::new(3_000);

    let first = accumulator.feed_result(transcript("Question one", "speaker_0", 1_000));
    assert_eq!(first.len(), 1);
    assert_eq!(first[0].speaker, "speaker_0");

    let changed = accumulator.feed_result(transcript("Follow up", "speaker_1", 1_200));
    assert_eq!(changed.len(), 2);
    assert_eq!(changed[0].speaker, "speaker_0");
    assert_eq!(changed[1].speaker, "speaker_1");
    assert_ne!(changed[0].id, changed[1].id);
}
