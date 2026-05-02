const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://albabee.pages.dev/</loc>
    <priority>1.0</priority>
  </url>
</urlset>
`;

export function onRequestGet() {
  return new Response(SITEMAP_XML, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, no-transform',
    },
  });
}
