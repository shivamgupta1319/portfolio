/** Primary site navigation, shared by the header (client) and the footer (server). */
export const NAV_LINKS = [
  { href: "/apps/", label: "Work" },
  { href: "/experience/", label: "Experience" },
  { href: "/about/", label: "About" },
  { href: "/contact/", label: "Contact" },
] as const;

/** Secondary pages: footer only. */
export const MORE_LINKS = [{ href: "/infra/", label: "How I run it" }] as const;
