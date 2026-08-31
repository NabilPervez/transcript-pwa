# Murmur — local-first voice memo transcription

A privacy-first PWA that records voice memos and transcribes them entirely
on-device using Whisper via [`@huggingface/transformers`](https://github.com/huggingface/transformers.js)
(transformers.js v3), running in WebGPU where available and falling back to
WASM. No audio or text ever leaves the browser.

## Getting started

```bash
npm install
npm run dev       # local dev server, http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

First run downloads the Whisper model (~75–150MB depending on the quantized
variant selected) directly from the Hugging Face Hub CDN and caches it in
IndexedDB (`lib/model-cache.ts`) — subsequent loads are fully offline.

## Architecture

```
src/
  workers/whisper.worker.ts   Dedicated worker: model load, backend
                              detection (WebGPU → WASM), inference,
                              streaming partial-text callbacks.
  lib/audio.ts                MediaRecorder capture, live RMS level meter,
                              OfflineAudioContext resampling to 16kHz mono.
  lib/model-cache.ts          IndexedDB-backed Cache adapter wired into
                              transformers.js's env.customCache, so model
                              weights bypass Workbox's precache entirely.
  lib/export.ts                .txt / .md / .srt generation + download.
  hooks/useRecorder.ts        Recording state machine + level meter.
  hooks/useTranscriber.ts     Worker lifecycle, pipeline stage state
                              (downloading → booting → transcribing → done).
  components/                 Recording Studio + Editor & Export UI.
```

The service worker (via `vite-plugin-pwa`) precaches only the app shell
(JS/CSS/HTML/fonts) so the install stays fast; the ONNX model is deliberately
excluded from that manifest and lives in its own IndexedDB store instead,
matching the PRD's Sprint 3 requirement.

## Browser support & known constraints

- **WebGPU** requires Chrome/Edge 113+ (desktop) or recent Chrome on Android.
  Everything else automatically falls back to WASM — slower, but functional.
- **Safari**: WASM path works; WebGPU support is still behind a flag as of
  this writing. Recording relies on `MediaRecorder`, which Safari supports
  from 14.1+.
- iOS/iPadOS PWAs cannot precache installable size beyond Safari's storage
  ceiling for a given site in some configurations — the low-storage warning
  in the UI (`Storage Manager` quota check) surfaces this before it becomes
  a failed download.
- The chosen model, `onnx-community/whisper-small`, balances accuracy and
  the 75–150MB budget in the PRD. Swapping `MODEL_ID` in
  `whisper.worker.ts` to `whisper-base` or `whisper-tiny` trades accuracy
  for a smaller download and faster boot on constrained devices.
- This was built and reviewed as source; it has not been run through an
  actual `npm install && npm run build` in a browser in this environment,
  so treat the first build as a normal integration pass — pin exact
  `@huggingface/transformers` version compatibility if the API surface
  (e.g. `WhisperTextStreamer`, `dtype` options) has shifted since v3.0.2.

## Design system

Dark editorial theme: Cormorant Garamond for display type, Inter for UI
and body text, a muted gold (`#c9a55c`) accent against near-black
(`#0b0b0d`), defined in `tailwind.config.js` under the `ink` / `gilt`
palettes.
# transcript-pwa
