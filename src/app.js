import { Chess } from 'chess.js';
import { Moteur, NIV_ELO, paramsElo, eloProche, evaluerPositions, calculer, formatEval } from './analyse.js';

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
  v.append(blocErreurs(per));
  const rec = h('section', { class: 'bloc', style: 'padding-left:0;padding-right:0' }, h('h2', { style: 'padding:0 20px' }, 'Dernières parties'));
  per.slice(-6).reverse().forEach(g => rec.append(ligPartie(g)));
  rec.append(h('button', { class: 'plus', onclick: () => aller('parties') }, 'Voir toutes les parties'));
  if (per.length) v.append(rec);
}


/* ---------- statistiques d'erreurs (issues de l'analyse) ---------- */
const z4 = () => [0, 0, 0, 0];
function agreger(per) {
  const A = { n: 0, ph: { o: z4(), m: z4(), f: z4() }, tm: { a: z4(), b: z4(), c: z4() }, vt: { r: z4(), n: z4(), l: z4() }, ptPerdu: { o: 0, m: 0, f: 0 }, nPerdu: 0, prec: [] };
  const add = (a, b) => { for (let i = 0; i < 4; i++) a[i] += b[i]; };
  for (const g of per) {
    const r = S.ana[g.u]; if (!r || !r.st) continue;
    A.n++;
    for (const k of Object.keys(A.ph)) add(A.ph[k], r.st.ph[k]);
    for (const k of Object.keys(A.tm)) add(A.tm[k], r.st.tm[k]);
    for (const k of Object.keys(A.vt)) add(A.vt[k], r.st.vt[k]);
    const acc = g.co === 'blancs' ? r.aw : r.ab; if (acc != null) A.prec.push(acc);
    if (g.issue === 'p') { A.nPerdu++; if (r.ptp && r.ptm && r.ptd === 'p') A.ptPerdu[r.ptp]++; }
  }
  return A;
}
const taux = t => (t[0] >= 15 ? ((t[1] + t[2]) / t[0]) * 100 : null); // gaffes et erreurs pour 100 coups
const fmtTaux = x => (x == null ? '—' : x.toFixed(1).replace('.', ','));

