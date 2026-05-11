import { createShareId, jsonResponse, saveShare, validateShareData } from '../_share-storage.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error('[AlbaBEE share function] invalid_json', error);
    return jsonResponse({ error: 'invalid_json' }, { status: 400 });
  }

  const validationError = validateShareData(body && body.data);
  if (validationError) {
    console.error('[AlbaBEE share function] invalid_share_data', validationError);
    return jsonResponse({ error: 'invalid_share_data', message: validationError }, { status: 400 });
  }

  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim().slice(0, 80)
    : '알바BEE 알바 근무표';
  const description = typeof body.description === 'string' && body.description.trim()
    ? body.description.trim().slice(0, 240)
    : '공유된 근무표와 예상 급여를 확인해보세요.';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const id = createShareId();
    const saved = await saveShare(env, id, {
      data: body.data,
      title,
      description,
      createdAt: new Date().toISOString(),
    });

    if (!saved) {
      console.error('[AlbaBEE share function] share_store_not_configured', {
        hasShareKv: Boolean(env && env.SHARE_KV),
        hasAlbabeeShareKv: Boolean(env && env.ALBABEE_SHARE_KV),
        hasShares: Boolean(env && env.SHARES),
      });
      return jsonResponse({
        error: 'share_store_not_configured',
        message: 'Cloudflare KV binding SHARE_KV is required for short share links.',
      }, { status: 503 });
    }

    const url = new URL(request.url);
    console.info('[AlbaBEE share function] saved', { id, dataLength: body.data.length });
    return jsonResponse({ id, url: `${url.origin}/s/${id}` });
  }

  console.error('[AlbaBEE share function] id_generation_failed');
  return jsonResponse({ error: 'id_generation_failed' }, { status: 500 });
}

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/`, 302);
}
