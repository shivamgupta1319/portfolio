"use client";

import { useState } from "react";
import { profile } from "@/data/profile";
import { buttonClass } from "./button";

/** Copies the address; falls back to opening the mail client. */
export default function CopyEmail() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
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
      <button type="button" onClick={copy} className={`${buttonClass("ghost")} ${copied ? "!border-green !text-green" : ""}`}>
        {copied ? "Copied" : "Copy address"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Email address copied" : ""}
      </span>
    </>
  );
}
