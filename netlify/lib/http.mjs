// ردود JSON مع ترويسات التخزين المؤقت على شبكة Netlify.
export function json(body, { status = 200, cdn, vary } = {}) {
  const headers = { 'content-type': 'application/json; charset=utf-8' };
  if (cdn) {
    headers['cache-control'] = 'public, max-age=0, must-revalidate';
    headers['netlify-cdn-cache-control'] = cdn;
    if (vary) headers['netlify-vary'] = vary;
  } else {
    headers['cache-control'] = 'no-store';
  }
  return new Response(JSON.stringify(body), { status, headers });
}
