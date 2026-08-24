#![cfg(windows)]

use nexq_lib::audio::resampler::resample;
use nexq_lib::audio::vad::{calculate_peak, calculate_rms};
use nexq_lib::audio::{AudioCaptureManager, AudioChunk, AudioSource};

fn tone(sample_rate: usize, hz: f32, millis: usize, amplitude: i16) -> Vec<i16> {
    let sample_count = sample_rate * millis / 1000;
    (0..sample_count)
        .map(|index| {
            let phase = 2.0 * std::f32::consts::PI * hz * index as f32 / sample_rate as f32;
            (phase.sin() * amplitude as f32) as i16
        })
        .collect()
}

#[test]
fn synthetic_pcm_survives_windows_audio_normalization() {
    let stereo_48k = tone(48_000, 440.0, 250, 12_000)
        .into_iter()
        .flat_map(|sample| [sample, sample / 2])
        .collect::<Vec<_>>();

    let mono_16k = resample(&stereo_48k, 48_000, 16_000, 2);

    assert!((3_950..=4_050).contains(&mono_16k.len()));

    // calculate_peak returns a normalized 0.0..=1.0 value. Averaging the
    // 12,000-amplitude left channel with the half-amplitude right channel
    // produces a ~9,000-amplitude mono signal before resampling.
    let expected_peak = 9_000.0 / i16::MAX as f32;
    let actual_peak = calculate_peak(&mono_16k);
    assert!(
        (actual_peak - expected_peak).abs() < 0.02,
        "expected normalized peak near {expected_peak:.3}, got {actual_peak:.3}"
    );
    assert!(calculate_rms(&mono_16k) > 1_000.0);
}

#[test]
fn mic_and_system_chunks_keep_independent_native_levels() {
    let mut manager = AudioCaptureManager::new();
    let mic_pcm = tone(16_000, 330.0, 250, 8_000);
    let system_pcm = tone(16_000, 660.0, 250, 16_000);

    let mic = manager.process_chunk(AudioChunk {
        pcm_data: mic_pcm,
        source: AudioSource::Mic,
        timestamp_ms: 1_000,
        is_speech: false,
    });
    let system = manager.process_chunk(AudioChunk {
        pcm_data: system_pcm,
        source: AudioSource::System,
        timestamp_ms: 1_250,
        is_speech: false,
    });

    assert_eq!(mic.source, AudioSource::Mic);
    assert_eq!(system.source, AudioSource::System);

    let (mic_level, system_level) = manager.get_audio_levels();
    assert_eq!(mic_level.source, AudioSource::Mic);
    assert_eq!(system_level.source, AudioSource::System);
    assert!(mic_level.peak > 0.0);
    assert!(system_level.peak > mic_level.peak);
    assert!(mic_level.level > 0.0);
    assert!(system_level.level > 0.0);
}

#[test]
fn room_audio_mirrors_level_to_both_parties() {
    let mut manager = AudioCaptureManager::new();
    let room_pcm = tone(16_000, 440.0, 250, 10_000);

    let room = manager.process_chunk(AudioChunk {
        pcm_data: room_pcm,
        source: AudioSource::Room,
        timestamp_ms: 2_000,
        is_speech: false,
    });

    assert_eq!(room.source, AudioSource::Room);
    let (mic_level, system_level) = manager.get_audio_levels();
    assert_eq!(mic_level.peak, system_level.peak);
    assert_eq!(mic_level.level, system_level.level);
    assert!(mic_level.peak > 0.0);
}
