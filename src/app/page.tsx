import JsonLd from "@/seo/JsonLd";
import ProfilePage from "@/profile/ProfilePage";
import LegacyDeepLink from "@/profile/LegacyDeepLink";

/** `/` — the recruiter-friendly profile page. Server-rendered into static HTML. */
export default function Home() {
  return (
    <>
      <JsonLd />
      <ProfilePage />
      <LegacyDeepLink />
    </>
  );
}
