/* porta.js — inclua em qualquer página: <script src="/porta.js" defer></script>
   Opcional, ANTES dele, para mudar o comportamento (ex.: na página da história):
   <script>window.PORTA = { chance: 1, espera: [10000, 30000], vida: [9000, 16000], repetir: true }</script> */
(() => {
  const O = window.PORTA || {};
  const CHANCE = O.chance ?? 0.35;          // chance de a porta existir
  const ESPERA = O.espera || [15000, 70000]; // aparece depois de X a Y ms
  const VIDA = O.vida || [8000, 15000];      // some sozinha se ninguém clicar
  const rand = (a, b) => a + Math.random() * (b - a);

  function agendar() {
    if (!O.repetir && sessionStorage.getItem('porta-vista')) return;
    if (Math.random() > CHANCE) { if (O.repetir) setTimeout(agendar, rand(...ESPERA)); return; }
    setTimeout(aparecer, rand(...ESPERA));
  }

  function aparecer() {
    sessionStorage.setItem('porta-vista', '1');

    if (!document.getElementById('porta-css')) {
      const css = document.createElement('style');
      css.id = 'porta-css';
      css.textContent = `
        .porta-dream{position:fixed;z-index:9999;width:54px;height:96px;padding:0;cursor:pointer;
          background:linear-gradient(#f3d9c4,#e6c2a6);border:4px solid #bfe3df;border-bottom-width:2px;
          border-radius:27px 27px 0 0;opacity:0;filter:blur(1px);
          box-shadow:0 0 36px 8px rgba(255,248,232,.55);animation:porta-in 3s ease forwards}
        .porta-dream::before{content:"";position:absolute;inset:10px 8px 14px;border:2px solid rgba(29,59,58,.25);border-radius:18px 18px 0 0}
        .porta-dream::after{content:"";position:absolute;right:8px;top:50%;width:6px;height:6px;border-radius:50%;background:#1d3b3a}
        .porta-dream:focus-visible{outline:3px solid #fff8e8;outline-offset:4px}
        @keyframes porta-in{0%{opacity:0}20%{opacity:.7}28%{opacity:.1}45%{opacity:.85}100%{opacity:.9}}
        @media (prefers-reduced-motion:reduce){.porta-dream{animation:none;opacity:.9}}
        .porta-flash{position:fixed;inset:0;z-index:10000;background:#fff8e8;opacity:0;transition:opacity 1s ease;pointer-events:none}
      `;
      document.head.appendChild(css);
    }

    const porta = document.createElement('button');
    porta.className = 'porta-dream';
    porta.setAttribute('aria-label', 'Uma porta que não estava aqui antes');
    porta.style.left = rand(4, 90) + 'vw';
    porta.style.top = rand(8, 75) + 'vh';
    porta.style.transform = `scale(${rand(0.7, 1.4).toFixed(2)})`;
    document.body.appendChild(porta);

    const sumir = setTimeout(() => { porta.remove(); if (O.repetir) agendar(); }, rand(...VIDA));

    porta.addEventListener('click', async () => {
      clearTimeout(sumir);
      porta.disabled = true;

      let destinoUrl = null;
      let vistas = [];
      try { vistas = JSON.parse(localStorage.getItem('portas-vistas') || '[]'); } catch {}

      try {
        const r = await fetch('/api/porta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vistas })
        });
        if (r.ok) {
          const data = await r.json();
          if (data && data.url) {
            destinoUrl = data.url;
            if (data.id) {
              try { localStorage.setItem('portas-vistas', JSON.stringify([...new Set([...vistas, data.id])])); } catch {}
            }
          }
        }
      } catch (e) {
        console.warn('Endpoint /api/porta inacessível, ativando fallback:', e);
      }

      // Se a API não responder (ex: testando localmente ou KV não configurado no Cloudflare), faz o sorteio localmente:
      if (!destinoUrl) {
        const SALAS = ['1', '2', '3', '4'];
        let pool = SALAS.filter((id) => !vistas.includes(id));
        if (!pool.length) pool = SALAS;
        const sorteada = pool[Math.floor(Math.random() * pool.length)];
        try { localStorage.setItem('portas-vistas', JSON.stringify([...new Set([...vistas, sorteada])])); } catch {}
        destinoUrl = '_sala-' + sorteada + '.html';
      }

      // Efeito de flash e redirecionamento para a sala
      const flash = document.createElement('div');
      flash.className = 'porta-flash';
      document.body.appendChild(flash);
      requestAnimationFrame(() => (flash.style.opacity = 1));
      setTimeout(() => { location.href = destinoUrl; }, 1000);
    });
  }

  agendar();
})();