function blocErreurs(per) {
  const A = agreger(per);
  const sec = h('section', { class: 'bloc' }, h('h2', {}, 'Tes erreurs', h('small', {}, `${A.n} parties analysées`)));
  if (!A.n) {
    sec.append(h('p', { class: 'ana-msg' }, 'Les statistiques apparaissent dès que des parties sont analysées. L’analyse automatique s’en charge quand l’appli est ouverte, ou ouvre une partie et touche « Analyser ».'));
    return sec;
  }
  if (A.n < per.length * 0.5) sec.append(h('p', { class: 'ana-msg' }, `Seulement ${A.n} parties sur ${per.length} sont analysées sur cette période. Augmente le nombre de parties analysées dans Réglages pour des chiffres plus fiables.`));
  const bloc = (titre, lignes, note) => {
    const L = h('div', { class: 'lignes' });
    const maxi = Math.max(1, ...lignes.map(l => l[2] || 0));
    lignes.forEach(([nom, sous, t]) => L.append(ligneKV(nom, sous, fmtTaux(t), t == null ? 0 : (100 * t) / maxi)));
    sec.append(h('h3', { class: 'sous-titre' }, titre), L);
    if (note) sec.append(h('p', { class: 'ana-msg', style: 'margin-top:8px' }, note));
  };
  const rows = (def, T) => def.map(([k, nom, sous]) => [nom, `${sous ? sous + ', ' : ''}${T[k][0]} coups`, taux(T[k])]);
  const withRate = r => r.map(([n, sbs, t]) => [n, sbs, t]);
  bloc('Où tu fais des fautes', withRate(rows([['o', 'Ouverture', ''], ['m', 'Milieu de jeu', ''], ['f', 'Finale', '']], A.ph)), 'Gaffes et erreurs pour 100 coups joués.');
  if (A.tm.a[0] + A.tm.b[0] + A.tm.c[0] > 0) bloc('Selon le temps qu’il te reste', withRate(rows([['a', 'Plus de la moitié du temps', ''], ['b', 'Entre 20 % et 50 %', ''], ['c', 'Moins de 20 %', '']], A.tm)));
  if (A.vt.r[0] + A.vt.n[0] + A.vt.l[0] > 0) bloc('Selon le temps passé sur le coup', withRate(rows([['r', 'Coup rapide', 'moins de 3 s'], ['n', 'Coup normal', '3 à 15 s'], ['l', 'Coup réfléchi', 'plus de 15 s']], A.vt)));
  if (A.nPerdu >= 3) {
    const tot = A.ptPerdu.o + A.ptPerdu.m + A.ptPerdu.f || 1;
    const L = h('div', { class: 'lignes' });
    [['o', 'Ouverture'], ['m', 'Milieu de jeu'], ['f', 'Finale']].forEach(([k, nom]) => L.append(ligneKV(nom, null, `${A.ptPerdu[k]}`, (100 * A.ptPerdu[k]) / tot)));
    sec.append(h('h3', { class: 'sous-titre' }, 'Quand tu perds, où la partie bascule'), L);
  }
  // constats en clair
  const nomPh = { o: 'l’ouverture', m: 'le milieu de jeu', f: 'la finale' };
  const phs = Object.keys(A.ph).filter(k => taux(A.ph[k]) != null).sort((a, b) => taux(A.ph[b]) - taux(A.ph[a]));
  const conseils = [];
  if (phs.length >= 2 && taux(A.ph[phs[0]]) >= 1.3 * (taux(A.ph[phs[phs.length - 1]]) || 0.1)) conseils.push(`C’est dans ${nomPh[phs[0]]} que tu fais le plus de fautes graves : ${fmtTaux(taux(A.ph[phs[0]]))} pour 100 coups, contre ${fmtTaux(taux(A.ph[phs[phs.length - 1]]))} dans ${nomPh[phs[phs.length - 1]]}.`);
  const ta = taux(A.tm.a), tc = taux(A.tm.c);
  if (ta != null && tc != null && tc >= 1.4 * Math.max(ta, 0.1)) conseils.push(`Quand il te reste moins de 20 % du temps, tu fais environ ${(tc / Math.max(ta, 0.1)).toFixed(1).replace('.', ',')} fois plus de fautes graves qu’avec plus de la moitié.`);
  const vr = taux(A.vt.r), autres = [A.vt.n, A.vt.l].reduce((s, t) => [s[0] + t[0], s[1] + t[1], s[2] + t[2], s[3] + t[3]], z4());
  const va = taux(autres);
  if (vr != null && va != null && vr >= 1.4 * Math.max(va, 0.1)) conseils.push(`Tes coups joués en moins de 3 secondes contiennent environ ${(vr / Math.max(va, 0.1)).toFixed(1).replace('.', ',')} fois plus de fautes graves que les autres : prends quelques secondes de plus.`);
  if (A.nPerdu >= 3) { const k = ['o', 'm', 'f'].sort((a, b) => A.ptPerdu[b] - A.ptPerdu[a])[0]; if (A.ptPerdu[k] >= 2) conseils.push(`Quand tu perds, la partie bascule le plus souvent dans ${nomPh[k]} (${A.ptPerdu[k]} fois sur ${A.nPerdu} défaites).`); }
  if (A.prec.length) conseils.push(`Ta précision moyenne sur les parties analysées est de ${Math.round(A.prec.reduce((x, y) => x + y, 0) / A.prec.length)} %.`);
  if (conseils.length) sec.append(h('h3', { class: 'sous-titre' }, 'Ce que ça dit'), h('div', { class: 'conseils' }, conseils.map(t => h('p', {}, t))));
  return sec;
}

function detLigne(g) {
  const o = famille(g.o);
  const ra = S.ana && S.ana[g.u]; const cn = ra ? (g.co === 'blancs' ? ra.cw : ra.cb) : null;
  const det = [o.fam === 'Ouverture inconnue' ? '' : o.fam, cn ? (cn.g ? pl(cn.g, 'gaffe') : 'sans gaffe') : ''].filter(Boolean).join(' / ');
  return (g.issue === 'g' ? 'Victoire' : g.issue === 'p' ? 'Défaite' : 'Nulle') + (g.issue === 'g' ? ` par ${FIN_GAGNE[g.ra] || '—'}` : g.issue === 'p' ? ` par ${FIN_PERDU[g.res] || g.res}` : '') + (det ? ' / ' + det : '');
}
function majBadge(u) {
  const g = PARTIES.find(x => x.u === u); if (!g) return;
  $$('.partie').forEach(e => { if (e.dataset.u === u) { const d = $('.det', e); if (d) d.textContent = detLigne(g); } });
}
function ligPartie(g) {
  return h('button', { class: 'partie', 'data-u': g.u, onclick: () => ouvrirPartie(g) },
    h('span', { class: 'marque ' + g.issue }),
    h('span', { class: 'corps' }, h('div', { class: 'adv' }, esc(g.adv), h('span', {}, g.ea ?? '')), h('div', { class: 'det' }, detLigne(g))),
    h('span', { class: 'droite' }, g.delta != null ? h('div', { class: 'delta ' + (g.delta > 0 ? 'pos' : g.delta < 0 ? 'neg' : 'zero') }, signe(g.delta)) : h('div', { class: 'delta zero' }, '—'),
      g.p != null && h('div', { class: 'prec' }, g.p.toFixed(0) + ' %')));
}

