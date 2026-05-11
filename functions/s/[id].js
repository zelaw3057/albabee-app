import { jsonResponse, readShare } from '../_share-storage.js';

const DEFAULT_TITLE = '알바BEE 알바 근무표';
const DEFAULT_DESCRIPTION = '공유된 근무표와 예상 급여를 확인해보세요.';
const THUMBNAIL_URL = 'https://albabee.pages.dev/thumbnail.png';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wantsJson(request) {
  const url = new URL(request.url);
  return url.searchParams.get('format') === 'json' || (request.headers.get('Accept') || '').includes('application/json');
}

function buildOgTags(request, share) {
  const url = new URL(request.url);
  const canonicalUrl = `${url.origin}${url.pathname}`;
  const title = escapeHtml((share && share.title) || DEFAULT_TITLE);
  const description = escapeHtml((share && share.description) || DEFAULT_DESCRIPTION);
  return `
  <title>${title}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${THUMBNAIL_URL}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${THUMBNAIL_URL}" />
  <script>window.__ALBABEE_SHARE_ID=${JSON.stringify(url.pathname.split('/').filter(Boolean).pop() || '')};</script>`;
}

async function loadIndexHtml(request, env) {
  const url = new URL(request.url);
  url.pathname = '/index.html';
  url.search = '';
  const response = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
  return response.text();
}

export async function onRequestGet({ request, env, params }) {
  const id = params.id;
  if (!id || !/^[A-Za-z0-9_-]{4,32}$/.test(id)) {
    return wantsJson(request)
      ? jsonResponse({ error: 'invalid_share_id' }, { status: 400 })
      : Response.redirect(new URL('/', request.url).toString(), 302);
  }

  const share = await readShare(env, id);
  if (!share) {
    return wantsJson(request)
      ? jsonResponse({ error: 'share_not_found' }, { status: 404 })
      : Response.redirect(new URL('/', request.url).toString(), 302);
  }

  if (wantsJson(request)) {
    return jsonResponse({
      id,
      data: share.data,
      title: share.title || DEFAULT_TITLE,
      description: share.description || DEFAULT_DESCRIPTION,
      createdAt: share.createdAt || null,
    });
  }

  const html = await loadIndexHtml(request, env);
  const withOg = html.replace('<head>', `<head>${buildOgTags(request, share)}`);
  return new Response(withOg, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
