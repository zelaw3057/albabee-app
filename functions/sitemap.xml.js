const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://albabee.pages.dev/</loc>
  </url>
  <url>
    <loc>https://albabee.pages.dev/minimum-wage</loc>
  </url>
  <url>
    <loc>https://albabee.pages.dev/night-pay</loc>
  </url>
  <url>
    <loc>https://albabee.pages.dev/weekly-pay</loc>
  </url>
  <url>
    <loc>https://albabee.pages.dev/wage-guide.html</loc>
  </url>
  <url>
    <loc>https://albabee.pages.dev/about.html</loc>
  </url>
  <url>
    <loc>https://albabee.pages.dev/privacy.html</loc>
  </url>
  <url>
    <loc>https://albabee.pages.dev/terms.html</loc>
  </url>
  <url>
    <loc>https://albabee.pages.dev/contact.html</loc>
  </url>
</urlset>
`;

export function onRequestGet() {
  return new Response(SITEMAP_XML, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, no-transform',
      'X-Robots-Tag': 'noarchive',
    },
  });
}
