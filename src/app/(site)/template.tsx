/** Re-mounts on every navigation, so each page arrives with the same short fade-up. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
