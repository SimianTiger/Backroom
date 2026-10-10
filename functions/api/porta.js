const TTL = 300;
const SALAS = [
  { id: '1', peso: 4 },
  { id: '2', peso: 4 },
  { id: '3', peso: 3 },
  { id: '4', peso: 2 },
];

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

export async function onRequestPost(context) {
  const { request, env } = context;
  const token = hex(16);
  let vistas = [];
  try {
    const body = await request.json();
    if (body && Array.isArray(body.vistas)) vistas = body.vistas;
  } catch {}
  const sala = sortear(vistas);

  if (env && env.PORTAS) {
    try {
      await env.PORTAS.put('t:' + token, sala.id, { expirationTtl: TTL });
    } catch {}
  }

  return new Response(
    JSON.stringify({ url: '/sala/' + token + '?id=' + sala.id, id: sala.id }),
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    }
  );
}
