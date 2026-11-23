#!/usr/bin/env bash
# Downloads the local models into .cache/ (run once):
#  - Kokoro-82M (Apache-2.0), the timestamped ONNX export: it reports how long each phoneme
#    lasts, which times the instructor's mouth and the captions exactly.
#  - Whisper (base.en) is fetched on first use by scripts/check.py.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .cache/kokoro-ts
cd .cache
MODEL=https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/resolve/main/onnx/model_quantized.onnx
VOICES=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
[ -f kokoro-ts/model_quantized.onnx ] || curl -fL --retry 3 -o kokoro-ts/model_quantized.onnx "$MODEL"
[ -f voices-v1.0.bin ] || curl -fL --retry 3 -o voices-v1.0.bin "$VOICES"
ls -la . kokoro-ts