function vueParties() {
  const v = $('#v-parties'); v.innerHTML = '';
  v.append(h('div', { class: 'entete' }, h('h1', {}, 'Parties')), h('p', { class: 'statut-auto statut-liste' }));
  majStatut();
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
  const selNiv = h('select', { class: 'champ sel', 'aria-label': 'Niveau d’analyse par défaut', onchange: () => { S.niveau = selNiv.value === 'auto' ? null : +selNiv.value; store.set('ec_niv', S.niveau); vueReglages(); } },
    h('option', { value: 'auto', selected: !S.niveau }, 'Mon niveau (automatique)'), NIV_ELO.map(e => h('option', { value: e, selected: S.niveau === e }, `${e} elo`)));
  const selNb = h('select', { class: 'champ sel', 'aria-label': 'Parties à analyser automatiquement', onchange: () => { S.nAuto = +selNb.value; store.set('ec_nauto', S.nAuto); autoAnalyse(); majStatut(); } },
    [30, 100, 300, 1000].map(n => h('option', { value: n, selected: S.nAuto === n }, `Mes ${n} dernières parties`)));
  v.append(h('div', { class: 'reglage' }, h('h3', {}, 'Analyse des parties'),
    h('p', {}, 'Niveau d’analyse : le moteur regarde aussi loin qu’un joueur de ce niveau. Par défaut, c’est ton classement du moment, parce qu’une analyse de niveau 2500 ne t’aiderait pas.'), selNiv,
    h('p', { style: 'margin-top:4px' }, 'Parties analysées automatiquement :'), selNb,
    h('p', { class: 'statut-auto' }),
    h('button', { class: 'btn discret', onclick: () => { S.auto = !S.auto; store.set('ec_auto', S.auto); if (S.auto) autoAnalyse(); vueReglages(); } }, S.auto ? 'Désactiver l’analyse automatique' : 'Activer l’analyse automatique'),
    h('p', { style: 'margin:12px 0 0' }, 'L’analyse tourne dans ton téléphone : elle peut le faire chauffer et consommer de la batterie. Elle n’avance que lorsque l’appli est ouverte.')));
  majStatut();
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
    try { const l = await rpc('echecs_analyses_liste', { p_code: S.code }); const m = {}; l.forEach(x => { m[x.u] = x.r; }); S.ana = m; store.set('ec_ana', m); } catch {}
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
    await charger(false); rendre(); autoAnalyse();
    const nb = PARTIES.length - avant; toast(nb > 0 ? `${nb} nouvelle${nb > 1 ? 's' : ''} partie${nb > 1 ? 's' : ''} récupérée${nb > 1 ? 's' : ''}` : 'Tout est à jour');
  } catch (e) { toast(e.message || 'La synchronisation a échoué'); }
  S.syncEnCours = false; if (S.tab === 'reglages') vueReglages();
}

/* ---------- analyse et rejeu ---------- */
const MOTEUR_URL = 'engine/stockfish-19-lite-single.js';
let moteur = null;
const getMoteur = () => (moteur = moteur || new Moteur(MOTEUR_URL));
let verrou = Promise.resolve();
const exclusif = fn => { const p = verrou.then(fn, fn); verrou = p.catch(() => {}); return p; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
S.ana = store.get('ec_ana', {});
S.niveau = store.get('ec_niv', null);
S.nAuto = store.get('ec_nauto', 30);
S.auto = store.get('ec_auto', true);
S.manuel = 0; S.autoErr = {}; S.autoEtat = null;

function positionsDe(pgn) {
  const ch = new Chess(); ch.loadPgn(pgn);
  const coups = ch.history({ verbose: true });
  const r = new Chess();
  const pos = [{ fen: r.fen(), fin: null }];
  for (const c of coups) {
    r.move(c.san);
    pos.push({ fen: r.fen(), fin: r.isCheckmate() ? 'mat' : (r.isStalemate() || r.isInsufficientMaterial()) ? 'nulle' : null });
  }
  return { coups, pos };
}
const uciDe = c => c.from + c.to + (c.promotion || '');
const sanDe = (fen, uci) => {
  try { const c = new Chess(fen); return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return uci; }
};

const niveauDe = g => S.niveau || eloProche(g.e);
function materielNonPion(fen) {
  let t = 0; const v = { q: 9, r: 5, b: 3, n: 3 };
  for (const ch of fen.split(' ')[0].toLowerCase()) if (v[ch]) t += v[ch];
  return t;
}
function contexteDe(pgn, pos, coups, nv) {
  const m = /\[TimeControl "([^"]+)"\]/.exec(pgn); const tc = m ? m[1] : '';
  let base = null, inc = 0;
  if (/^\d+(\+\d+)?$/.test(tc)) { const [b, i] = tc.split('+'); base = +b; inc = +(i || 0); }
  const clk = [...pgn.matchAll(/\[%clk (\d+):(\d+):(\d+(?:\.\d+)?)\]/g)].map(x => +x[1] * 3600 + +x[2] * 60 + +x[3]);
  const ok = base && clk.length === coups.length;
  const ph = [null], rem = [null], spent = [null];
  for (let i = 1; i <= coups.length; i++) {
    ph[i] = i <= 20 ? 'o' : materielNonPion(pos[i - 1].fen) <= 22 ? 'f' : 'm';
    rem[i] = ok ? clk[i - 1] : null;
    spent[i] = ok ? Math.max(0, (i > 2 ? clk[i - 3] : base) + inc - clk[i - 1]) : null;
  }
  const prm = paramsElo(nv);
  return { k: prm.k, elo: prm.elo, ph, rem, spent, base: ok ? base : null };
}

