const ALLOWED_TYPES = {
  images: ['image/'],
  styles: ['text/css'],
  scripts: ['application/javascript', 'text/javascript'],
  assets: [
    'text/css',
    'application/javascript',
    'text/javascript',
    'application/manifest+json',
    'application/json',
    'image/',
    'font/',
  ],
};

function notFound() {
  return new Response('Not found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function isAllowedType(group, contentType) {
  const normalized = String(contentType || '').toLowerCase();
  return (ALLOWED_TYPES[group] || []).some(function(type) {
    return normalized.startsWith(type);
  });
}

export async function serveStaticAsset(request, env, group) {
  const response = await env.ASSETS.fetch(request);
  if (!response || !response.ok) return notFound();
  if (!isAllowedType(group, response.headers.get('Content-Type'))) return notFound();
  return response;
}
