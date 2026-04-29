// Voice transcription via MLX is not yet supported in this build.
// The microphone button in the UI is a placeholder.
export async function transcribe(audioData: ArrayBuffer): Promise<string> {
  return ''
}

export async function transcribeAudioBlob(_blob: Blob): Promise<string> {
  // TODO: wire up MLX Whisper when mlx_lm adds transcription support
  return ''
}
