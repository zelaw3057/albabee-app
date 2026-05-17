import { serveStaticAsset } from '../_static-asset-guard.js';

export function onRequestGet({ request, env }) {
  return serveStaticAsset(request, env, 'images');
}
