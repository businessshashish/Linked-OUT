"use client";

import { useEffect, useRef, useState } from "react";

import { type ExitInterviewExtraction } from "@/lib/ai/exit-interview";
import { extractExplicitTranscriptFacts, mergeTranscriptFacts } from "@/lib/ai/transcript-fallback";
import { matchCompanyName } from "@/lib/ai/company-matching";

const MAX_SECONDS = 120;
const EXTRACTION_TIMEOUT_MS = 25_000;
const REQUIRED_REVIEW_FIELDS = [
  "jobTitle", "roleFamily", "location", "tenureMonths", "departureType", "primaryReason",
  "managementScore", "compensationScore", "workLifeScore", "careerGrowthScore", "learningScore",
  "cultureScore", "jobSecurityScore", "positiveExperience", "reasonForLeaving", "wishIKnew",
  "recommendCompany", "workHereAgain"
] as const;

type Company = { id: string; name: string; slug: string };
type WorkerMessage = { type: "progress" | "complete" | "error"; value?: number; message?: string; text?: string; fields?: ExitInterviewExtraction };
type Capability = "checking" | "supported" | "unsupported";

function dispatchAutofill(name: string, value: string | number | null) {
  if (value === null || value === undefined) return;
  document.dispatchEvent(new CustomEvent("linkedout:autofill", { detail: { name, value } }));
}

function microphoneError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone permission was denied. Allow access in your browser settings, or use the manual form.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No microphone was found. Connect one, or use the manual form.";
  }
  return error instanceof Error ? error.message : "Microphone access failed.";
}

