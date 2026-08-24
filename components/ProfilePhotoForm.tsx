"use client";

import { ChangeEvent, DragEvent, FormEvent, useState, useTransition } from "react";

import { updateProfilePhotoAction } from "@/app/actions";

const MAX_UPLOAD_BYTES = 600 * 1024;
const MAX_DIMENSION = 1600;

async function compressImage(file: File) {
  const source = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = source;
    await image.decode();

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the image.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );

      if (blob && blob.size <= MAX_UPLOAD_BYTES) break;
      quality -= 0.09;
    }

    if (!blob || blob.size > MAX_UPLOAD_BYTES) {
      throw new Error("This image could not be reduced below 600 KB.");
    }

    return new File([blob], "profile.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(source);
  }
}

export default function ProfilePhotoForm() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  async function prepareFile(file: File, input: HTMLInputElement) {
    setMessage("Reducing image size...");

    try {
      const compressed = await compressImage(file);
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      input.files = transfer.files;
      setPreview(URL.createObjectURL(compressed));
      setMessage(`Image ready (${Math.ceil(compressed.size / 1024)} KB)`);
    } catch (error) {
      input.value = "";
      setPreview("");
      setMessage(error instanceof Error ? error.message : "Image processing failed.");
    }
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await prepareFile(file, event.target);
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    const input = event.currentTarget.querySelector("input");
    if (file && input) await prepareFile(file, input);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("profilePhoto");

    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
      setMessage("Choose an image to upload.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData(form);
      setMessage("Uploading...");
      await updateProfilePhotoAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="photoForm">
      <label
        className={`profilePhotoField ${isDragging ? "isDragging" : ""} ${preview ? "hasPreview" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input name="profilePhoto" type="file" accept="image/*" onChange={handleChange} required disabled={isPending} />
        {preview ? (
          <span className="storyImagePreview">
            <img src={preview} alt="Selected profile" />
            <span>
              <strong>Profile photo ready</strong>
              <small>{message}</small>
            </span>
          </span>
        ) : (
          <span className="storyImagePrompt">
            <span className="uploadIcon" aria-hidden="true">+</span>
            <strong>Upload a profile photo</strong>
            <span>Drag and drop here, or browse from your device</span>
            <small>JPG, PNG, GIF or WebP · resized automatically</small>
          </span>
        )}
      </label>
      <button className="secondaryButton" disabled={isPending}>
        {isPending ? "Processing..." : "Upload photo"}
      </button>
      {message && !preview && <p className="uploadStatus" aria-live="polite">{message}</p>}
    </form>
  );
}
