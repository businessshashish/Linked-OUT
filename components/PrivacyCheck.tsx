"use client";

import { useEffect, useState } from "react";

const fields = ["positiveExperience", "reasonForLeaving", "wishIKnew"];

function findRisks(text: string) {
  const risks: string[] = [];
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) risks.push("an email address — remove it or say “a colleague” instead");
  if (/(?:\+?\d[\d\s\-()]{7,}\d)/.test(text)) risks.push("a phone number — remove it");
  if (/\b(?:my manager|my boss|manager)\s+[A-Z][a-z]+/.test(text)) risks.push("a named person — describe the role, not the person");
  if (/\b(?:on|dated?)\s+(?:\d{1,2}[/-]){2}\d{2,4}\b/i.test(text)) risks.push("an exact date — use a broader timeframe");
  if (/\b(?:team of|only)\s+(?:[1-9]|ten)\b/i.test(text)) risks.push("a very small team detail — describe the function more broadly");
  if (/\b(?:project|client|customer|account)\s+[A-Z][A-Za-z0-9-]{2,}/.test(text)) risks.push("a potentially identifying project, customer, or account name — generalize it");
  return risks;
}

export default function PrivacyCheck() {
  const [risks, setRisks] = useState<string[]>([]);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("[data-share-form='true']");
    if (!form) return;
    const update = () => {
      const data = new FormData(form);
      setRisks(findRisks(fields.map((name) => String(data.get(name) || "")).join("\n")));
    };
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    update();
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);

  return (
    <div className={risks.length ? "privacyCheck privacyCheckWarning" : "privacyCheck"} aria-live="polite">
      <strong>{risks.length ? "Review these privacy details before submitting" : "Privacy check"}</strong>
      {risks.length ? <ul>{risks.map((risk) => <li key={risk}>{risk}</li>)}</ul> : <p>Use broad roles and country-level location. Do not include names, contact details, exact dates, customer names, projects, or confidential information.</p>}
      <small>LinkedOut never rewrites your testimony. You stay in control; submissions with safety concerns go to moderation.</small>
    </div>
  );
}
