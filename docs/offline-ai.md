# Standalone tablet AI and voice

Status: implemented_unverified. Do not infer working local generation or voice from compilation or mocked tests.

## Existing tablet model (preferred for this device)

Found `/sdcard/Download/gemma-3-1b-it-q4_0.gguf` (about 957 MiB). The app now includes a pinned llama.cpp JNI adapter for this format alongside LiteRT-LM. No replacement download is needed. Runtime source commit: abeada335e2e78bd3fe63febafab7e900ce75810. Archive SHA-256: 9d5bfc27b3c3c3fc9fef962587381f071c44c4b216e2c32a12b69b7d20165b32. Weights are not bundled in the APK or source release.

## Alternative one-time download

Download `gemma3-1b-it-int4.litertlm` (about 584 MB) from:
https://huggingface.co/litert-community/Gemma3-1B-IT/blob/main/gemma3-1b-it-int4.litertlm

Sign in to Hugging Face and review/accept the Gemma license yourself. Keep the filename extension `.litertlm`; `.task` and hardware-specific NPU variants are not interchangeable. GGUF uses the separate embedded llama.cpp engine. No API key, Ollama, PC server, or separate chat app is required. Reserve several GB of free storage/RAM. The device has 8 GB physical RAM; storage-backed expansion is not dedicated GPU VRAM.

In the Android app: Ask AI > AI connection settings > Offline AI (this tablet) > Import offline model. Android's picker may lock the profile when the app backgrounds; unlock again after import. The model file is public shared weights in app-private storage. It contains no profile data. Chats and proposals retain existing profile encryption and isolation.

## Voice

English push-to-talk uses Android's explicitly on-device SpeechRecognizer, never the general cloud-capable recognition factory. Spoken replies select an installed English TTS voice that declares it does not require network. If either capability is missing, the app reports unavailable; it does not fall back to cloud. Install an offline English recognition pack and English text-to-speech voice through the tablet's speech settings if needed. Check voice refreshes capability status.

Tap Talk, speak, review the transcription and Send. Enable Read replies aloud for spoken responses. Tap Talk again for follow-up in the current conversation. Stop voice interrupts microphone/speaker. Backgrounding or leaving Ask AI stops voice. This is push-to-talk, not an always-listening wake-word assistant. Voice does not approve schedule changes; the exact preview's Apply schedule button remains required.

## Boundaries and tests

LiteRT-LM Android 0.17.1 is pinned. CPU inference uses four threads, a bounded context and a fresh conversation/engine per request; no private model conversation cache is retained between profiles. The native adapter exposes no repository, arbitrary file paths, cloud fallback or executable model tools. Imported files are copied with a 2 GB ceiling and initialized before atomic replacement. Native errors omit prompts and keys.

LOCAL-AI-001: target-tablet generation in airplane mode after model import, plus profile-private history/proposals.
LOCAL-AI-002: cancel before/during generation, background lock, missing/corrupt model and memory failure leave planning data unchanged.
LOCAL-AI-003: measure load/generation, RAM and thermal behavior on the Redmi.
VOICE-001/002: real on-device recognition and local spoken reply, continued conversation, permission denial, interruption, unavailable language pack, and airplane-mode proof.
VOICE-003: no spoken automatic approval; exact UI proposal approval retained.

Native runtime/model smoke and microphone/acoustic checks remain required. A 1B model may fail structured planning; invalid JSON or domain-invalid proposals are rejected without planning writes. Day/week/month live planning remains unverified until demonstrated on the actual model. Larger-context PC inference is not a substitute for the standalone tablet requirement.

## Immersive voice view

Profile-scoped Full-screen voice effects toggle controls automatic opening when Talk is pressed. Central Omnivae geometric mark, state animations, actual TTS speaking events, close button, Escape and double-tap background dismissal. Reduced motion disables animations. Effects never enable cloud processing or automatic proposal approval.
