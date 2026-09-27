export const SITE_NAME = "임통";

// Canonical origin for metadata, the sitemap and share links.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Metadata for a public page. openGraph is set per page because nested
// metadata is replaced, not merged: without it a shared link would show the
// site's default title.
// With a path, the page also names its canonical URL, so ?s=1 share links
// and other query variants count as the same page for search engines.
export function shareMetadata(title: string, description?: string, path?: string) {
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: { siteName: SITE_NAME, locale: "ko_KR", type: "article" as const, title: `${title} · ${SITE_NAME}`, description, ...(path ? { url: path } : {}) },
  };
}
