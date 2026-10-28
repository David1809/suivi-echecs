import { Chess } from 'chess.js';

const SB = 'https://qsyrrcrknxdkdsxkoooa.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzeXJyY3Jrbnhka2RzeGtvb29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODQyMzMsImV4cCI6MjEwNjg2MDIzM30.4ks8YNW4oYoPbSOiBT4Y9UCotErus8aydDaQUDm7crs';
const PSEUDO = 'David180998';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? (k.startsWith('aria-') ? 'true' : '') : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
const S = {
  code: store.get('ec_code'), data: store.get('ec_data', []), mode: store.get('ec_mode'),
  periode: store.get('ec_periode', '90'), tab: 'accueil',
  filtre: { couleur: 'tous', issue: 'tous', q: '' }, nbListe: 60, ouvCouleur: 'blancs', ouvert: new Set(), syncEnCours: false
};

/* ---------- données ---------- */
const MODES = { rapid: 'Rapide', blitz: 'Blitz', bullet: 'Bullet', daily: 'Quotidien' };
const PERDU = ['checkmated', 'resigned', 'timeout', 'abandoned'];
const FIN_PERDU = { resigned: 'abandon', checkmated: 'mat', timeout: 'temps écoulé', abandoned: 'déconnexion' };
const FIN_GAGNE = { resigned: 'abandon adverse', checkmated: 'mat', timeout: 'temps adverse', abandoned: 'départ adverse' };

