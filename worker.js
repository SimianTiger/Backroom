// worker.js — Cloudflare Worker (com assets estáticos + KV)
// Bindings esperados: ASSETS (arquivos do site) e PORTAS (KV namespace)

const UMA_VEZ = true; // true = a sala some depois da primeira visita (refresh te expulsa)
const TTL = 300;      // segundos que o link fica válido depois de clicar na porta

// Cada sala é um arquivo _sala-<id>.html. peso = chance relativa (maior = mais comum).
const SALAS = [
  { id: '1', peso: 4 },
  { id: '2', peso: 4 },
  { id: '3', peso: 3 },
  { id: '4', peso: 2 }, // mais rara
  // quando as salas 5 a 8 estiverem prontas, adicione aqui: { id: '5', peso: 3 }, ...
];

// Sorteia só entre as salas que a pessoa ainda não viu.
// Se já viu todas, recomeça (ou troque por uma sala final).
function sortear(vistas) {
  let pool = SALAS.filter((s) => !vistas.includes(s.id));
  if (!pool.length) pool = SALAS;
  const total = pool.reduce((a, s) => a + s.peso, 0);
  let r = (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * total;
  return pool.find((s) => (r -= s.peso) < 0) ?? pool[pool.length - 1];
}

const hex = (n) =>
  [...crypto.getRandomValues(new Uint8Array(n))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1) A porta pede um endereço novo
    if (url.pathname === '/api/porta' && request.method === 'POST') {
      const token = hex(16); // 32 caracteres, impossível de adivinhar
      const { vistas } = await request.json().catch(() => ({}));
      const sala = sortear(Array.isArray(vistas) ? vistas : []);
      await env.PORTAS.put('t:' + token, sala.id, { expirationTtl: TTL });
      return Response.json(
        { url: '/sala/' + token, id: sala.id },
        { headers: { 'cache-control': 'no-store' } }
      );
    }

    // 2) Alguém tenta entrar numa sala
    if (url.pathname.startsWith('/sala/')) {
      const token = url.pathname.slice('/sala/'.length);
      const id = /^[a-f0-9]{32}$/.test(token) && (await env.PORTAS.get('t:' + token));
      if (!id) return Response.redirect(url.origin + '/', 302); // a sala não existe

      if (UMA_VEZ) await env.PORTAS.delete('t:' + token);

      const res = await env.ASSETS.fetch(new URL('/_sala-' + id, url));
      return new Response(res.body, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex',
        },
      });
    }

    // 3) Acesso direto ao arquivo da sala (/_sala.html) é bloqueado
    return new Response('Não encontrado', { status: 404 });
  },
};

/* wrangler.toml (ajuste ao que você já tem):

name = "m-e-g"
main = "worker.js"
compatibility_date = "2026-10-01"

[assets]
directory = "./public"
binding = "ASSETS"
run_worker_first = ["/api/*", "/sala/*", "/_sala*"]

[[kv_namespaces]]
binding = "PORTAS"
id = "COLE_O_ID_DO_KV_AQUI"   # npx wrangler kv namespace create PORTAS
*/
