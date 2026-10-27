"use client";

import { useState } from "react";
import { profile } from "@/data/profile";

/** Copies the address; falls back to opening the mail client. */
export default function CopyEmailButton() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copyEmail}
        className={`inline-flex min-h-11 items-center rounded-full border px-5 text-base font-medium transition-colors ${
          copied ? "border-green text-green" : "border-border-strong text-fg hover:bg-panel-2"
        }`}
      >
        {copied ? "Copied" : "Copy email"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Email address copied" : ""}
      </span>
    </>
  );
}