async function rpc(nom, args) {
  const r = await fetch(`${SB}/rest/v1/rpc/${nom}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const txt = await r.text();
  let json; try { json = JSON.parse(txt); } catch { json = txt; }
  if (!r.ok) { const e = new Error(json?.message || 'Erreur réseau'); e.status = r.status; throw e; }
  return json;
}

function preparer(brut) {
  const parClasse = {};
  const arr = brut.map(g => {
    const issue = g.res === 'win' ? 'g' : PERDU.includes(g.res) ? 'p' : 'n';
    return { ...g, issue, date: new Date(g.t * 1000), delta: null };
  }).sort((a, b) => a.t - b.t);
  for (const g of arr) {
    if (g.r !== 'chess' || g.e == null) continue;
    const prev = parClasse[g.c];
    if (prev != null) g.delta = g.e - prev;
    parClasse[g.c] = g.e;
  }
  return arr;
}
let PARTIES = preparer(S.data);

const doneesMode = (mode = S.mode) => PARTIES.filter(g => g.c === mode && g.r === 'chess');
function jours(p) { return p === 'tout' ? Infinity : +p; }
function dansPeriode(arr, p) {
  if (p === 'tout' || !arr.length) return arr;
  const lim = Date.now() / 1000 - jours(p) * 86400;
  return arr.filter(g => g.t >= lim);
}
function modeParDefaut() {
  const lim = Date.now() / 1000 - 90 * 86400;
  const cpt = {};
  for (const g of PARTIES) if (g.r === 'chess' && g.t >= lim) cpt[g.c] = (cpt[g.c] || 0) + 1;
  const best = Object.entries(cpt).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : 'rapid';
}

function stats(arr) {
  const s = { n: arr.length, g: 0, p: 0, nul: 0, prec: null, blancs: { n: 0, g: 0 }, noirs: { n: 0, g: 0 }, ecart: { faible: { n: 0, g: 0 }, proche: { n: 0, g: 0 }, fort: { n: 0, g: 0 } }, finP: {}, finG: {} };
  let ps = 0, pn = 0;
  for (const g of arr) {
    s[g.issue === 'g' ? 'g' : g.issue === 'p' ? 'p' : 'nul']++;
    const c = s[g.co]; if (c) { c.n++; if (g.issue === 'g') c.g++; }
    if (g.e != null && g.ea != null) {
      const d = g.ea - g.e; const k = d < -50 ? 'faible' : d > 50 ? 'fort' : 'proche';
      s.ecart[k].n++; if (g.issue === 'g') s.ecart[k].g++;
    }
    if (g.p != null) { ps += g.p; pn++; }
    if (g.issue === 'p') s.finP[g.res] = (s.finP[g.res] || 0) + 1;
    if (g.issue === 'g') s.finG[g.ra] = (s.finG[g.ra] || 0) + 1;
  }
  s.prec = pn ? ps / pn : null; s.nPrec = pn;
  return s;
}
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

function famille(o) {
  if (!o) return { fam: 'Ouverture inconnue', var: '' };
  let s = o.replace(/-\d.*$/, '').replace(/\.{2,}.*$/, '').replace(/-with$/, '');
  let fam;
  if (/^Ruy-Lopez/.test(s)) fam = 'Ruy-Lopez';
  else {
    const m = s.match(/^(.*?-(?:Defense|Defence|Game|Opening|Gambit|Attack|System))(?:-|$)/);
    fam = m ? m[1] : s.split('-').slice(0, 2).join('-');
  }
  const reste = s.slice(fam.length).replace(/^-/, '');
  return { fam: fam.replace(/-/g, ' '), var: reste.replace(/-/g, ' ') };
}

/* ---------- formats ---------- */
const fJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fMois = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const signe = n => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
const cadence = tc => {
  if (!tc) return '';
  if (tc.includes('/')) return Math.round(+tc.split('/')[1] / 86400) + ' j/coup';
  const [b, i] = tc.split('+'); const m = +b / 60;
  return (Number.isInteger(m) ? m : (+b + 's')) + (Number.isInteger(m) ? ' min' : '') + (i ? ` + ${i} s` : '');
};
const esc = t => String(t ?? '');

/* ---------- courbe ---------- */
function courbeLisse(P) {
  if (P.length < 3) return P.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join('');
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const t = 0.18;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
function echantillon(pts, max = 150) {
  if (pts.length <= max) return pts;
  const out = []; const pas = pts.length / max;
  for (let i = 0; i < max; i++) out.push(pts[Math.min(pts.length - 1, Math.floor((i + 1) * pas) - 1)]);
  out[out.length - 1] = pts[pts.length - 1];
  return out;
}
function dessinerCourbe(host, pts, onScrub) {
  host.innerHTML = '';
  if (pts.length < 2) { host.append(h('div', { class: 'vide' }, pts.length ? 'Une seule partie sur cette période.' : 'Aucune partie sur cette période.')); return; }
  const W = host.clientWidth || 360, H = host.clientHeight || 230;
  const m = { t: 18, b: 26 };
  const ech = echantillon(pts);
  const es = ech.map(p => p.e);
  let lo = Math.min(...es), hi = Math.max(...es);
  const pad = Math.max(14, (hi - lo) * 0.14); lo = Math.floor((lo - pad) / 10) * 10; hi = Math.ceil((hi + pad) / 10) * 10;
  const X = i => 4 + (i / (ech.length - 1)) * (W - 14);
  const Y = e => m.t + (1 - (e - lo) / (hi - lo)) * (H - m.t - m.b);
  const P = ech.map((p, i) => [X(i), Y(p.e)]);
  const d = courbeLisse(P);
  const area = d + `L${W},${H - m.b}L0,${H - m.b}Z`;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const idg = 'g' + Math.random().toString(36).slice(2, 7);
  const grille = [0, 1, 2].map(k => {
    const v = lo + ((hi - lo) * (k + 0.5)) / 3; const y = Y(v);
    return `<line class="grille" x1="0" x2="${W}" y1="${y}" y2="${y}"/><text class="axe" x="20" y="${y - 5}">${Math.round(v / 10) * 10}</text>`;
  }).join('');
  let labels = ''; let dernier = -1; const marges = Math.max(1, Math.floor(ech.length / 4));
  ech.forEach((p, i) => {
    const mo = new Date(p.t * 1000).getMonth() + '-' + new Date(p.t * 1000).getFullYear();
    if (mo !== dernier) { if (dernier !== -1 && i > marges * 0.5 && i < ech.length - 6) labels += `<text class="axe" x="${X(i)}" y="${H - 6}" text-anchor="middle">${fMois.format(new Date(p.t * 1000))}</text>`; dernier = mo; }
  });
  svg.innerHTML = `<defs>
    <linearGradient id="${idg}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A58C8" stop-opacity=".16"/><stop offset="1" stop-color="#6A58C8" stop-opacity="0"/></linearGradient>
    <linearGradient id="${idg}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5B8DEF"/><stop offset="1" stop-color="#6A58C8"/></linearGradient>
  </defs>${grille}${labels}
  <path d="${area}" fill="url(#${idg}a)"/>
  <path class="ligne" d="${d}" fill="none" stroke="url(#${idg}l)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>
  <g class="cur" style="display:none"><line y1="${m.t - 6}" y2="${H - m.b}" stroke="#6A58C8" stroke-opacity=".45" stroke-dasharray="3 4"/><circle r="6" fill="#FFFFFF" stroke="#6A58C8" stroke-width="2.5"/></g>
  <circle class="fin" cx="${P.at(-1)[0]}" cy="${P.at(-1)[1]}" r="5" fill="#6A58C8"/>`;
  host.append(svg);
  const ligne = $('.ligne', svg);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !host.dataset.anime) {
    host.dataset.anime = '1';
    ligne.style.strokeDasharray = '1'; ligne.style.strokeDashoffset = '1';
    ligne.getBoundingClientRect();
    ligne.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.3,.7,.2,1)'; ligne.style.strokeDashoffset = '0';
  }
  const cur = $('.cur', svg), fin = $('.fin', svg);
  const move = ev => {
    const r = svg.getBoundingClientRect(); const x = Math.min(Math.max(ev.clientX - r.left, 0), r.width);
    const i = Math.round((x / r.width) * (ech.length - 1)); const p = P[i];
    cur.style.display = ''; fin.style.display = 'none';
    $('line', cur).setAttribute('x1', p[0]); $('line', cur).setAttribute('x2', p[0]);
    $('circle', cur).setAttribute('cx', p[0]); $('circle', cur).setAttribute('cy', p[1]);
    onScrub(ech[i]);
  };
  const fin_ = () => { cur.style.display = 'none'; fin.style.display = ''; onScrub(null); };
  svg.addEventListener('pointerdown', ev => { svg.setPointerCapture(ev.pointerId); move(ev); });
  svg.addEventListener('pointermove', ev => { if (ev.buttons || ev.pointerType === 'mouse') move(ev); });
  svg.addEventListener('pointerup', fin_); svg.addEventListener('pointercancel', fin_); svg.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') fin_(); });
}

/* ---------- vues ---------- */
function barrePile(s, hauteur) {
  const t = s.g + s.p + s.nul || 1;
  return h('div', { class: 'pile', role: 'img', 'aria-label': `${s.g} victoires, ${s.nul} nulles, ${s.p} défaites` },
    h('i', { class: 'g', style: `width:${(100 * s.g) / t}%` }), h('i', { class: 'n', style: `width:${(100 * s.nul) / t}%` }), h('i', { class: 'p', style: `width:${(100 * s.p) / t}%` }));
}
const ligneKV = (k, sous, v, barre) => h('div', { class: 'ligne-kv' }, h('div', { class: 'k' }, k, sous && h('small', {}, sous)), barre != null && h('div', { class: 'barre' }, h('i', { style: `width:${barre}%` })), h('div', { class: 'v' }, v));

function vueAccueil() {
  const v = $('#v-accueil'); v.innerHTML = '';
  const modes = Object.keys(MODES).map(m => [m, PARTIES.filter(g => g.c === m && g.r === 'chess').length]).filter(x => x[1] > 0);
  if (!S.mode || !modes.find(x => x[0] === S.mode)) S.mode = modeParDefaut();
  const tous = doneesMode(); const per = dansPeriode(tous, S.periode);
  const hero = h('section', { class: 'hero' });
  hero.append(h('div', { class: 'modes', role: 'group', 'aria-label': 'Cadence' }, modes.sort((a, b) => b[1] - a[1]).map(([m, n]) =>
    h('button', { 'aria-pressed': m === S.mode, onclick: () => { S.mode = m; store.set('ec_mode', m); rendre(); } }, MODES[m], h('span', { class: 'n' }, n)))));
  const dernier = tous.at(-1);
  const val = h('div', { class: 'elo-val' }, dernier ? String(dernier.e) : '—');
  const sub = h('div', { class: 'elo-sub' });
  const base = () => {
    if (!per.length) { sub.textContent = 'Aucune partie sur cette période'; return; }
    const d = per.at(-1).e - per[0].e;
    sub.innerHTML = '';
    sub.append(h('b', { class: d < 0 ? 'neg' : '' }, signe(d)), ` sur ${S.periode === 'tout' ? 'tout l’historique' : S.periode === '365' ? 'un an' : S.periode + ' jours'}, meilleur classement ${Math.max(...tous.map(g => g.e))}`);
  };
  base();
  hero.append(h('div', { class: 'elo' }, val, sub));
  const courbe = h('div', { class: 'courbe' });
  hero.append(courbe);
  hero.append(h('div', { class: 'periodes', role: 'group', 'aria-label': 'Période' }, [['30', '30 jours'], ['90', '3 mois'], ['365', '1 an'], ['tout', 'Tout']].map(([k, l]) =>
    h('button', { 'aria-pressed': S.periode === k, onclick: () => { S.periode = k; store.set('ec_periode', k); rendre(); } }, l))));
  v.append(hero);
  requestAnimationFrame(() => dessinerCourbe(courbe, per.map(g => ({ t: g.t, e: g.e })), p => {
    if (!p) { val.textContent = dernier ? dernier.e : '—'; base(); return; }
    val.textContent = p.e; sub.textContent = fCourt.format(new Date(p.t * 1000));
  }));

  const s = stats(per);
  const bilan = h('section', { class: 'bloc' }, h('h2', {}, 'Bilan', h('small', {}, `${s.n} parties`)));
  if (!s.n) bilan.append(h('div', { class: 'vide-liste' }, 'Pas de partie à afficher sur cette période.'));
  else {
    bilan.append(h('div', { class: 'bilan-top' }, h('div', { class: 'grand' }, pct(s.g, s.n) + ' %'), h('div', { class: 'txt' }, 'de victoires')));
    bilan.append(barrePile(s), h('div', { class: 'legende' }, h('span', { class: 'g' }, `${s.g} gagnées`), h('span', { class: 'n' }, `${s.nul} nulles`), h('span', { class: 'p' }, `${s.p} perdues`)));
    const L = h('div', { class: 'lignes' });
    if (s.prec != null) L.append(ligneKV('Précision moyenne', `sur ${s.nPrec} parties analysées par chess.com`, s.prec.toFixed(1) + ' %', s.prec));
    L.append(ligneKV('Avec les blancs', `${s.blancs.n} parties`, pct(s.blancs.g, s.blancs.n) + ' %', pct(s.blancs.g, s.blancs.n)));
    L.append(ligneKV('Avec les noirs', `${s.noirs.n} parties`, pct(s.noirs.g, s.noirs.n) + ' %', pct(s.noirs.g, s.noirs.n)));
    [['faible', 'Contre plus faible que toi'], ['proche', 'Contre un niveau proche'], ['fort', 'Contre plus fort que toi']].forEach(([k, l]) => {
      const e = s.ecart[k]; if (e.n) L.append(ligneKV(l, `${e.n} parties`, pct(e.g, e.n) + ' %', pct(e.g, e.n)));
    });
    bilan.append(L);
    const pert = Object.entries(s.finP).sort((a, b) => b[1] - a[1]);
    if (pert.length) {
      const L2 = h('div', { class: 'lignes' });
      pert.forEach(([k, n]) => L2.append(ligneKV('Défaites par ' + (FIN_PERDU[k] || k), null, `${n}`, pct(n, s.p))));
      bilan.append(h('h2', { style: 'margin-top:30px' }, 'Comment tu perds'), L2);
    }
  }
  v.append(bilan);
  const rec = h('section', { class: 'bloc', style: 'padding-left:0;padding-right:0' }, h('h2', { style: 'padding:0 20px' }, 'Dernières parties'));
  per.slice(-6).reverse().forEach(g => rec.append(ligPartie(g)));
  rec.append(h('button', { class: 'plus', onclick: () => aller('parties') }, 'Voir toutes les parties'));
  if (per.length) v.append(rec);
}

function ligPartie(g) {
  const o = famille(g.o);
  const det = o.fam === 'Ouverture inconnue' ? '' : o.fam;
  return h('button', { class: 'partie', onclick: () => ouvrirPartie(g) },
    h('span', { class: 'marque ' + g.issue }),
    h('span', { class: 'corps' }, h('div', { class: 'adv' }, esc(g.adv), h('span', {}, g.ea ?? '')), h('div', { class: 'det' }, (g.issue === 'g' ? 'Victoire' : g.issue === 'p' ? 'Défaite' : 'Nulle') + (g.issue === 'g' ? ` par ${FIN_GAGNE[g.ra] || '—'}` : g.issue === 'p' ? ` par ${FIN_PERDU[g.res] || g.res}` : '') + (det ? ' / ' + det : ''))),
    h('span', { class: 'droite' }, g.delta != null ? h('div', { class: 'delta ' + (g.delta > 0 ? 'pos' : g.delta < 0 ? 'neg' : 'zero') }, signe(g.delta)) : h('div', { class: 'delta zero' }, '—'),
      g.p != null && h('div', { class: 'prec' }, g.p.toFixed(0) + ' %')));
}

function vueParties() {
  const v = $('#v-parties'); v.innerHTML = '';
  v.append(h('div', { class: 'entete' }, h('h1', {}, 'Parties')));
  const f = S.filtre;
  const grp = (cle, opts) => opts.map(([k, l]) => h('button', { 'aria-pressed': f[cle] === k, onclick: () => { f[cle] = k; S.nbListe = 60; vueParties(); } }, l));
  v.append(h('div', { class: 'filtres' },
    ...Object.keys(MODES).filter(m => PARTIES.some(g => g.c === m)).map(m => h('button', { 'aria-pressed': S.mode === m, onclick: () => { S.mode = m; store.set('ec_mode', m); S.nbListe = 60; vueParties(); } }, MODES[m])),
  ));
  v.append(h('div', { class: 'filtres' }, ...grp('couleur', [['tous', 'Les deux couleurs'], ['blancs', 'Blancs'], ['noirs', 'Noirs']])));
  v.append(h('div', { class: 'filtres' }, ...grp('issue', [['tous', 'Tous résultats'], ['g', 'Victoires'], ['p', 'Défaites'], ['n', 'Nulles']])));
  const champ = h('input', { class: 'recherche', type: 'search', placeholder: 'Chercher un adversaire ou une ouverture', value: f.q, 'aria-label': 'Recherche' });
  champ.addEventListener('input', () => { f.q = champ.value; S.nbListe = 60; liste(); });
  v.append(champ);
  const zone = h('div', { style: 'margin-top:8px' }); v.append(zone);
  function liste() {
    zone.innerHTML = '';
    const q = f.q.trim().toLowerCase();
    const arr = doneesMode().filter(g => (f.couleur === 'tous' || g.co === f.couleur) && (f.issue === 'tous' || g.issue === f.issue) &&
      (!q || (g.adv || '').toLowerCase().includes(q) || (g.o || '').toLowerCase().replace(/-/g, ' ').includes(q))).reverse();
    if (!arr.length) { zone.append(h('div', { class: 'vide-liste' }, 'Aucune partie ne correspond à ces filtres.')); return; }
    let jourPrec = '';
    arr.slice(0, S.nbListe).forEach(g => {
      const j = fJour.format(g.date) + (g.date.getFullYear() !== new Date().getFullYear() ? ' ' + g.date.getFullYear() : '');
      if (j !== jourPrec) { zone.append(h('div', { class: 'jour' }, j.charAt(0).toUpperCase() + j.slice(1))); jourPrec = j; }
      zone.append(ligPartie(g));
    });
    if (arr.length > S.nbListe) zone.append(h('button', { class: 'plus', onclick: () => { S.nbListe += 80; liste(); } }, `Afficher plus (${arr.length - S.nbListe} restantes)`));
  }
  liste();
}

function vueOuvertures() {
  const v = $('#v-ouvertures'); v.innerHTML = '';
  v.append(h('div', { class: 'entete' }, h('h1', {}, 'Ouvertures')));
  v.append(h('div', { class: 'filtres' },
    ...['blancs', 'noirs'].map(c => h('button', { 'aria-pressed': S.ouvCouleur === c, onclick: () => { S.ouvCouleur = c; vueOuvertures(); } }, 'Avec les ' + c)),
    ...Object.keys(MODES).filter(m => PARTIES.some(g => g.c === m)).map(m => h('button', { 'aria-pressed': S.mode === m, onclick: () => { S.mode = m; store.set('ec_mode', m); vueOuvertures(); } }, MODES[m]))));
  const arr = dansPeriode(doneesMode(), 'tout').filter(g => g.co === S.ouvCouleur);
  const fams = new Map();
  for (const g of arr) {
    const o = famille(g.o); const F = fams.get(o.fam) || { fam: o.fam, parties: [], vars: new Map() };
    F.parties.push(g); const k = o.var || 'Ligne principale';
    const Vv = F.vars.get(k) || []; Vv.push(g); F.vars.set(k, Vv); fams.set(o.fam, F);
  }
  const liste = [...fams.values()].sort((a, b) => b.parties.length - a.parties.length);
  if (!liste.length) { v.append(h('div', { class: 'vide-liste' }, 'Pas encore de parties dans ce mode.')); return; }
  v.append(h('p', { style: 'padding:6px 20px 0;color:var(--doux);font-size:14px' }, 'Toutes tes parties du mode choisi. Touche une ouverture pour voir ses variantes.'));
  liste.forEach(F => {
    const s = stats(F.parties);
    const bloc = h('div', { class: 'ouv' + (S.ouvert.has(S.ouvCouleur + F.fam) ? ' ouvert' : '') });
    bloc.append(h('button', { 'aria-expanded': S.ouvert.has(S.ouvCouleur + F.fam), onclick: () => { const k = S.ouvCouleur + F.fam; S.ouvert.has(k) ? S.ouvert.delete(k) : S.ouvert.add(k); bloc.classList.toggle('ouvert'); } },
      h('div', { class: 't' }, h('span', { class: 'nom' }, F.fam), h('span', { class: 'nb' }, `${s.n} parties`)), barrePile(s), h('div', { class: 'pct' }, `${pct(s.g, s.n)} % de victoires`)));
    const vars = h('div', { class: 'vars' });
    [...F.vars.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([nom, ps]) => {
      const sv = stats(ps);
      vars.append(h('div', { class: 'var' }, h('div', { class: 't' }, h('span', { class: 'nom' }, nom), h('span', { class: 'nb' }, `${sv.n} / ${pct(sv.g, sv.n)} %`)), barrePile(sv)));
    });
    bloc.append(vars); v.append(bloc);
  });
}

function vueReglages() {
  const v = $('#v-reglages'); v.innerHTML = '';
  v.append(h('div', { class: 'entete' }, h('h1', {}, 'Réglages')));
  const etat = h('p', {}, `Compte chess.com : ${PSEUDO}. ${PARTIES.length} parties enregistrées${S.derniere ? ', dernière mise à jour ' + new Date(S.derniere).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : ''}.`);
  const btn = h('button', { class: 'btn', onclick: () => synchroniser(btn, etat) }, 'Synchroniser maintenant');
  if (S.syncEnCours) { btn.disabled = true; btn.textContent = 'Synchronisation en cours'; }
  v.append(h('div', { class: 'reglage' }, h('h3', {}, 'Mettre à jour mes parties'), h('p', {}, 'Une mise à jour automatique a lieu chaque nuit. Utilise ce bouton pour récupérer tes dernières parties tout de suite (compte environ une minute).'), btn, etat));
  const nouv = h('input', { class: 'champ', type: 'password', placeholder: 'Nouveau code (6 caractères minimum)', autocomplete: 'new-password' });
  const msg = h('p', { style: 'margin:0' });
  v.append(h('div', { class: 'reglage' }, h('h3', {}, 'Code d’accès'), h('p', {}, 'Ce code protège tes données. Il est enregistré sur cet appareil.'), nouv,
    h('button', { class: 'btn discret', onclick: async () => {
      try { await rpc('echecs_changer_code', { p_ancien: S.code, p_nouveau: nouv.value }); S.code = nouv.value; store.set('ec_code', S.code); nouv.value = ''; msg.textContent = 'Code modifié sur cet appareil. Pense à le saisir sur tes autres appareils.'; }
      catch (e) { msg.textContent = e.message; }
    } }, 'Changer le code'), h('div', { style: 'height:10px' }), msg));
  v.append(h('div', { class: 'reglage' }, h('h3', {}, 'Cet appareil'),
    h('p', {}, 'Les données sont gardées en mémoire pour que l’appli s’ouvre même sans réseau.'),
    h('button', { class: 'btn discret', onclick: () => { ['ec_code', 'ec_data'].forEach(store.del); location.reload(); } }, 'Verrouiller et effacer les données locales')));
}

/* ---------- synchro ---------- */
function toast(t, ms = 3200) {
  const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), ms);
}
async function charger(silencieux = true) {
  try {
    const brut = await rpc('echecs_resume', { p_code: S.code });
    S.data = brut; store.set('ec_data', brut); PARTIES = preparer(brut);
    try { const e = await rpc('echecs_sync_etat', { p_code: S.code }); S.derniere = e.derniere_synchro; } catch {}
    return true;
  } catch (e) {
    if (/Code incorrect/.test(e.message)) { S.code = null; store.del('ec_code'); afficherAcces('Code incorrect.'); return false; }
    if (!silencieux) toast('Impossible de joindre le serveur. Les données affichées sont celles de la dernière ouverture.');
    return true;
  }
}
async function synchroniser(btn, etat) {
  if (S.syncEnCours) return;
  S.syncEnCours = true; btn.disabled = true; btn.textContent = 'Synchronisation en cours';
  const avant = PARTIES.length;
  try {
    await rpc('echecs_sync', { p_code: S.code });
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const e = await rpc('echecs_sync_etat', { p_code: S.code });
      if (e.en_attente === 0) break;
    }
    await charger(false); rendre();
    const nb = PARTIES.length - avant; toast(nb > 0 ? `${nb} nouvelle${nb > 1 ? 's' : ''} partie${nb > 1 ? 's' : ''} récupérée${nb > 1 ? 's' : ''}` : 'Tout est à jour');
  } catch (e) { toast(e.message || 'La synchronisation a échoué'); }
  S.syncEnCours = false; if (S.tab === 'reglages') vueReglages();
}

/* ---------- rejeu ---------- */
const GLYPHE = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
async function ouvrirPartie(g) {
  const f = $('#feuille'); f.classList.add('on'); document.body.style.overflow = 'hidden';
  const in_ = h('div', { class: 'in' }, h('div', { class: 'charge' }, 'Chargement de la partie'));
  f.innerHTML = ''; f.append(in_); f.scrollTop = 0;
  let pgn;
  try { pgn = await rpc('echecs_partie', { p_code: S.code, p_url: g.u }); } catch (e) { in_.innerHTML = ''; in_.append(h('div', { class: 'vide-liste' }, 'Cette partie n’a pas pu être chargée. Vérifie ta connexion.'), h('button', { class: 'plus', onclick: fermer }, 'Fermer')); return; }
  const ch = new Chess();
  try { ch.loadPgn(pgn); } catch { in_.innerHTML = ''; in_.append(h('div', { class: 'vide-liste' }, 'Les coups de cette partie sont illisibles.'), h('button', { class: 'plus', onclick: fermer }, 'Fermer')); return; }
  const coups = ch.history({ verbose: true });
  const rej = new Chess(); const pos = [rej.board()];
  for (const c of coups) { rej.move(c.san); pos.push(rej.board()); }
  let i = coups.length, bas = g.co === 'blancs' ? 'w' : 'b', lecture = null;
  const plateau = h('div', { class: 'plateau', role: 'img', 'aria-label': 'Échiquier' });
  const liste = h('div', { class: 'coups' });
  const btn = (nom, svg, fn, cls = '') => h('button', { 'aria-label': nom, class: cls, onclick: fn, html: svg });
  const ic = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const bDebut = btn('Début', ic('<path d="M6 5v14M18 6l-8 6 8 6z"/>'), () => aller_(0));
  const bPrec = btn('Coup précédent', ic('<path d="M15 6l-6 6 6 6"/>'), () => aller_(i - 1));
  const bLire = btn('Lecture', ic('<path d="M8 5l11 7-11 7z"/>'), () => bascule(), 'lecture');
  const bSuiv = btn('Coup suivant', ic('<path d="M9 6l6 6-6 6"/>'), () => aller_(i + 1));
  const bFin = btn('Fin', ic('<path d="M18 5v14M6 6l8 6-8 6z"/>'), () => aller_(coups.length));
  const bTour = btn('Retourner l’échiquier', ic('<path d="M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3"/>'), () => { bas = bas === 'w' ? 'b' : 'w'; dessiner(); });
  function bascule() {
    if (lecture) { clearInterval(lecture); lecture = null; bLire.innerHTML = ic('<path d="M8 5l11 7-11 7z"/>'); return; }
    if (i >= coups.length) i = 0;
    bLire.innerHTML = ic('<path d="M8 5v14M16 5v14"/>');
    lecture = setInterval(() => { if (i >= coups.length) { bascule(); return; } aller_(i + 1); }, 900);
  }
  function aller_(n) { i = Math.max(0, Math.min(coups.length, n)); dessiner(); }
  function dessiner() {
    plateau.innerHTML = ''; const B = pos[i]; const dern = i > 0 ? coups[i - 1] : null;
    const rangs = bas === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const cols = bas === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    rangs.forEach((r, ri) => cols.forEach((c, ci) => {
      const nom = 'abcdefgh'[c] + (8 - r); const p = B[r][c];
      const cas = h('div', { class: 'case ' + ((r + c) % 2 ? 'fo' : 'cl') + (dern && (dern.from === nom || dern.to === nom) ? ' der' : '') });
      if (p) cas.append(h('span', { class: 'p ' + (p.color === 'w' ? 'b' : 'n') }, GLYPHE[p.type] + '︎'));
      if (ci === 0) cas.append(h('span', { class: 'co r' }, String(8 - r)));
      if (ri === 7) cas.append(h('span', { class: 'co f' }, 'abcdefgh'[c]));
      plateau.append(cas);
    }));
    bDebut.disabled = bPrec.disabled = i === 0; bSuiv.disabled = bFin.disabled = i === coups.length;
    $$('button', liste).forEach(b => b.removeAttribute('aria-current'));
    const cur = i ? $(`button[data-i="${i}"]`, liste) : null;
    if (cur) { cur.setAttribute('aria-current', 'true'); cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  let tour = null;
  coups.forEach((c, k) => {
    const b = h('button', { 'data-i': k + 1, onclick: () => aller_(k + 1) }, c.san);
    if (c.color === 'w') { tour = h('span', { class: 'tour' }, h('span', { class: 'num' }, (k / 2 + 1) + '.'), b); liste.append(tour); }
    else if (tour && k > 0) { tour.append(b); tour = null; }
    else liste.append(h('span', { class: 'tour' }, h('span', { class: 'num' }, '…'), b));
  });
  const titre = g.issue === 'g' ? `Victoire par ${FIN_GAGNE[g.ra] || '—'}` : g.issue === 'p' ? `Défaite par ${FIN_PERDU[g.res] || g.res}` : 'Partie nulle';
  const o = famille(g.o);
  in_.innerHTML = '';
  in_.append(
    h('div', { class: 'haut' }, h('button', { class: 'fermer', onclick: fermer }, 'Fermer'), h('a', { class: 'lien', href: g.u, target: '_blank', rel: 'noopener' }, 'Ouvrir sur chess.com')),
    h('div', { class: 'issue ' + g.issue }, titre),
    h('div', { class: 'meta' }, [fCourt.format(g.date), cadence(g.tc), o.fam !== 'Ouverture inconnue' ? o.fam + (o.var ? ' / ' + o.var : '') : ''].filter(Boolean).join(' / ')),
    h('div', { class: 'joueur', id: 'j-haut' }), plateau, h('div', { class: 'joueur', id: 'j-bas' }),
    h('div', { class: 'cmd' }, bTour, bDebut, bPrec, bLire, bSuiv, bFin), liste);
  const moi = h('div', {}, h('b', {}, PSEUDO), ' ', h('span', {}, g.e ?? '')), lui = h('div', {}, h('b', {}, g.adv), ' ', h('span', {}, g.ea ?? ''));
  const maj = () => { const haut = $('#j-haut'), bs = $('#j-bas'); haut.innerHTML = bs.innerHTML = ''; const moiBas = bas === (g.co === 'blancs' ? 'w' : 'b'); (moiBas ? bs : haut).append(moi); (moiBas ? haut : bs).append(lui); };
  const dess0 = dessiner; dessiner = function () { dess0(); maj(); };
  dessiner();
  f._clavier = ev => { if (ev.key === 'ArrowLeft') aller_(i - 1); else if (ev.key === 'ArrowRight') aller_(i + 1); else if (ev.key === 'Escape') fermer(); };
  document.addEventListener('keydown', f._clavier);
  f._stop = () => { if (lecture) clearInterval(lecture); };
}
function fermer() {
  const f = $('#feuille'); f._stop?.(); if (f._clavier) document.removeEventListener('keydown', f._clavier);
  f.classList.remove('on'); f.innerHTML = ''; document.body.style.overflow = '';
}

/* ---------- navigation ---------- */
const VUES = { accueil: vueAccueil, parties: vueParties, ouvertures: vueOuvertures, reglages: vueReglages };
function aller(t) {
  S.tab = t; $$('.vue').forEach(e => e.classList.toggle('on', e.id === 'v-' + t));
  $$('nav.tabs button').forEach(b => (b.dataset.t === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  VUES[t](); window.scrollTo(0, 0);
}
function rendre() { VUES[S.tab](); }

function afficherAcces(erreur = '') {
  $('#app').style.display = 'none'; $('nav.tabs').style.display = 'none';
  const a = $('#acces'); a.style.display = ''; a.innerHTML = '';
  const champ = h('input', { class: 'champ', type: 'password', placeholder: 'Code d’accès', autocomplete: 'current-password', 'aria-label': 'Code d’accès' });
  const err = h('div', { class: 'err', role: 'alert' }, erreur);
  const go = async () => {
    if (!champ.value.trim()) return; S.code = champ.value.trim(); err.textContent = '';
    try { const ok = await charger(false); if (ok && S.code) { store.set('ec_code', S.code); demarrer(); } else err.textContent = 'Code incorrect.'; }
    catch { err.textContent = 'Connexion impossible.'; }
  };
  champ.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  a.append(h('h1', {}, 'Mes parties d’échecs'), h('p', {}, `Le suivi de ${PSEUDO}. Saisis ton code d’accès pour afficher tes statistiques.`), champ, err, h('button', { class: 'btn', onclick: go }, 'Entrer'));
}
function demarrer() {
  $('#acces').style.display = 'none'; $('#app').style.display = ''; $('nav.tabs').style.display = '';
  if (!S.mode) S.mode = modeParDefaut();
  aller(S.tab);
}
async function init() {
  $$('nav.tabs button').forEach(b => b.addEventListener('click', () => aller(b.dataset.t)));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  addEventListener('resize', () => { if (S.tab === 'accueil') { clearTimeout(init.rt); init.rt = setTimeout(() => { const c = $('.courbe'); if (c) { c.dataset.anime = '1'; rendre(); } }, 150); } });
  if (!S.code) { afficherAcces(); return; }
  demarrer();
  if (await charger(true)) rendre();
}
init();