async function analyserPartie(g, pgn, progres, annule, nv = niveauDe(g)) {
  const { coups, pos } = positionsDe(pgn);
  const prm = paramsElo(nv);
  const ctx = contexteDe(pgn, pos, coups, nv);
  const ev = await exclusif(() => evaluerPositions(getMoteur(), pos, prm, progres, annule));
  if (!ev) return null;
  const calc = calculer(ev, g.co === 'blancs' ? 'w' : 'b', g.issue, ctx);
  const plies = ev.map(x => ({ e: x.e, b: x.b }));
  try { await rpc('echecs_analyse_ecrire', { p_code: S.code, p_url: g.u, p_moteur: 'stockfish-19-lite-single', p_temps_ms: prm.d, p_plies: plies, p_resume: calc.resume }); } catch {}
  S.ana[g.u] = calc.resume; store.set('ec_ana', S.ana); majBadge(g.u);
  return { plies, calc, nv: prm.elo };
}

/* analyse automatique des dernières parties */
const recentes = () => PARTIES.filter(g => g.r === 'chess').slice(-S.nAuto);
function prochaineAuto() { return recentes().slice().reverse().find(g => !S.ana[g.u] && !S.autoErr[g.u]); }
function majStatut() {
  const total = recentes().length, faites = recentes().filter(g => S.ana[g.u]).length;
  let t;
  if (!S.auto) t = `Analyse automatique désactivée. ${faites} sur ${total} parties récentes analysées.`;
  else if (S.autoEtat && S.autoEtat.n) t = `Analyse en cours : position ${S.autoEtat.i} sur ${S.autoEtat.n}. ${faites} sur ${total} parties récentes analysées.`;
  else if (faites >= total) t = `Tes ${total} dernières parties sont analysées.`;
  else t = `${faites} sur ${total} parties récentes analysées. L’analyse reprend quand l’appli est ouverte.`;
  $$('.statut-auto').forEach(e => { e.textContent = t; });
}
async function autoAnalyse() {
  if (S.autoRun || !S.code) return;
  S.autoRun = true;
  try {
    while (S.auto && S.code) {
      if (document.hidden) { await new Promise(r => document.addEventListener('visibilitychange', r, { once: true })); continue; }
      if (S.manuel > 0) { await sleep(2000); continue; }
      const g = prochaineAuto(); if (!g) break;
      S.autoEtat = { u: g.u, i: 0, n: 0 }; majStatut();
      try {
        const pgn = await rpc('echecs_partie', { p_code: S.code, p_url: g.u });
        await analyserPartie(g, pgn, (i, n) => { S.autoEtat.i = i; S.autoEtat.n = n; if (i % 4 === 0) majStatut(); }, () => !S.auto || S.manuel > 0 || !S.code);
        if (!S.ana[g.u] && S.auto && S.manuel === 0) S.autoErr[g.u] = 1;
      } catch (e) { S.autoErr[g.u] = 1; if (/démarrer/.test(e.message)) break; }
    }
  } finally { S.autoRun = false; S.autoEtat = null; majStatut(); }
}

const GLYPHE = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const SYMB = { i: '?!', e: '?', g: '??' };
const NOM_CLS = { i: 'imprécision', e: 'erreur', g: 'gaffe' };
const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

