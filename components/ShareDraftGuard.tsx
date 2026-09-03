"use client";

import { useEffect } from "react";
import { trackFunnelEventAction } from "@/app/actions";

const DRAFT_KEY = "linkedout:share-draft:v1";
const CONTROLLED_FIELDS = ["companyId", "roleFamily", "country", "primaryReason", "positiveExperience", "reasonForLeaving", "wishIKnew", "recommendCompany", "workHereAgain"];

type Draft = Record<string, string | string[]>;

function dispatch(name: string, value: string) {
  document.dispatchEvent(new CustomEvent("linkedout:autofill", { detail: { name, value } }));
}

function anonymityWarnings(form: HTMLFormElement) {
  const text = ["positiveExperience", "reasonForLeaving", "wishIKnew"].map((name) => String(new FormData(form).get(name) || "")).join(" ");
  const warnings = [];
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) warnings.push("an email address");
  if (/(?:\+?\d[\d\s\-()]{7,}\d)/.test(text)) warnings.push("a phone number");
  if (/\b(?:my manager|my boss|manager)\s+[A-Z][a-z]+/.test(text)) warnings.push("a named private person");
  if (/\b(?:on|dated?)\s+(?:\d{1,2}[/-]){2}\d{2,4}\b/i.test(text)) warnings.push("an exact date");
  if (/\bteam of (?:[1-9]|ten)\b/i.test(text)) warnings.push("a very small team detail");
  return warnings;
}

export default function ShareDraftGuard({ authenticated }: { authenticated: boolean }) {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>('[data-share-form="true"]');
    if (!form) return;

    if (authenticated) {
      const rawDraft = window.localStorage.getItem(DRAFT_KEY);
      if (rawDraft) {
        try {
          const draft = JSON.parse(rawDraft) as Draft;
          for (const name of CONTROLLED_FIELDS) {
            const value = draft[name];
            if (typeof value === "string") dispatch(name, value);
          }
          const otherReasons = draft.otherReasons;
          if (Array.isArray(otherReasons)) document.dispatchEvent(new CustomEvent("linkedout:autofill-reasons", { detail: otherReasons }));
          window.localStorage.removeItem(DRAFT_KEY);
        } catch {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      }
    }

    function handleSubmit(event: Event) {
      if (authenticated) {
        const warnings = anonymityWarnings(form!);
        if (warnings.length && !window.confirm(`This detail may make you identifiable: ${warnings.join(", ")}. Edit the story if needed, or choose OK to submit for moderation.`)) event.preventDefault();
        if (!event.defaultPrevented) void trackFunnelEventAction("share_form_completed");
        return;
      }
      event.preventDefault();
      const formData = new FormData(form!);
      const draft: Draft = {};
      for (const [name, value] of formData.entries()) {
        if (value instanceof File) continue;
        const current = draft[name];
        draft[name] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
      }
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      window.location.assign("/signup?returnTo=%2Fsubmit");
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [authenticated]);

  return null;
}
