export async function onRequestGet(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const token = params.token;

  let id = null;
  if (/^[a-f0-9]{32}$/.test(token) && env.PORTAS) {
    try {
      id = await env.PORTAS.get('t:' + token);
      await env.PORTAS.delete('t:' + token);
    } catch {}
  }

  if (!id) {
    id = url.searchParams.get('id');
  }

  if (!id || !['1', '2', '3', '4'].includes(id)) {
    return Response.redirect(url.origin + '/', 302);
  }

  let res = null;
  if (env.ASSETS) {
    try {
      res = await env.ASSETS.fetch(new URL('/_sala-' + id + '.html', url));
      if (!res.ok) {
        res = await env.ASSETS.fetch(new URL('/_sala-' + id, url));
      }
    } catch {}
  }

  if (!res || !res.ok) {
    return Response.redirect(url.origin + '/_sala-' + id + '.html', 302);
  }

  return new Response(res.body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  });
}