export default function VoiceExitInterview({ companies }: { companies: Company[] }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [fields, setFields] = useState<ExitInterviewExtraction | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [inferredFields, setInferredFields] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [capability, setCapability] = useState<Capability>("checking");

  useEffect(() => {
    const supported = window.isSecureContext
      && Boolean(navigator.mediaDevices?.getUserMedia)
      && typeof window.MediaRecorder !== "undefined"
      && "gpu" in navigator;
    setCapability(supported ? "supported" : "unsupported");
    return () => { clearTimer(); stopTracks(); };
  }, []);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function transcribe(blob: Blob) {
    const audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
    const length = Math.ceil(decoded.length * 16000 / decoded.sampleRate);
    const audio = new Float32Array(length);
    for (let index = 0; index < length; index += 1) {
      const sourceIndex = Math.min(decoded.length - 1, Math.floor(index * decoded.sampleRate / 16000));
      audio[index] = channels.reduce((sum, channel) => sum + channel[sourceIndex], 0) / channels.length;
    }
    await audioContext.close();

    return new Promise<string>((resolve, reject) => {
      const worker = new Worker(new URL("../workers/transcription.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if (event.data.type === "progress") setProgress((event.data.value || 0) * 100);
        if (event.data.type === "complete") { worker.terminate(); resolve(event.data.text?.trim() || ""); }
        if (event.data.type === "error") { worker.terminate(); reject(new Error(event.data.message)); }
      };
      worker.postMessage({ audio }, [audio.buffer]);
    });
  }

  async function extract(text: string) {
    return new Promise<ExitInterviewExtraction>((resolve, reject) => {
      const worker = new Worker(new URL("../workers/extraction.worker.ts", import.meta.url), { type: "module" });
      const timeout = window.setTimeout(() => {
        worker.terminate();
        reject(new Error("Detailed local extraction took too long."));
      }, EXTRACTION_TIMEOUT_MS);
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if (event.data.type === "progress") { setProgress((event.data.value || 0) * 100); setStatus(event.data.message || "Understanding your experience..."); }
        if (event.data.type === "complete" && event.data.fields) { window.clearTimeout(timeout); worker.terminate(); resolve(event.data.fields); }
        if (event.data.type === "error") { window.clearTimeout(timeout); worker.terminate(); reject(new Error(event.data.message)); }
      };
      worker.postMessage({ transcript: text });
    });
  }

  function applyFields(extracted: ExitInterviewExtraction) {
    const match = matchCompanyName(extracted.companyName, companies);
    if (match) dispatchAutofill("companyId", match.id);
    const values = extracted as unknown as Record<string, string | number | null>;
    for (const name of ["jobTitle", "roleFamily", "location", "tenureMonths", "departureType", "primaryReason", "managementScore", "compensationScore", "workLifeScore", "careerGrowthScore", "learningScore", "cultureScore", "jobSecurityScore", "positiveExperience", "reasonForLeaving", "wishIKnew", "recommendCompany", "workHereAgain"]) dispatchAutofill(name, values[name]);
    document.dispatchEvent(new CustomEvent("linkedout:autofill-reasons", { detail: extracted.otherReasons }));
    const form = document.querySelector<HTMLFormElement>('[data-share-form="true"]');
    form?.querySelectorAll(".ai-missing, .ai-inferred").forEach((element) => element.classList.remove("ai-missing", "ai-inferred"));
    const missing = REQUIRED_REVIEW_FIELDS.filter((name) => extracted[name] === null) as string[];
    if (!match) missing.unshift("companyId");
    for (const field of missing) {
      const control = field === "companyId"
        ? form?.querySelector<HTMLElement>('[data-autofill-field="companyId"]')
        : form?.querySelector<HTMLElement>(`[name="${field}"]`);
      control?.closest("label, .companyPicker")?.classList.add("ai-missing");
    }
    for (const field of extracted.inferredFields) {
      const control = form?.querySelector<HTMLElement>(`[name="${field}"]`);
      control?.closest("label")?.classList.add("ai-inferred");
    }
    const firstMissing = form?.querySelector<HTMLElement>(".ai-missing");
    firstMissing?.scrollIntoView({ behavior: "smooth", block: "center" });
    return { missing, match };
  }

  async function processRecording(blob: Blob) {
    setProcessing(true); setError(""); setStatus("Loading the local speech model (the first use downloads it to this browser)..."); setProgress(5);
    try {
      const text = await transcribe(blob);
      if (text.length < 15) throw new Error("We could not hear enough information. Please try again.");
      setTranscript(text); setStatus("Extracting fields on this device...");
      const explicitFacts = extractExplicitTranscriptFacts(text, companies);
      let extracted: ExitInterviewExtraction;
      let usedFallback = false;
      try {
        extracted = await extract(text);
      } catch (extractionError) {
        const fallback = explicitFacts;
        if (!fallback) throw extractionError;
        extracted = fallback;
        usedFallback = true;
      }
      extracted = mergeTranscriptFacts(extracted, explicitFacts);
      const review = applyFields(extracted);
      const nextWarnings = [
        ...(usedFallback ? ["Detailed local AI was slow, so we filled only clear, transcript-backed fields. Complete the orange fields manually."] : []),
        ...(!review.match && extracted.companyName ? ["We could not safely match that company. Please choose it manually."] : []),
        ...(!extracted.recommendCompany || !extracted.workHereAgain ? ["Your recommendations were not explicit. Please choose them manually."] : [])
      ];
      setFields(extracted); setMissingFields(review.missing); setInferredFields(extracted.inferredFields); setWarnings(nextWarnings); setStatus("Review before submitting — you can edit every answer."); setProgress(100);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Local AI processing failed. The manual form is still available.");
    } finally { setProcessing(false); }
  }

  async function startRecording() {
    setError(""); setStatus(""); setTranscript(""); setFields(null); setWarnings([]); setMissingFields([]); setInferredFields([]); setSeconds(0);
    try {
      if (capability !== "supported") throw new Error("AI Exit Interview isn’t supported on this device yet. You can still use the manual form.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream; chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48000 } : { audioBitsPerSecond: 48000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => { clearTimer(); stopTracks(); void processRecording(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })); };
      recorder.start(); setRecording(true);
      timerRef.current = setInterval(() => setSeconds((current) => { const next = current + 1; if (next >= MAX_SECONDS && recorder.state === "recording") { recorder.stop(); setRecording(false); } return next; }), 1000);
    } catch (caught) { stopTracks(); setError(microphoneError(caught)); }
  }

  function stopRecording() { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); setRecording(false); }

  return (
    <section className="ai-exit-interview">
      <div className="ai-exit-heading"><div><strong>AI Exit Interview</strong><p>Tell us what happened naturally. AI runs privately on your device and fills the form for you.</p></div></div>
      {capability === "checking" && <div className="ai-processing">Checking whether local AI is available on this device…</div>}
      {capability === "unsupported" && <div className="ai-error">AI Exit Interview isn’t supported on this device yet. You can still use the manual form below.</div>}
      {capability === "supported" && !recording && !processing && <button type="button" className="ai-record-button" onClick={() => void startRecording()}>Record my experience</button>}
      {recording && <div className="ai-recording"><span className="recording-dot" /> Recording · {seconds}s <button type="button" onClick={stopRecording}>Stop and fill form</button></div>}
      {processing && <div className="ai-processing">{status}<progress value={progress} max="100" /></div>}
      {error && <div className="ai-error">{error}</div>}
      {fields && <div className="ai-note"><strong>Review before submitting.</strong> Form values were filled locally; edit anything you want before using the normal submit button.</div>}
      {inferredFields.length > 0 && <div className="ai-inferred-summary">AI inferred {inferredFields.length} field{inferredFields.length === 1 ? "" : "s"}. Please review the blue-marked fields.</div>}
      {missingFields.length > 0 && <div className="ai-missing-summary"><strong>Almost done.</strong> Complete the {missingFields.length} missing field{missingFields.length === 1 ? "" : "s"} marked in orange.</div>}
      {warnings.map((warning) => <div className="ai-warning" key={warning}>{warning}</div>)}
      {transcript && <details className="ai-result"><summary>Review transcript</summary><p>{transcript}</p></details>}
      <small>Local models download once to this browser. Audio and transcript stay on this device; your normal manual form and moderation flow remain available.</small>
    </section>
  );
}
