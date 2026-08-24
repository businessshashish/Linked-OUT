"use client";

import { useState } from "react";

export default function RatingSlider({
  name,
  label
}: {
  name: string;
  label: string;
}) {
  const [value, setValue] = useState(3);

  return (
    <label className="ratingSlider">
      <span className="ratingSliderHeader">
        <span>{label}</span>
        <strong>{value}/5</strong>
      </span>
      <input
        name={name}
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        aria-label={label}
        required
      />
      <span className="ratingScale" aria-hidden="true">
        <span>Very poor</span>
        <span>Excellent</span>
      </span>
    </label>
  );
}
