import { profile } from "./profile";

export interface Channel {
  label: string;
  value: string;
  href: string;
  glyph: string;
  accent: string;
}

/** Secondary contact channels (email is the primary action). */
export const channels: Channel[] = [
  {
    label: "GitHub",
    value: profile.githubUser,
    href: profile.github,
    glyph: "⌥",
    accent: "text-fg",
  },
  {
    label: "LinkedIn",
    value: "in/myselfshivam",
    href: profile.linkedin,
    glyph: "in",
    accent: "text-cyan",
  },
  {
    label: "Location",
    value: profile.location,
    href: `https://maps.google.com/?q=${encodeURIComponent(profile.location)}`,
    glyph: "◉",
    accent: "text-green",
  },
];
