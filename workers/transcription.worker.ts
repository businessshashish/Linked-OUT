import { pipeline } from "@huggingface/transformers";

type SpeechPipeline = (audio: Float32Array, options?: Record<string, unknown>) => Promise<{ text: string }>;

let transcriber: SpeechPipeline | null = null;

self.onmessage = async (event: MessageEvent<{ audio: Float32Array }>) => {
  try {
    if (!transcriber) {
      self.postMessage({ type: "progress", value: 0.15 });
      transcriber = (await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny.en",
        { device: "auto" }
      )) as unknown as SpeechPipeline;
    }

    self.postMessage({ type: "progress", value: 0.65 });
    const activeTranscriber = transcriber;
    if (!activeTranscriber) throw new Error("Transcription model is not ready.");
    const result = await activeTranscriber(event.data.audio, {
      chunk_length_s: 30,
      stride_length_s: 5
    });
    const text = typeof result === "object" && result && "text" in result ? result.text : "";
    self.postMessage({ type: "complete", text });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Transcription failed." });
  }
};
