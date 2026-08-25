"use client";

import { useEffect } from "react";

type AutofillDetail = { name: string; value: string | number };

function setControlValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string | number) {
  const prototype = control instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : control instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(control, String(value));
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Keeps regular form controls and React-controlled pickers on the same local autofill channel. */
export default function FormAutofillBridge() {
  useEffect(() => {
    function handleAutofill(event: Event) {
      const { name, value } = (event as CustomEvent<AutofillDetail>).detail;
      const form = document.querySelector<HTMLFormElement>('[data-share-form="true"]');
      const control = form?.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
        setControlValue(control, value);
      }
    }
    document.addEventListener("linkedout:autofill", handleAutofill);
    return () => document.removeEventListener("linkedout:autofill", handleAutofill);
  }, []);

  return null;
}