async function ouvrirPartie(g) {
  const f = $('#feuille'); f.classList.add('on'); document.body.style.overflow = 'hidden';
  const in_ = h('div', { class: 'in' }, h('div', { class: 'charge' }, 'Chargement de la partie'));
  f.innerHTML = ''; f.append(in_); f.scrollTop = 0;
  const echec = msg => { in_.innerHTML = ''; in_.append(h('div', { class: 'vide-liste' }, msg), h('button', { class: 'plus', onclick: fermer }, 'Fermer')); };
  let pgn;
  try { pgn = await rpc('echecs_partie', { p_code: S.code, p_url: g.u }); } catch { return echec('Cette partie n’a pas pu être chargée. Vérifie ta connexion.'); }
  let donnees;
  try { donnees = positionsDe(pgn); } catch { return echec('Les coups de cette partie sont illisibles.'); }
  const { coups, pos } = donnees;
  const moi = g.co === 'blancs' ? 'w' : 'b';
  const pliesBoards = pos.map(p => new Chess(p.fen).board());
  let i = coups.length, bas = moi, lecture = null, fleches = false;
  let ana = null; // { plies, calc }
  let etat = 'inconnu'; // inconnu | aucune | calcul | prete
  let annuleManuel = false, wake = null, nvSel = niveauDe(g);

  const plateau = h('div', { class: 'plateau', role: 'img', 'aria-label': 'Échiquier' });
  const svgFl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgFl.setAttribute('viewBox', '0 0 8 8'); svgFl.setAttribute('class', 'fleches');
  const enveloppe = h('div', { class: 'plateau-env' }, plateau, svgFl);
  const liste = h('div', { class: 'coups' });
  const panneau = h('div', { class: 'analyse' });
  const infoPly = h('div', { class: 'info-ply' });
  const ic = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const btn = (nom, svg, fn, cls = '') => h('button', { 'aria-label': nom, title: nom, class: cls, onclick: fn, html: svg });
  const bTour = btn('Retourner l’échiquier', ic('<path d="M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3"/>'), () => { bas = bas === 'w' ? 'b' : 'w'; dessiner(); });
  const bDebut = btn('Début', ic('<path d="M6 5v14M18 6l-8 6 8 6z"/>'), () => aller_(0));
  const bPrec = btn('Coup précédent', ic('<path d="M15 6l-6 6 6 6"/>'), () => aller_(i - 1));
  const bLire = btn('Lecture', ic('<path d="M8 5l11 7-11 7z"/>'), () => bascule(), 'lecture');
  const bSuiv = btn('Coup suivant', ic('<path d="M9 6l6 6-6 6"/>'), () => aller_(i + 1));
  const bFin = btn('Fin', ic('<path d="M18 5v14M6 6l8 6-8 6z"/>'), () => aller_(coups.length));
  const bFl = btn('Montrer le meilleur coup', ic('<path d="M5 19L19 5M19 5h-9M19 5v9"/>'), () => { fleches = !fleches; dessiner(); }, 'fl');
  function bascule() {
    if (lecture) { clearInterval(lecture); lecture = null; bLire.innerHTML = ic('<path d="M8 5l11 7-11 7z"/>'); return; }
    if (i >= coups.length) i = 0;
    bLire.innerHTML = ic('<path d="M8 5v14M16 5v14"/>');
    lecture = setInterval(() => { if (i >= coups.length) { bascule(); return; } aller_(i + 1); }, 900);
  }
  function aller_(n) { i = Math.max(0, Math.min(coups.length, n)); dessiner(); }

  const centre = nom => { // coordonnées d'une case (a1..h8) dans l'orientation courante
    const c = 'abcdefgh'.indexOf(nom[0]), r = 8 - +nom[1];
    return [(bas === 'w' ? c : 7 - c) + 0.5, (bas === 'w' ? r : 7 - r) + 0.5];
  };
  function fleche(uci, couleur) {
    const [x1, y1] = centre(uci.slice(0, 2)), [x2, y2] = centre(uci.slice(2, 4));
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const t = 0.34, bx = x2 - ux * t * 1.1, by = y2 - uy * t * 1.1;
    const px = -uy * t * 0.62, py = ux * t * 0.62;
    return `<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${couleur}" stroke-width=".16" stroke-linecap="round" opacity=".92"/>` +
      `<polygon points="${x2 - ux * 0.04},${y2 - uy * 0.04} ${bx + px},${by + py} ${bx - px},${by - py}" fill="${couleur}" opacity=".92"/>`;
  }

  function dessiner() {
    plateau.innerHTML = ''; const B = pliesBoards[i]; const dern = i > 0 ? coups[i - 1] : null;
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
    // flèches : meilleur coup (bleu) et coup réellement joué si c'était une faute (rose)
    let fl = '';
    if (fleches && ana && i < coups.length && ana.plies[i].b) {
      const meil = ana.plies[i].b; const joue = uciDe(coups[i]); const cc = ana.calc.coups[i];
      if (cc && cc.cls && joue !== meil) fl += fleche(joue, '#E58EC0');
      fl += fleche(meil, '#3F78E0');
    }
    svgFl.innerHTML = fl;
    bFl.disabled = !ana; bFl.classList.toggle('actif', fleches && !!ana);
    bDebut.disabled = bPrec.disabled = i === 0; bSuiv.disabled = bFin.disabled = i === coups.length;
    $$('button', liste).forEach(b => b.removeAttribute('aria-current'));
    const cur = i ? $(`button[data-i="${i}"]`, liste) : null;
    if (cur) {
      cur.setAttribute('aria-current', 'true');
      const lr = liste.getBoundingClientRect(), br = cur.getBoundingClientRect();
      if (br.top < lr.top) liste.scrollTop -= lr.top - br.top; else if (br.bottom > lr.bottom) liste.scrollTop += br.bottom - lr.bottom;
    }
    majJoueurs(); majInfo(); majCurseur();
  }
  const moiEl = h('div', {}, h('b', {}, PSEUDO), ' ', h('span', {}, g.e ?? '')), luiEl = h('div', {}, h('b', {}, g.adv), ' ', h('span', {}, g.ea ?? ''));
  const jHaut = h('div', { class: 'joueur' }), jBas = h('div', { class: 'joueur' });
  function majJoueurs() { jHaut.innerHTML = jBas.innerHTML = ''; const moiBas = bas === moi; (moiBas ? jBas : jHaut).append(moiEl); (moiBas ? jHaut : jBas).append(luiEl); }

  /* liste des coups, avec les fautes repérées */
  function listeCoups() {
    liste.innerHTML = ''; let tour = null;
    coups.forEach((c, k) => {
      const cc = ana ? ana.calc.coups[k] : null;
      const cls = cc && cc.cls ? ' c-' + cc.cls : '';
      const decisif = ana && ana.calc.pt && ana.calc.pt.i === k + 1 ? ' decisif-coup' : '';
      const b = h('button', { 'data-i': k + 1, class: (cls + decisif).trim(), title: cc && cc.cls ? NOM_CLS[cc.cls] : null, onclick: () => aller_(k + 1) }, c.san + (cc && cc.cls ? SYMB[cc.cls] : ''));
      if (c.color === 'w') { tour = h('span', { class: 'tour' }, h('span', { class: 'num' }, (k / 2 + 1) + '.'), b); liste.append(tour); }
      else if (tour && k > 0) { tour.append(b); tour = null; }
      else liste.append(h('span', { class: 'tour' }, h('span', { class: 'num' }, '…'), b));
    });
  }

  /* ligne d'information sur la position affichée */
  function majInfo() {
    infoPly.innerHTML = '';
    if (!ana) return;
    const W = ana.calc.W[i]; const mien = moi === 'w' ? W : 100 - W; const e = ana.plies[i].e;
    const eMoi = moi === 'w' ? e : -e;
    infoPly.append(h('span', { class: 'chance' }, `Tes chances de gagner : ${Math.round(mien)} %`), h('span', { class: 'ev' }, Math.abs(eMoi) >= 9000 ? (eMoi > 0 ? `mat en ${10000 - eMoi}` : `mat adverse en ${10000 + eMoi}`) : `évaluation ${formatEval(eMoi)}`));
    if (fleches && i < coups.length && ana.plies[i].b) infoPly.append(h('div', { class: 'legende-fl' }, h('span', { class: 'bleu' }, 'Meilleur coup'), ana.calc.coups[i] && ana.calc.coups[i].cls && uciDe(coups[i]) !== ana.plies[i].b ? h('span', { class: 'rose' }, 'Coup joué') : null));
    if (i > 0) {
      const cc = ana.calc.coups[i - 1];
      if (cc && cc.cls) {
        const meil = ana.plies[i - 1].b;
        infoPly.append(h('div', { class: 'faute c-' + cc.cls }, `${(cc.mover === moi ? 'Ton coup' : 'Coup de l’adversaire')} ${coups[i - 1].san} : ${NOM_CLS[cc.cls]}.` + (meil ? ` Meilleur coup : ${sanDe(pos[i - 1].fen, meil)}.` : '')));
      }
    }
  }

  /* courbe d'évaluation */
  let courbeEl = null, curseurEl = null;
  function majCurseur() {
    if (!courbeEl || !curseurEl) return;
    const n = coups.length; const W = courbeEl.clientWidth || 340;
    const x = n ? (i / n) * W : 0; curseurEl.setAttribute('x1', x); curseurEl.setAttribute('x2', x);
  }
  function dessinerCourbe(host) {
    const n = coups.length, W = host.clientWidth || 340, H = 118, mid = H / 2;
    const mien = p => (moi === 'w' ? p : 100 - p);
    const X = k => (k / n) * W, Y = k => H - (mien(ana.calc.W[k]) / 100) * H;
    let d = ''; for (let k = 0; k <= n; k++) d += (k ? 'L' : 'M') + X(k).toFixed(1) + ',' + Y(k).toFixed(1);
    const zone = `M0,${mid}` + d.replace(/^M/, 'L') + `L${W},${mid}Z`;
    const pt = ana.calc.pt;
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <defs><clipPath id="hau"><rect x="0" y="0" width="${W}" height="${mid}"/></clipPath><clipPath id="bas"><rect x="0" y="${mid}" width="${W}" height="${mid}"/></clipPath></defs>
      <path d="${zone}" fill="#5B8DEF" fill-opacity=".30" clip-path="url(#hau)"/>
      <path d="${zone}" fill="#E58EC0" fill-opacity=".38" clip-path="url(#bas)"/>
      <line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="#B3B8D2" stroke-dasharray="3 4"/>
      <path d="${d}" fill="none" stroke="#6A58C8" stroke-width="2" stroke-linejoin="round"/>
      ${pt ? `<circle cx="${X(pt.i).toFixed(1)}" cy="${Y(pt.i).toFixed(1)}" r="6.5" fill="#fff" stroke="#6A58C8" stroke-width="2.5"/>` : ''}
      <line class="cur" x1="0" x2="0" y1="0" y2="${H}" stroke="#1D2140" stroke-width="1.5"/>
      <text x="6" y="12" font-size="11" fill="#646A8F">Tu es mieux</text><text x="6" y="${H - 5}" font-size="11" fill="#646A8F">L’adversaire est mieux</text></svg>`;
    courbeEl = host; curseurEl = $('.cur', host); majCurseur();
    const aller2 = ev => { const r = host.getBoundingClientRect(); aller_(Math.round(((ev.clientX - r.left) / r.width) * n)); };
    host.onpointerdown = ev => { host.setPointerCapture(ev.pointerId); aller2(ev); };
    host.onpointermove = ev => { if (ev.buttons) aller2(ev); };
  }

  /* panneau d'analyse */
  function texteDecisif() {
    const pt = ana.calc.pt;
    if (!pt) return { titre: 'Pas de tournant net', corps: 'La partie est restée serrée du début à la fin : aucun coup n’a fait basculer l’évaluation de façon marquée.' };
    const c = coups[pt.i - 1]; const num = Math.ceil(pt.i / 2) + (pt.i % 2 ? '.' : '…');
    const meil = ana.plies[pt.i - 1].b; const sm = meil ? sanDe(pos[pt.i - 1].fen, meil) : null;
    const av = Math.round(pt.avant), ap = Math.round(pt.apres);
    const mine = pt.mover === moi;
    let corps;
    if (pt.delta < 0 && mine) corps = `Au coup ${num} ${c.san}, tes chances de gagner passent de ${av} % à ${ap} %.` + (sm && sm !== c.san ? ` Le meilleur coup était ${sm}.` : '');
    else if (pt.delta < 0) corps = `Au coup ${num} ${c.san}, l’adversaire reprend la main : tes chances passent de ${av} % à ${ap} %.`;
    else if (mine) corps = `Ton coup ${num} ${c.san} renverse la partie : tes chances passent de ${av} % à ${ap} %.`;
    else corps = `Au coup ${num} ${c.san}, l’adversaire lâche prise : tes chances passent de ${av} % à ${ap} %.` + (sm && sm !== c.san ? ` Il fallait jouer ${sm}.` : '');
    const titre = g.issue === 'p' ? (mine && pt.delta < 0 ? 'Là où tu as laissé filer la partie' : 'Là où la partie t’a échappé') : g.issue === 'g' ? 'Là où la partie a basculé en ta faveur' : 'Le tournant de la partie';
    return { titre, corps };
  }
  function ligneStats(nom, acc, cn) {
    return h('div', { class: 'st' }, h('div', { class: 'st-nom' }, nom), h('div', { class: 'st-pr' }, acc == null ? '—' : Math.round(acc) + ' %'),
      h('div', { class: 'st-n' }, pl(cn.g, 'gaffe') + ', ' + pl(cn.e, 'erreur') + ', ' + pl(cn.i, 'imprécision')));
  }
  function rendrePanneau() {
    panneau.innerHTML = '';
    if (etat === 'inconnu') { panneau.append(h('div', { class: 'ana-msg' }, 'Recherche d’une analyse existante…')); return; }
    if (etat === 'aucune') {
      const sel = h('select', { class: 'champ sel', 'aria-label': 'Niveau d’analyse', onchange: () => { nvSel = +sel.value; rendrePanneau(); } },
        NIV_ELO.map(e => h('option', { value: e, selected: e === nvSel }, `${e} elo` + (e === eloProche(g.e) ? ' (ton niveau)' : ''))));
      panneau.append(h('h3', {}, 'Analyse de la partie'),
        h('p', { class: 'ana-msg' }, 'Stockfish repère les gaffes et le moment où la partie bascule. Il regarde aussi loin qu’un joueur du niveau choisi : les fautes que seul un joueur bien plus fort aurait vues ne sont pas comptées.'),
        h('label', { class: 'lib' }, 'Niveau d’analyse'), sel,
        h('button', { class: 'btn', onclick: lancer }, 'Analyser cette partie'));
      return;
    }
    if (etat === 'calcul') { panneau.append(h('h3', {}, 'Analyse en cours'), h('div', { class: 'prog' }, h('i', { id: 'prog-i' })), h('p', { class: 'ana-msg', id: 'prog-t' }, 'Démarrage du moteur…'), h('button', { class: 'btn discret', onclick: () => { annuleManuel = true; moteur && moteur.stop(); } }, 'Annuler')); return; }
    const r = ana.calc.resume; const t = texteDecisif();
    const cm = moi === 'w' ? r.cw : r.cb, ca = moi === 'w' ? r.cb : r.cw, am = moi === 'w' ? r.aw : r.ab, aa = moi === 'w' ? r.ab : r.aw;
    const cv = h('div', { class: 'courbe-ana', 'aria-label': 'Courbe d’évaluation de la partie' });
    const dec = h('div', { class: 'decisif' }, h('h3', {}, t.titre), h('p', {}, t.corps),
      ana.calc.pt && h('button', { class: 'btn', onclick: () => { fleches = true; aller_(ana.calc.pt.i - 1); f.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Voir ce moment'));
    panneau.append(dec, h('h3', { style: 'margin-top:22px' }, 'Évolution de la partie'), cv, h('p', { class: 'ana-msg', style: 'margin:10px 0 0' }, `Analyse au niveau ${ana.nv} elo.`), ligneStats('Toi', am, cm), ligneStats(g.adv, aa, ca),
      h('button', { class: 'btn discret', style: 'margin-top:14px', onclick: () => { etat = 'aucune'; rendrePanneau(); } }, 'Refaire l’analyse'));
    requestAnimationFrame(() => dessinerCourbe(cv));
  }

  async function lancer() {
    etat = 'calcul'; annuleManuel = false; S.manuel++; moteur && moteur.stop(); rendrePanneau();
    try { wake = await navigator.wakeLock?.request('screen'); } catch {}
    const t0 = Date.now();
    try {
      const r = await analyserPartie(g, pgn, (k, n) => {
        const bar = $('#prog-i'), tx = $('#prog-t'); if (!bar) return;
        bar.style.width = (100 * k) / n + '%';
        const reste = Math.max(0, Math.round(((Date.now() - t0) / k) * (n - k) / 1000));
        tx.textContent = `Position ${k} sur ${n}` + (k > 3 ? `, il reste environ ${reste >= 60 ? Math.round(reste / 60) + ' min' : reste + ' s'}` : '');
      }, () => annuleManuel, nvSel);
      if (r) { ana = r; etat = 'prete'; listeCoups(); } else etat = 'aucune';
    } catch (e) {
      etat = 'aucune'; rendrePanneau();
      panneau.append(h('p', { class: 'ana-msg err' }, /démarrer/.test(e.message) ? 'Le moteur n’a pas pu démarrer sur cet appareil.' : 'L’analyse a échoué. Réessaie.'));
      S.manuel--; try { wake && wake.release(); } catch {}
      return;
    }
    S.manuel--; try { wake && wake.release(); } catch {}
    rendrePanneau(); dessiner(); autoAnalyse();
  }

  const titre = g.issue === 'g' ? `Victoire par ${FIN_GAGNE[g.ra] || '—'}` : g.issue === 'p' ? `Défaite par ${FIN_PERDU[g.res] || g.res}` : 'Partie nulle';
  const o = famille(g.o);
  in_.innerHTML = '';
  in_.append(
    h('div', { class: 'haut' }, h('button', { class: 'fermer', onclick: fermer }, 'Fermer'), h('a', { class: 'lien', href: g.u, target: '_blank', rel: 'noopener' }, 'Ouvrir sur chess.com')),
    h('div', { class: 'issue ' + g.issue }, titre),
    h('div', { class: 'meta' }, [fCourt.format(g.date), cadence(g.tc), o.fam !== 'Ouverture inconnue' ? o.fam + (o.var ? ' / ' + o.var : '') : ''].filter(Boolean).join(' / ')),
    jHaut, enveloppe, jBas,
    h('div', { class: 'cmd' }, bTour, bDebut, bPrec, bLire, bSuiv, bFin, bFl), infoPly, panneau, liste);
  listeCoups(); dessiner(); rendrePanneau();
  f._clavier = ev => { if (ev.key === 'ArrowLeft') aller_(i - 1); else if (ev.key === 'ArrowRight') aller_(i + 1); else if (ev.key === 'Escape') fermer(); };
  document.addEventListener('keydown', f._clavier);
  f._stop = () => { if (lecture) clearInterval(lecture); if (etat === 'calcul') { annuleManuel = true; moteur && moteur.stop(); } try { wake && wake.release(); } catch {} };

  // analyse déjà enregistrée ?
  try {
    const r = await rpc('echecs_analyse_lire', { p_code: S.code, p_url: g.u });
    if (r && r.plies && r.plies.length === pos.length) { const nv0 = (r.resume && r.resume.nv) || eloProche(g.e); const c0 = calculer(r.plies, moi, g.issue, { k: paramsElo(nv0).k }); if (r.resume) c0.resume = r.resume; ana = { plies: r.plies, calc: c0, nv: nv0 }; nvSel = nv0; etat = 'prete'; S.ana[g.u] = ana.calc.resume; store.set('ec_ana', S.ana); majBadge(g.u); listeCoups(); }
    else etat = 'aucune';
  } catch { etat = 'aucune'; }
  if (etat !== 'calcul') { rendrePanneau(); dessiner(); }
}
function fermer() {
  const f = $('#feuille'); f._stop?.(); if (f._clavier) document.removeEventListener('keydown', f._clavier);
  f.classList.remove('on'); f.innerHTML = ''; document.body.style.overflow = '';
  if (S.tab === 'parties' || S.tab === 'accueil') rendre();
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
  if (await charger(true)) { rendre(); autoAnalyse(); }
}
init();
