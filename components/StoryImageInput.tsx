"use client";

import { ChangeEvent, DragEvent, useState } from "react";

const MAX_BYTES = 600 * 1024;
const MAX_DIMENSION = 1800;

export default function StoryImageInput() {
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  async function compress(file: File) {
    const source = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.src = source;
      await image.decode();

      const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare this image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      let quality = 0.86;
      let result: Blob | null = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (result && result.size <= MAX_BYTES) break;
        quality -= 0.09;
      }

      if (!result || result.size > MAX_BYTES) throw new Error("This image could not be reduced below 600 KB.");
      return new File([result], "experience.jpg", { type: "image/jpeg" });
    } finally {
      URL.revokeObjectURL(source);
    }
  }

  async function processFile(file: File, input: HTMLInputElement) {
    if (!file) return;

    setStatus("Reducing image size...");
    try {
      const compressed = await compress(file);
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      input.files = transfer.files;
      setPreview(URL.createObjectURL(compressed));
      setStatus(`Image ready (${Math.ceil(compressed.size / 1024)} KB)`);
    } catch (error) {
      input.value = "";
      setPreview("");
      setStatus(error instanceof Error ? error.message : "Image processing failed.");
    }
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await processFile(file, event.target);
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    const input = event.currentTarget.querySelector("input");
    if (file && input) await processFile(file, input);
  }

  return (
    <label
      className={`storyImageField ${isDragging ? "isDragging" : ""} ${preview ? "hasPreview" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input name="experienceImage" type="file" accept="image/*" onChange={handleChange} />
      {preview ? (
        <span className="storyImagePreview">
          <img src={preview} alt="Selected experience" />
          <span>
            <strong>Image ready to share</strong>
            <small>{status}</small>
          </span>
        </span>
      ) : (
        <span className="storyImagePrompt">
          <span className="uploadIcon" aria-hidden="true">+</span>
          <strong>Upload an experience image</strong>
          <span>Drag and drop here, or browse from your device</span>
          <small>JPG, PNG, GIF or WebP · up to 5 MB before compression</small>
        </span>
      )}
      {!preview && status && <span className="uploadStatus" aria-live="polite">{status}</span>}
    </label>
  );
}
