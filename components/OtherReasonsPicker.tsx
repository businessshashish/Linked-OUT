"use client";

import { useState } from "react";

import {
  REASON_LABELS,
  EXIT_REASON_VALUES
} from "@/lib/constants";

export default function OtherReasonsPicker() {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(reason: string) {
    setSelected((current) =>
      current.includes(reason)
        ? current.filter((value) => value !== reason)
        : current.length < 2
          ? [...current, reason]
          : current
    );
  }

  return (
    <div>
      <strong>Other reasons — maximum two ({selected.length}/2)</strong>
      <div className="checkboxGrid">
        {EXIT_REASON_VALUES.map((reason) => {
          const checked = selected.includes(reason);
          const disabled = !checked && selected.length >= 2;

          return (
            <label className="checkLabel" key={reason}>
              <input
                type="checkbox"
                name="otherReasons"
                value={reason}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(reason)}
              />
              {REASON_LABELS[reason]}
            </label>
          );
        })}
      </div>
    </div>
  );
}
