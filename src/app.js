import { Chess } from 'chess.js';
import { SPRITE } from './pieces.js';
import { expliquerCoup, sanDe as sanDeX } from './expliquer.js';
import { Moteur, NIV_ELO, paramsElo, eloProche, evaluerPositions, calculer, formatEval, winPct } from './analyse.js';

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
    <linearGradient id="${idg}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F66D0" stop-opacity=".16"/><stop offset="1" stop-color="#2F66D0" stop-opacity="0"/></linearGradient>
    <linearGradient id="${idg}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4F8CF0"/><stop offset="1" stop-color="#2F66D0"/></linearGradient>
  </defs>${grille}${labels}
  <path d="${area}" fill="url(#${idg}a)"/>
  <path class="ligne" d="${d}" fill="none" stroke="url(#${idg}l)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>
  <g class="cur" style="display:none"><line y1="${m.t - 6}" y2="${H - m.b}" stroke="#2F66D0" stroke-opacity=".45" stroke-dasharray="3 4"/><circle r="6" fill="#FFFFFF" stroke="#2F66D0" stroke-width="2.5"/></g>
  <circle class="fin" cx="${P.at(-1)[0]}" cy="${P.at(-1)[1]}" r="5" fill="#2F66D0"/>`;
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
  v.append(blocProgression(per), blocTypes(per), blocGaches(per), blocAbandons(per));
  const det = h('details', { class: 'plie' }, h('summary', {}, 'Où et quand tu fais des fautes'), blocErreurs(per));
  v.append(h('section', { class: 'bloc' }, det));
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


/* ---------- statistiques utiles : progression, types de fautes, avantages gâchés, abandons ---------- */
const analysees = per => per.filter(g => S.ana[g.u] && S.ana[g.u].st);
function lundi(d) { const j = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - j).getTime(); }
const sectionNue = (titre, sous) => h('section', { class: 'bloc' }, h('h2', {}, titre, sous && h('small', {}, sous)));

function blocProgression(per) {
  const A = analysees(per);
  const sec = sectionNue('Ta progression', A.length ? `${A.length} parties analysées` : '');
  const sem = new Map();
  for (const g of A) {
    const r = S.ana[g.u]; const cn = g.co === 'blancs' ? r.cw : r.cb;
    const n = r.st.ph.o[0] + r.st.ph.m[0] + r.st.ph.f[0];
    const k = lundi(g.date); const w = sem.get(k) || { k, parties: 0, coups: 0, graves: 0 };
    w.parties++; w.coups += n; w.graves += cn.g + cn.e; sem.set(k, w);
  }
  const semaines = [...sem.values()].filter(w => w.parties >= 2 && w.coups >= 40).sort((a, b) => a.k - b.k).slice(-12);
  if (semaines.length < 2) {
    sec.append(h('p', { class: 'ana-msg' }, 'La courbe apparaît quand tu as des parties analysées sur au moins deux semaines. Ce qu’on suit ici : tes gaffes et erreurs pour 100 coups. Elle baisse quand tu progresses, souvent avant ton classement.'));
    return sec;
  }
  const taux_ = w => (100 * w.graves) / w.coups;
  const W = 340, H = 130, bas = 22, haut = 14, bw = Math.min(26, (W / semaines.length) * 0.62);
  const maxi = Math.max(...semaines.map(taux_), 1) * 1.15;
  const X = i => ((i + 0.5) / semaines.length) * W;
  const barres = semaines.map((w, i) => {
    const hh = (taux_(w) / maxi) * (H - bas - haut), x = X(i) - bw / 2, y = H - bas - hh;
    const lab = new Date(w.k).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}" rx="5" fill="${i === semaines.length - 1 ? '#2F66D0' : '#9DB8EE'}"/>` +
      `<text x="${X(i).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="#1B2433">${taux_(w).toFixed(1).replace('.', ',')}</text>` +
      `<text x="${X(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#5F6B80">${lab}</text>`;
  }).join('');
  sec.append(h('div', { class: 'prog-graph', html: `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gaffes et erreurs pour 100 coups, par semaine">${barres}</svg>` }));
  sec.append(h('p', { class: 'ana-msg', style: 'margin-top:6px' }, 'Gaffes et erreurs pour 100 coups, par semaine (lundi de la semaine en bas). Plus c’est bas, mieux c’est.'));
  const n = semaines.length, k = Math.min(3, Math.floor(n / 2));
  const moy = a => a.reduce((x, y) => x + taux_(y), 0) / a.length;
  const recent = moy(semaines.slice(-k)), avant = moy(semaines.slice(-2 * k, -k));
  const diff = ((recent - avant) / Math.max(avant, 0.1)) * 100;
  const phrase = Math.abs(diff) < 8 ? `Stable sur les dernières semaines : environ ${fmtTaux(recent)} fautes graves pour 100 coups.`
    : diff < 0 ? `Bonne tendance : ${Math.round(-diff)} % de fautes graves en moins par rapport aux semaines d’avant (${fmtTaux(avant)} puis ${fmtTaux(recent)} pour 100 coups).`
      : `Les fautes graves augmentent : ${Math.round(diff)} % de plus que les semaines d’avant (${fmtTaux(avant)} puis ${fmtTaux(recent)} pour 100 coups).`;
  sec.append(h('div', { class: 'conseils' }, h('p', {}, phrase)));
  return sec;
}

function blocTypes(per) {
  const A = analysees(per).filter(g => S.ana[g.u].ty);
  const sec = sectionNue('Quel type de fautes', A.length ? `${A.length} parties analysées` : '');
  if (!A.length) { sec.append(h('p', { class: 'ana-msg' }, analysees(per).length ? 'Tes analyses précédentes sont en cours de mise à jour. Garde l’appli ouverte quelques minutes, puis reviens ici.' : 'Les types de fautes apparaissent dès que des parties sont analysées.')); return sec; }
  const T = { mat: 0, capt: 0, prise: 0, menace: 0, autre: 0 };
  for (const g of A) for (const k of Object.keys(T)) T[k] += S.ana[g.u].ty[k] || 0;
  const tot = Object.values(T).reduce((x, y) => x + y, 0);
  if (!tot) { sec.append(h('p', { class: 'ana-msg' }, 'Aucune faute grave repérée sur cette période. Bravo.')); return sec; }
  const ordre = Object.keys(T).sort((a, b) => T[b] - T[a]);
  const L = h('div', { class: 'lignes' });
  ordre.forEach(k => { if (T[k]) L.append(ligneKV(TYPES[k].nom, `${T[k]} fois`, Math.round((100 * T[k]) / tot) + ' %', (100 * T[k]) / tot)); });
  sec.append(L);
  const premier = ordre[0];
  sec.append(h('div', { class: 'conseils', style: 'margin-top:12px' }, h('p', {}, h('b', {}, `Ta faute n°1 : ${TYPES[premier].nom.toLowerCase()} (${Math.round((100 * T[premier]) / tot)} %). `), TYPES[premier].conseil)));
  return sec;
}

function blocGaches(per) {
  const A = analysees(per).filter(g => S.ana[g.u].mx != null);
  const sec = sectionNue('Avantages gâchés');
  const gagnantes = A.filter(g => S.ana[g.u].mx >= 80);
  if (A.length < 5) { sec.append(h('p', { class: 'ana-msg' }, analysees(per).length >= 5 ? 'Tes analyses précédentes sont en cours de mise à jour. Garde l’appli ouverte quelques minutes, puis reviens ici.' : 'Cette section apparaît quand au moins 5 parties sont analysées.')); return sec; }
  const gagnees = gagnantes.filter(g => g.issue === 'g').length, gachees = gagnantes.filter(g => g.issue !== 'g');
  sec.append(h('p', { class: 'ana-msg' }, gagnantes.length ? `Dans ${gagnantes.length} parties, tu as eu au moins 80 % de chances de gagner. Tu en as gagné ${gagnees} (${pct(gagnees, gagnantes.length)} %).` : 'Aucune partie avec une position clairement gagnante sur cette période.'));
  if (gachees.length) {
    sec.append(h('div', { class: 'liste-a' }, gachees.sort((a, b) => S.ana[b.u].mx - S.ana[a.u].mx).slice(0, 5).map(g => {
      const r = S.ana[g.u];
      return h('button', { class: 'ligne-a', onclick: () => ouvrirPartie(g) },
        h('span', { class: 'corps' }, h('div', { class: 'adv' }, g.adv, h('span', {}, fCourt.format(g.date))), h('div', { class: 'det' }, `Au coup ${Math.ceil(r.mxp / 2)}, ${r.mx} % de chances de gagner. Résultat : ${g.issue === 'p' ? 'défaite' : 'nulle'}.`)),
        h('span', { class: 'droite' }, h('span', { class: 'delta neg' }, `${r.mx} % → ${r.fin} %`)));
    })));
    sec.append(h('p', { class: 'ana-msg', style: 'margin-top:8px' }, 'Touche une partie pour revoir où ça s’est joué. Quand tu es gagnant : échange les pièces, protège ton roi et évite les coups risqués.'));
  }
  return sec;
}

function blocAbandons(per) {
  const A = analysees(per).filter(g => S.ana[g.u].rs != null);
  const sec = sectionNue('Abandons');
  if (A.length < 5) { sec.append(h('p', { class: 'ana-msg' }, analysees(per).length >= 5 ? 'Tes analyses précédentes sont en cours de mise à jour. Garde l’appli ouverte quelques minutes, puis reviens ici.' : 'Cette section apparaît quand au moins 5 parties sont analysées.')); return sec; }
  const ab = A.filter(g => S.ana[g.u].rs === 1 && g.issue === 'p');
  const tot = ab.length;
  const tot_ = A.length;
  const tot2 = ab.filter(g => S.ana[g.u].fin >= 30);
  sec.append(h('p', { class: 'ana-msg' }, tot ? `Tu as abandonné ${tot} parties sur ${tot_} analysées. Dans ${tot2.length} d’entre elles, le moteur te donnait encore au moins 30 % de chances de gagner : tu aurais pu continuer.` : 'Tu n’as abandonné aucune partie analysée sur cette période.'));
  if (tot2.length) {
    sec.append(h('div', { class: 'liste-a' }, tot2.sort((a, b) => S.ana[b.u].fin - S.ana[a.u].fin).slice(0, 4).map(g => {
      const r = S.ana[g.u];
      return h('button', { class: 'ligne-a', onclick: () => ouvrirPartie(g) },
        h('span', { class: 'corps' }, h('div', { class: 'adv' }, g.adv, h('span', {}, fCourt.format(g.date))), h('div', { class: 'det' }, `Abandon alors qu’il te restait environ ${r.fin} % de chances de gagner.`))
      );
    })));
    sec.append(h('p', { class: 'ana-msg', style: 'margin-top:8px' }, 'Estimation du moteur à ton niveau d’analyse. Contre un adversaire de ton niveau, une position difficile se retourne souvent : continue tant que ce n’est pas perdu.'));
  }
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
    h('p', {}, 'Les données sont gardées en mémoire pour que l’appli s’ouvre même sans réseau. Pièces d’échecs : Colin M.L. Burnett (Wikimedia Commons), licence CC BY-SA 3.0.'),
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
    await charger(false); rendre(); migrerRapide(); autoAnalyse();
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


/* ---------- types de fautes, avantages gâchés, exercices ---------- */
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const TYPES = {
  mat: { nom: 'Mat manqué', conseil: 'Quand l’adversaire est coincé, cherche tous les échecs avant de jouer un coup calme.' },
  capt: { nom: 'Capture manquée', conseil: 'Avant de jouer, regarde si une pièce adverse est à prendre ou mal défendue.' },
  prise: { nom: 'Pièce ou pion laissé en prise', conseil: 'Avant de valider ton coup, demande-toi : qu’est-ce que l’adversaire peut prendre après ?' },
  menace: { nom: 'Menace de l’adversaire non vue', conseil: 'Après chaque coup adverse, cherche ses échecs, ses captures et ses menaces avant de répondre.' },
  autre: { nom: 'Coup qui dégrade la position', conseil: 'Développe tes pièces, protège ton roi et vérifie que chaque coup a un but.' }
};
const essaiCoup = (fen, uci) => {
  try { const c = new Chess(fen); const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); return { c, m }; } catch { return null; }
};
function typeFaute(i, plies, pos, coups, moi) {
  const mien = e => (moi === 'w' ? e : -e);
  if (mien(plies[i - 1].e) >= 9000 && mien(plies[i].e) < 9000) return 'mat';
  const bestU = plies[i - 1].b, joue = coups[i - 1];
  if (bestU && bestU !== uciDe(joue)) {
    const r = essaiCoup(pos[i - 1].fen, bestU);
    if (r && r.m.captured && VAL[r.m.captured] >= 3 && (!joue.captured || VAL[joue.captured] < VAL[r.m.captured])) return 'capt';
  }
  const oppU = plies[i].b;
  if (oppU) {
    const r = essaiCoup(pos[i].fen, oppU);
    if (r && r.m.captured) {
      const defs = new Chess(pos[i].fen).attackers(r.m.to, moi).length;
      if (defs === 0 || VAL[r.m.captured] - VAL[r.m.piece] >= 2) return 'prise';
    }
    if (r && /[+#]/.test(r.m.san)) return 'menace';
  }
  return 'autre';
}
function enrichir(g, calc, plies, pos, coups, moi) {
  const ty = { mat: 0, capt: 0, prise: 0, menace: 0, autre: 0 };
  for (const c of calc.coups) if (c.mover === moi && (c.cls === 'g' || c.cls === 'e')) ty[typeFaute(c.i, plies, pos, coups, moi)]++;
  const n = plies.length - 1, M = k => (moi === 'w' ? calc.W[k] : 100 - calc.W[k]);
  let mx = -1, mxp = 0;
  for (let k = Math.min(10, n); k <= n; k++) if (M(k) > mx) { mx = M(k); mxp = k; }
  Object.assign(calc.resume, { ty, mx: Math.round(mx), mxp, fin: Math.round(M(n)), rs: g.res === 'resigned' ? 1 : 0 });
}
async function exercicesDe(g, calc, plies, pos, coups, moi, annule) {
  const mien = e => (moi === 'w' ? e : -e);
  const cands = calc.coups.filter(c => c.mover === moi && (c.cls === 'g' || c.cls === 'e') && plies[c.i - 1].b && plies[c.i - 1].b !== uciDe(coups[c.i - 1]) && c.avant >= 20)
    .sort((a, b) => b.perte - a.perte).slice(0, 4);
  const exos = [];
  await exclusif(async () => {
    for (const c of cands) {
      if (annule()) return;
      const rb = await getMoteur().evaluer(pos[c.i - 1].fen, { d: 12, cap: 1500 });
      if (!rb.b || rb.b === uciDe(coups[c.i - 1])) continue;
      const ra = pos[c.i].fin ? { e: plies[c.i].e } : await getMoteur().evaluer(pos[c.i].fen, { d: 12, cap: 1500 });
      const perte = winPct(mien(rb.e)) - winPct(mien(ra.e));
      if (perte < 10 || winPct(mien(rb.e)) < 15) continue;
      exos.push({ ply: c.i, fen: pos[c.i - 1].fen, best: rb.b, joue: uciDe(coups[c.i - 1]), cls: c.cls, perte: Math.round(perte * 10) / 10, type: typeFaute(c.i, plies, pos, coups, moi), coul: moi, e_av: rb.e });
    }
  });
  return exos;
}

async function analyserPartie(g, pgn, progres, annule, nv = niveauDe(g)) {
  const { coups, pos } = positionsDe(pgn);
  const prm = paramsElo(nv);
  const ctx = contexteDe(pgn, pos, coups, nv);
  const ev = await exclusif(() => evaluerPositions(getMoteur(), pos, prm, progres, annule));
  if (!ev) return null;
  const moi = g.co === 'blancs' ? 'w' : 'b';
  const calc = calculer(ev, moi, g.issue, ctx);
  const plies = ev.map(x => ({ e: x.e, b: x.b }));
  enrichir(g, calc, plies, pos, coups, moi);
  let exos = [];
  try { exos = await exercicesDe(g, calc, plies, pos, coups, moi, annule); calc.resume.ex = 1; } catch {}
  if (annule()) return null;
  try { await rpc('echecs_analyse_enregistrer', { p_code: S.code, p_url: g.u, p_moteur: 'stockfish-19-lite-single', p_temps_ms: prm.d, p_plies: plies, p_resume: calc.resume, p_exos: exos }); } catch {}
  S.ana[g.u] = calc.resume; store.set('ec_ana', S.ana); majBadge(g.u);
  return { plies, calc, nv: prm.elo };
}


/* mise à jour des analyses faites avec une version précédente : on réutilise les évaluations enregistrées */
async function completer(g, avecExos, annule) {
  const [r, pgn] = await Promise.all([rpc('echecs_analyse_lire', { p_code: S.code, p_url: g.u }), rpc('echecs_partie', { p_code: S.code, p_url: g.u })]);
  if (!r || !r.plies) return false;
  const { coups, pos } = positionsDe(pgn);
  if (pos.length !== r.plies.length) return false;
  const nv = (r.resume && r.resume.nv) || eloProche(g.e), moi = g.co === 'blancs' ? 'w' : 'b';
  const calc = calculer(r.plies, moi, g.issue, contexteDe(pgn, pos, coups, nv));
  enrichir(g, calc, r.plies, pos, coups, moi);
  let exos = [];
  if (avecExos) { exos = await exercicesDe(g, calc, r.plies, pos, coups, moi, annule); if (annule()) return false; calc.resume.ex = 1; }
  else if (r.resume && r.resume.ex) calc.resume.ex = r.resume.ex;
  await rpc('echecs_analyse_enregistrer', { p_code: S.code, p_url: g.u, p_moteur: r.moteur || 'stockfish-19-lite-single', p_temps_ms: r.temps_ms || 0, p_plies: r.plies, p_resume: calc.resume, p_exos: exos });
  S.ana[g.u] = calc.resume; store.set('ec_ana', S.ana); majBadge(g.u);
  return true;
}
S.migr = null;
async function migrerRapide() {
  if (S.migrRun || !S.code) return;
  const a = PARTIES.filter(g => g.r === 'chess' && S.ana[g.u] && S.ana[g.u].st && !S.ana[g.u].ty && !S.autoErr[g.u]);
  if (!a.length) return;
  S.migrRun = true; S.migr = { i: 0, n: a.length }; majStatut();
  try {
    for (const g of a) {
      if (!S.code) break;
      try { if (!(await completer(g, false, () => false))) S.autoErr[g.u] = 1; } catch { S.autoErr[g.u] = 1; }
      S.migr.i++; if (S.migr.i % 4 === 0) majStatut();
    }
  } finally { S.migrRun = false; S.migr = null; majStatut(); if (S.tab === 'accueil') rendre(); autoAnalyse(); }
}

/* analyse automatique des dernières parties */
const recentes = () => PARTIES.filter(g => g.r === 'chess').slice(-S.nAuto);
function prochaineAuto() { return recentes().slice().reverse().find(g => (!S.ana[g.u] || (S.ana[g.u].ty && !S.ana[g.u].ex)) && !S.autoErr[g.u]); }
function majStatut() {
  const total = recentes().length, faites = recentes().filter(g => S.ana[g.u]).length;
  let t;
  if (S.migr) t = `Mise à jour de tes analyses précédentes : ${S.migr.i} sur ${S.migr.n}. Garde l’appli ouverte.`;
  else if (!S.auto) t = `Analyse automatique désactivée. ${faites} sur ${total} parties récentes analysées.`;
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
      if (S.migrRun) { await sleep(1000); continue; }
      S.autoEtat = { u: g.u, i: 0, n: 0 }; majStatut();
      try {
        if (S.ana[g.u]) {
          const ok = await completer(g, true, () => !S.auto || S.manuel > 0 || !S.code);
          if (!ok && S.auto && S.manuel === 0) S.autoErr[g.u] = 1;
          continue;
        }
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

/* ---------- plateau : pièces SVG, surbrillances, animation ---------- */
const pieceSvg = (type, color) => `<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${color}${type}"/></svg>`;
function roiEnEchec(fen) {
  try {
    const c = new Chess(fen); if (!c.inCheck()) return null;
    const t = c.turn(), B = c.board();
    for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { const p = B[r][k]; if (p && p.type === 'k' && p.color === t) return 'abcdefgh'[k] + (8 - r); }
  } catch {}
  return null;
}
function construirePlateau(plateau, fen, bas, o = {}) {
  plateau.innerHTML = '';
  const B = new Chess(fen).board(), ech = roiEnEchec(fen);
  const rangs = bas === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0], cols = rangs.slice();
  rangs.forEach((r, ri) => cols.forEach((c, ci) => {
    const nom = 'abcdefgh'[c] + (8 - r), p = B[r][c];
    const attrs = { class: 'case ' + ((r + c) % 2 ? 'fo' : 'cl') + (o.dernier && (o.dernier.from === nom || o.dernier.to === nom) ? ' der' : '') + (o.sel === nom ? ' sel' : '') + (ech === nom ? ' echec' : '') };
    if (o.onclick) attrs.onclick = () => o.onclick(nom);
    const cas = h('div', attrs);
    if (p) cas.append(h('span', { class: 'p', html: pieceSvg(p.type, p.color) }));
    if (o.cibles && o.cibles.some(m => m.to === nom)) cas.append(h('span', { class: 'pt' + (p ? ' pr' : '') }));
    if (ci === 0) cas.append(h('span', { class: 'co r' }, String(8 - r)));
    if (ri === 7) cas.append(h('span', { class: 'co f' }, 'abcdefgh'[c]));
    plateau.append(cas);
  }));
}
function animerCoup(plateau, dernier, bas) {
  if (!dernier || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pos_ = nom => { const c = 'abcdefgh'.indexOf(nom[0]), r = 8 - +nom[1]; return { c: bas === 'w' ? c : 7 - c, r: bas === 'w' ? r : 7 - r }; };
  const a = pos_(dernier.from), b = pos_(dernier.to);
  const cell = plateau.children[b.r * 8 + b.c]; const el = cell && cell.querySelector('.p'); if (!el) return;
  el.style.transform = `translate(${(a.c - b.c) * 100}%, ${(a.r - b.r) * 100}%)`; el.style.zIndex = 4;
  el.getBoundingClientRect();
  el.style.transition = 'transform .2s ease-out'; el.style.transform = 'none';
}

/* ---------- pourquoi : explications fondées sur le moteur ---------- */
const cachePq = new Map();
async function profond(fen, joue) {
  const k = fen + '|' + joue; if (cachePq.has(k)) return cachePq.get(k);
  S.manuel++; moteur && moteur.stop();
  try {
    const rb = await exclusif(() => getMoteur().evaluer(fen, { d: 12, cap: 1500 }));
    let ra;
    if (joue === rb.b) ra = rb;
    else {
      const r = essaiCoup(fen, joue);
      if (r && r.c.isGameOver()) ra = { e: r.c.isCheckmate() ? (r.m.color === 'w' ? 10000 : -10000) : 0, pv: [], b: null };
      else ra = await exclusif(() => getMoteur().evaluer(r.c.fen(), { d: 12, cap: 1500 }));
    }
    const res = { rb, ra }; cachePq.set(k, res); return res;
  } finally { S.manuel = Math.max(0, S.manuel - 1); autoAnalyse(); }
}
const explicationDe = (R, fen, joue, voix) => expliquerCoup({ fen, joue, best: R.rb.b, pvApres: R.ra.pv || [], pvMeilleur: R.rb.pv || [], eAvant: R.rb.e, eApres: R.ra.e, voix });
function noeudExplication(ex, o = {}) {
  const n = h('div', { class: 'pourquoi' });
  if (o.titre || ex.titre) n.append(h('h4', {}, o.titre || ex.titre));
  ex.lignes.forEach(t => n.append(h('p', {}, t)));
  if (!o.sansMeilleur && ex.meilleur.length) {
    n.append(h('h4', {}, ex.lignes.length ? `Le meilleur coup était ${ex.san}` : 'Pourquoi'));
    ex.meilleur.forEach(t => n.append(h('p', {}, '• ' + t)));
  }
  return n;
}
async function blocPourquoi(fen, joue, voix = 'tu', o = {}) {
  try {
    const R = await profond(fen, joue);
    return noeudExplication(explicationDe(R, fen, joue, voix), o);
  } catch { return h('p', { class: 'ana-msg err' }, 'Le moteur n’a pas pu produire d’explication. Réessaie.'); }
}

async function ouvrirPartie(g, opts = {}) {
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
  let i = coups.length, iPrec = i, bas = moi, lecture = null, fleches = false;
  let ana = null; // { plies, calc }
  let etat = 'inconnu'; // inconnu | aucune | calcul | prete
  let annuleManuel = false, wake = null, nvSel = niveauDe(g);
  const expCache = new Map();

  const plateau = h('div', { class: 'plateau', role: 'img', 'aria-label': 'Échiquier' });
  const svgFl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgFl.setAttribute('viewBox', '0 0 8 8'); svgFl.setAttribute('class', 'fleches');
  const enveloppe = h('div', { class: 'plateau-env' }, plateau, svgFl);
  const vhost = h('div', { class: 'var-host', style: 'display:none' });
  const liste = h('div', { class: 'coups' });
  const panneau = h('div', { class: 'analyse' });
  const infoPly = h('div', { class: 'info-ply' });
  const vpanel = h('div', { class: 'analyse var-panel', style: 'display:none' });
  const ic = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const btn = (nom, svg, fn, cls = '') => h('button', { 'aria-label': nom, title: nom, class: cls, onclick: fn, html: svg });
  const bTour = btn('Retourner l’échiquier', ic('<path d="M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3"/>'), () => { bas = bas === 'w' ? 'b' : 'w'; dessiner(); });
  const bDebut = btn('Début', ic('<path d="M6 5v14M18 6l-8 6 8 6z"/>'), () => aller_(0));
  const bPrec = btn('Coup précédent', ic('<path d="M15 6l-6 6 6 6"/>'), () => aller_(i - 1));
  const bLire = btn('Lecture', ic('<path d="M8 5l11 7-11 7z"/>'), () => bascule(), 'lecture');
  const bSuiv = btn('Coup suivant', ic('<path d="M9 6l6 6-6 6"/>'), () => aller_(i + 1));
  const bFin = btn('Fin', ic('<path d="M18 5v14M6 6l8 6-8 6z"/>'), () => aller_(coups.length));
  const bFl = btn('Montrer le meilleur coup', ic('<path d="M5 19L19 5M19 5h-9M19 5v9"/>'), () => { fleches = !fleches; dessiner(); }, 'fl');
  const cmd = h('div', { class: 'cmd' }, bTour, bDebut, bPrec, bLire, bSuiv, bFin, bFl);
  function bascule() {
    if (lecture) { clearInterval(lecture); lecture = null; bLire.innerHTML = ic('<path d="M8 5l11 7-11 7z"/>'); return; }
    if (i >= coups.length) i = 0;
    bLire.innerHTML = ic('<path d="M8 5v14M16 5v14"/>');
    lecture = setInterval(() => { if (i >= coups.length) { bascule(); return; } aller_(i + 1); }, 900);
  }
  function aller_(n) { i = Math.max(0, Math.min(coups.length, n)); dessiner(); }

  const centre = nom => { const c = 'abcdefgh'.indexOf(nom[0]), r = 8 - +nom[1]; return [(bas === 'w' ? c : 7 - c) + 0.5, (bas === 'w' ? r : 7 - r) + 0.5]; };
  const fleche = (u, couleur) => flecheSvg(u, couleur, bas);

  function dessiner() {
    const dern = i > 0 ? coups[i - 1] : null;
    construirePlateau(plateau, pos[i].fen, bas, { dernier: dern });
    if (dern && i === iPrec + 1) animerCoup(plateau, dern, bas);
    iPrec = i;
    let fl = '';
    if (fleches && ana && i < coups.length && ana.plies[i].b) {
      const meil = ana.plies[i].b, joue = uciDe(coups[i]), cc = ana.calc.coups[i];
      if (cc && cc.cls && joue !== meil) fl += fleche(joue, '#55627C');
      fl += fleche(meil, '#2F7BF6');
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

  /* explication d'un coup de la partie (ply = numéro du coup, à partir de 1) */
  async function expliquerPly(ply, conteneur, bouton) {
    const cle = String(ply);
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Le moteur cherche pourquoi…'; }
    let noeud = expCache.get(cle);
    if (!noeud) {
      const fen = pos[ply - 1].fen, joue = uciDe(coups[ply - 1]), voix = coups[ply - 1].color === moi ? 'tu' : 'neutre';
      noeud = await blocPourquoi(fen, joue, voix);
      expCache.set(cle, noeud);
    }
    conteneur.innerHTML = ''; conteneur.append(noeud.cloneNode(true));
    if (bouton) bouton.remove();
  }

  /* ligne d'information sur la position affichée */
  function majInfo() {
    infoPly.innerHTML = '';
    if (ana) {
      const W = ana.calc.W[i]; const mien = moi === 'w' ? W : 100 - W; const e = ana.plies[i].e;
      const eMoi = moi === 'w' ? e : -e;
      infoPly.append(h('span', { class: 'chance' }, `Tes chances de gagner : ${Math.round(mien)} %`), h('span', { class: 'ev' }, Math.abs(eMoi) >= 9000 ? (eMoi > 0 ? `mat en ${10000 - eMoi}` : `mat adverse en ${10000 + eMoi}`) : `évaluation ${formatEval(eMoi)}`));
      if (fleches && i < coups.length && ana.plies[i].b) infoPly.append(h('div', { class: 'legende-fl' }, h('span', { class: 'bleu' }, 'Meilleur coup'), ana.calc.coups[i] && ana.calc.coups[i].cls && uciDe(coups[i]) !== ana.plies[i].b ? h('span', { class: 'rose' }, 'Coup joué') : null));
    }
    // coup concerné : le prochain si les flèches sont affichées, sinon celui qui vient d'être joué
    const ply = fleches && ana && i < coups.length ? i + 1 : i;
    if (ply > 0) {
      const cc = ana ? ana.calc.coups[ply - 1] : null, c = coups[ply - 1];
      const mine = c.color === moi;
      if (cc && cc.cls) {
        const meil = ana.plies[ply - 1].b;
        infoPly.append(h('div', { class: 'faute c-' + cc.cls }, `${mine ? 'Ton coup' : 'Coup de l’adversaire'} ${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${c.san} : ${NOM_CLS[cc.cls]}.` + (meil ? ` Meilleur coup : ${sanDe(pos[ply - 1].fen, meil)}.` : '')));
      }
      const zone = h('div', { class: 'ex-zone' });
      const b = h('button', { class: 'btn discret petit', onclick: () => expliquerPly(ply, zone, b) }, cc && cc.cls ? 'Pourquoi ?' : `Expliquer ${c.san}`);
      infoPly.append(h('div', { class: 'ligne-btn' }, b));
      infoPly.append(zone);
      if (expCache.has(String(ply))) { zone.append(expCache.get(String(ply)).cloneNode(true)); b.remove(); }
    }
    infoPly.append(h('div', { class: 'ligne-btn' }, h('button', { class: 'btn discret petit', onclick: () => entrerVariante(i, false) }, 'Jouer à partir d’ici')));
  }

  /* ---------- variante : continuer la partie depuis une position ---------- */
  let vmode = false, vch = null, vcoups = [], vauto = true, vInfo = null, vDerniere = null, vpl = null, vDepart = 0, vMsg = '';
  const mienV = (e, col) => (col === 'w' ? e : -e);
  const prmV = () => paramsElo(nvSel);
  async function evalV() {
    if (vch.isGameOver()) { vInfo = { e: vch.isCheckmate() ? (vch.turn() === 'w' ? -10000 : 10000) : 0, b: null, pv: [] }; return vInfo; }
    vInfo = await exclusif(() => getMoteur().evaluer(vch.fen(), { d: Math.max(10, prmV().d), cap: 900 }));
    return vInfo;
  }
  async function entrerVariante(ply, meilleurDabord) {
    if (lecture) bascule();
    vmode = true; vch = new Chess(pos[ply].fen); vcoups = []; vDepart = ply; vDerniere = null; vMsg = '';
    S.manuel++; moteur && moteur.stop();
    enveloppe.style.display = 'none'; vhost.style.display = ''; cmd.style.display = 'none'; infoPly.style.display = 'none'; panneau.style.display = 'none'; liste.style.display = 'none'; vpanel.style.display = '';
    vpl = plateauJouable(vhost, { fen: vch.fen(), bas, couleur: () => (vauto ? moi : undefined), onMove: jouerV });
    vpl.bloquer(true); rendreV('Le moteur regarde la position…');
    await evalV();
    if (meilleurDabord && vInfo.b && vch.turn() === moi) { await jouerV(movePourUci(vInfo.b), true); return; }
    if (vauto && vch.turn() !== moi && !vch.isGameOver()) { await moteurJoue(); return; }
    vpl.bloquer(vch.isGameOver()); rendreV();
  }
  const movePourUci = u => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  async function jouerV(m, auto = false) {
    if (!vmode || vch.isGameOver()) return;
    const avant = vInfo, fenAv = vch.fen();
    let mv; try { mv = vch.move({ from: m.from, to: m.to, promotion: m.promotion }); } catch { return; }
    vcoups.push(mv); vpl.set(vch.fen(), { dernier: mv, anime: true }); vpl.bloquer(true); rendreV('Le moteur évalue ton coup…');
    const apres = await evalV();
    const perte = winPct(mienV(avant.e, mv.color)) - winPct(mienV(apres.e, mv.color));
    vDerniere = { san: mv.san, fenAv, uci: mv.from + mv.to + (mv.promotion || ''), perte, mine: mv.color === moi, meilleur: avant.b && avant.b === (mv.from + mv.to + (mv.promotion || '')) };
    if (vch.isGameOver()) { vpl.bloquer(true); rendreV(); return; }
    if (vauto && vch.turn() !== moi) await moteurJoue(); else { vpl.bloquer(false); rendreV(); }
  }
  async function moteurJoue() {
    rendreV('L’adversaire réfléchit…'); vpl.bloquer(true);
    const r = await exclusif(() => getMoteur().evaluer(vch.fen(), prmV()));
    if (!vmode) return;
    if (!r.b) { vpl.bloquer(false); rendreV(); return; }
    const mv = vch.move(movePourUci(r.b)); vcoups.push(mv);
    vpl.set(vch.fen(), { dernier: mv, anime: true });
    await evalV();
    vpl.bloquer(vch.isGameOver()); rendreV();
  }
  function annulerV() {
    if (!vcoups.length) return;
    const n = vauto && vcoups.length >= 2 && vcoups[vcoups.length - 1].color !== moi ? 2 : 1;
    for (let k = 0; k < n && vcoups.length; k++) { vch.undo(); vcoups.pop(); }
    vDerniere = null; vpl.set(vch.fen(), {}); vpl.bloquer(true); rendreV('Le moteur regarde la position…');
    evalV().then(() => { vpl.bloquer(vch.isGameOver()); rendreV(); });
  }
  function sortirVariante() {
    vmode = false; S.manuel = Math.max(0, S.manuel - 1); autoAnalyse();
    vhost.style.display = 'none'; vhost.innerHTML = ''; enveloppe.style.display = ''; cmd.style.display = ''; infoPly.style.display = ''; panneau.style.display = ''; liste.style.display = ''; vpanel.style.display = 'none';
    dessiner(); f.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function sanVariante() {
    const L = []; let n = vDepart;
    vcoups.forEach((m, k) => { const ply = vDepart + k + 1; L.push((m.color === 'w' ? `${Math.ceil(ply / 2)}. ` : (k === 0 ? `${Math.ceil(ply / 2)}… ` : '')) + m.san); });
    return L.join(' ');
  }
  function rendreV(msg) {
    vpanel.innerHTML = '';
    vpanel.append(h('h3', {}, 'Tu continues la partie'),
      h('p', { class: 'ana-msg' }, `À partir de la position après le coup ${vDepart}. ` + (vauto ? `L’adversaire répond avec un moteur de niveau ${nvSel} elo.` : 'Tu joues les deux camps.')));
    if (vcoups.length) vpanel.append(h('p', { class: 'var-san' }, sanVariante()));
    if (msg) { vpanel.append(h('p', { class: 'ana-msg' }, msg)); return; }
    if (vInfo) {
      const colTrait = vch.turn(), eMoi = moi === 'w' ? vInfo.e : -vInfo.e, mien = winPct(eMoi);
      vpanel.append(h('div', { class: 'info-ply' }, h('span', { class: 'chance' }, `Tes chances de gagner : ${Math.round(mien)} %`), h('span', { class: 'ev' }, Math.abs(eMoi) >= 9000 ? (eMoi > 0 ? `mat en ${10000 - eMoi}` : `mat adverse en ${10000 + eMoi}`) : `évaluation ${formatEval(eMoi)}`)));
      if (vch.isGameOver()) vpanel.append(h('div', { class: 'retour ' + (vch.isCheckmate() ? (colTrait === moi ? 'mauvais' : 'bon') : '') }, vch.isCheckmate() ? (colTrait === moi ? 'Échec et mat : tu as perdu cette variante.' : 'Échec et mat : tu as gagné cette variante.') : 'Partie nulle.'));
    }
    if (vDerniere && vDerniere.mine) {
      const p = vDerniere.perte, mot = vDerniere.meilleur ? 'Meilleur coup du moteur' : p >= 15 ? 'Gaffe' : p >= 10 ? 'Erreur' : p >= 5 ? 'Imprécision' : 'Bon coup';
      const zone = h('div', { class: 'ex-zone' });
      const b = h('button', { class: 'btn discret petit', onclick: async () => { b.disabled = true; b.textContent = 'Le moteur cherche pourquoi…'; zone.append(await blocPourquoi(vDerniere.fenAv, vDerniere.uci, 'tu')); b.remove(); } }, 'Pourquoi ?');
      vpanel.append(h('div', { class: 'faute ' + (p >= 15 ? 'c-g' : p >= 10 ? 'c-e' : p >= 5 ? 'c-i' : 'ok') }, `Ton coup ${vDerniere.san} : ${mot.toLowerCase()}` + (p >= 5 ? ` (${Math.round(p)} points de chances perdus).` : '.')), h('div', { class: 'ligne-btn' }, b), zone);
    }
    if (vInfo && vInfo.b && !vch.isGameOver() && (!vauto || vch.turn() === moi)) {
      vpanel.append(h('p', { class: 'ana-msg', style: 'margin-top:12px' }, `Meilleur coup selon le moteur : ${sanDe(vch.fen(), vInfo.b)}`),
        h('button', { class: 'btn', onclick: () => jouerV(movePourUci(vInfo.b)) }, 'Jouer ce coup'));
    }
    vpanel.append(h('div', { class: 'actions', style: 'margin-top:16px' },
      h('button', { class: 'btn discret', disabled: !vcoups.length, onclick: annulerV }, 'Annuler le dernier coup'),
      h('button', { class: 'btn discret', onclick: () => { vauto = !vauto; entrerVariante(vDepart, false); } }, vauto ? 'Jouer les deux camps' : 'Jouer contre le moteur'),
      h('button', { class: 'btn', onclick: sortirVariante }, 'Retour à la partie')));
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
      <path d="${zone}" fill="#4F8CF0" fill-opacity=".30" clip-path="url(#hau)"/>
      <path d="${zone}" fill="#6B7C99" fill-opacity=".32" clip-path="url(#bas)"/>
      <line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="#B3BDCE" stroke-dasharray="3 4"/>
      <path d="${d}" fill="none" stroke="#2F66D0" stroke-width="2" stroke-linejoin="round"/>
      ${pt ? `<circle cx="${X(pt.i).toFixed(1)}" cy="${Y(pt.i).toFixed(1)}" r="6.5" fill="#fff" stroke="#2F66D0" stroke-width="2.5"/>` : ''}
      <line class="cur" x1="0" x2="0" y1="0" y2="${H}" stroke="#1B2433" stroke-width="1.5"/>
      <text x="6" y="12" font-size="11" fill="#5F6B80">Tu es mieux</text><text x="6" y="${H - 5}" font-size="11" fill="#5F6B80">L’adversaire est mieux</text></svg>`;
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
    const pt = ana.calc.pt, zoneDec = h('div', { class: 'ex-zone' });
    const bPq = pt && h('button', { class: 'btn discret', onclick: async () => { bPq.disabled = true; bPq.textContent = 'Le moteur cherche pourquoi…'; zoneDec.append(await blocPourquoi(pos[pt.i - 1].fen, uciDe(coups[pt.i - 1]), coups[pt.i - 1].color === moi ? 'tu' : 'neutre')); bPq.remove(); } }, 'Pourquoi ?');
    const dec = h('div', { class: 'decisif' }, h('h3', {}, t.titre), h('p', {}, t.corps),
      pt && h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => { fleches = true; aller_(pt.i - 1); f.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Voir ce moment'), bPq,
        pt.mover === moi && pt.delta < 0 && h('button', { class: 'btn discret', onclick: () => { aller_(pt.i - 1); entrerVariante(pt.i - 1, true); f.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Jouer le meilleur coup et continuer')), zoneDec);
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
    jHaut, enveloppe, vhost, jBas, cmd, infoPly, vpanel, panneau, liste);
  listeCoups(); dessiner(); rendrePanneau();
  f._clavier = ev => { if (vmode) return; if (ev.key === 'ArrowLeft') aller_(i - 1); else if (ev.key === 'ArrowRight') aller_(i + 1); else if (ev.key === 'Escape') fermer(); };
  document.addEventListener('keydown', f._clavier);
  f._stop = () => { if (lecture) clearInterval(lecture); if (etat === 'calcul') { annuleManuel = true; moteur && moteur.stop(); } if (vmode) { vmode = false; S.manuel = Math.max(0, S.manuel - 1); } try { wake && wake.release(); } catch {} };

  // analyse déjà enregistrée ?
  try {
    const r = await rpc('echecs_analyse_lire', { p_code: S.code, p_url: g.u });
    if (r && r.plies && r.plies.length === pos.length) { const nv0 = (r.resume && r.resume.nv) || eloProche(g.e); const c0 = calculer(r.plies, moi, g.issue, { k: paramsElo(nv0).k }); if (r.resume) c0.resume = r.resume; ana = { plies: r.plies, calc: c0, nv: nv0 }; nvSel = nv0; etat = 'prete'; S.ana[g.u] = ana.calc.resume; store.set('ec_ana', S.ana); majBadge(g.u); listeCoups(); }
    else etat = 'aucune';
  } catch { etat = 'aucune'; }
  if (etat !== 'calcul') { rendrePanneau(); dessiner(); }
  if (opts.decisif && ana && ana.calc.pt) { fleches = true; aller_(ana.calc.pt.i - 1); }
}
function fermer() {
  const f = $('#feuille'); f._stop?.(); if (f._clavier) document.removeEventListener('keydown', f._clavier);
  f.classList.remove('on'); f.innerHTML = ''; document.body.style.overflow = '';
  const cb = S.surFermeture; S.surFermeture = null;
  if (S.tab === 'parties' || S.tab === 'accueil') rendre();
  if (cb) cb();
}


/* ---------- entraînement : échiquier jouable, exercices, finales, plan du jour ---------- */
const dateLocale = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-JJ
function flecheSvg(uci, couleur, bas) {
  const ctr = nom => { const c = 'abcdefgh'.indexOf(nom[0]), r = 8 - +nom[1]; return [(bas === 'w' ? c : 7 - c) + 0.5, (bas === 'w' ? r : 7 - r) + 0.5]; };
  const [x1, y1] = ctr(uci.slice(0, 2)), [x2, y2] = ctr(uci.slice(2, 4));
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, t = 0.34;
  const bx = x2 - ux * t * 1.1, by = y2 - uy * t * 1.1, px = -uy * t * 0.62, py = ux * t * 0.62;
  return `<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${couleur}" stroke-width=".16" stroke-linecap="round" opacity=".92"/><polygon points="${x2 - ux * 0.04},${y2 - uy * 0.04} ${bx + px},${by + py} ${bx - px},${by - py}" fill="${couleur}" opacity=".92"/>`;
}

/* échiquier sur lequel on joue en touchant une pièce puis sa case d'arrivée */
function plateauJouable(host, opts) {
  const E = { fen: opts.fen, bas: opts.bas, dernier: null, fleches: [], sel: null, cibles: [], bloque: false };
  const plateau = h('div', { class: 'plateau', role: 'application', 'aria-label': 'Échiquier : touche une pièce puis sa case d’arrivée' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 8 8'); svg.setAttribute('class', 'fleches');
  host.innerHTML = ''; host.append(h('div', { class: 'plateau-env' }, plateau, svg));
  const couleur = () => (typeof opts.couleur === 'function' ? opts.couleur() : opts.couleur);
  function rendre(anime) {
    construirePlateau(plateau, E.fen, E.bas, { dernier: E.dernier, sel: E.sel, cibles: E.cibles, onclick: clic });
    svg.innerHTML = E.fleches.map(fl => flecheSvg(fl[0], fl[1], E.bas)).join('');
    if (anime && E.dernier) animerCoup(plateau, E.dernier, E.bas);
  }
  function clic(nom) {
    if (E.bloque) return;
    const c = new Chess(E.fen), p = c.get(nom);
    if (E.sel) {
      const mv = E.cibles.find(m => m.to === nom && (!m.promotion || m.promotion === 'q'));
      if (mv) { E.sel = null; E.cibles = []; rendre(); opts.onMove({ from: mv.from, to: mv.to, promotion: mv.promotion, san: mv.san, uci: mv.from + mv.to + (mv.promotion || '') }); return; }
    }
    const coul = couleur();
    if (p && p.color === c.turn() && (!coul || p.color === coul)) { E.sel = nom; E.cibles = c.moves({ square: nom, verbose: true }); } else { E.sel = null; E.cibles = []; }
    rendre();
  }
  rendre();
  return { set(fen, o = {}) { E.fen = fen; E.dernier = o.dernier || null; E.fleches = o.fleches || []; E.sel = null; E.cibles = []; rendre(o.anime); }, bloquer(b) { E.bloque = b; } };
}

/* ----- données des exercices ----- */
async function chargerExos() {
  try { S.exos = await rpc('echecs_exos_lister', { p_code: S.code }); store.set('ec_exos', S.exos); } catch { S.exos = S.exos || store.get('ec_exos', []); }
  return S.exos;
}
const maintenant = () => Date.now() / 1000;
const exosDus = () => (S.exos || []).filter(x => x.pr <= maintenant()).sort((a, b) => a.bt - b.bt || b.p - a.p);
const exosMaitrises = () => (S.exos || []).filter(x => x.bt >= 4).length;

/* ----- plan du jour et série ----- */
function etatPlan() {
  const p = store.get('ec_plan', null);
  if (!p || p.d !== dateLocale()) return { d: dateLocale(), fait: {} };
  return p;
}
function marquerFait(etape) {
  const p = etatPlan(); p.fait[etape] = true; store.set('ec_plan', p);
  const dispo = etapesDispo();
  if (dispo.every(e => p.fait[e])) { const j = store.get('ec_jours', []); if (!j.includes(p.d)) { j.push(p.d); store.set('ec_jours', j.slice(-400)); } }
}
function etapesDispo() {
  const e = [];
  if (exosDus().length || (S.exos || []).length) e.push('exos');
  e.push('finale');
  if (momentDecisifCible()) e.push('moment');
  return e;
}
function serie() {
  const jours = new Set(store.get('ec_jours', []));
  let n = 0; const d = new Date();
  if (!jours.has(d.toLocaleDateString('sv-SE'))) d.setDate(d.getDate() - 1);
  while (jours.has(d.toLocaleDateString('sv-SE'))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function momentDecisifCible() {
  const c = PARTIES.filter(g => g.r === 'chess' && S.ana[g.u] && S.ana[g.u].pt && g.issue !== 'n').slice(-15).reverse();
  return c.find(g => g.issue === 'p') || c[0] || null;
}

/* ----- fenêtre plein écran d'entraînement ----- */
function ouvrirEntrain() {
  const f = $('#entrain'); f.classList.add('on'); document.body.style.overflow = 'hidden';
  const in_ = h('div', { class: 'in' }); f.innerHTML = ''; f.append(in_); f.scrollTop = 0;
  S.manuel++; moteur && moteur.stop();
  return { in_, fermer() { f.classList.remove('on'); f.innerHTML = ''; document.body.style.overflow = ''; S.manuel = Math.max(0, S.manuel - 1); autoAnalyse(); } };
}

/* ----- séance d'exercices tirés de tes gaffes ----- */
async function seanceExos(liste, fini) {
  const ov = ouvrirEntrain();
  const file = liste.slice(), resultats = [];
  let k = 0;
  const quitter = () => { ov.fermer(); fini && fini(resultats); };
  function bilan() {
    const bons = resultats.filter(r => r.ok).length, rates = resultats.filter(r => !r.ok).map(r => r.ex);
    ov.in_.innerHTML = '';
    ov.in_.append(h('div', { class: 'haut' }, h('span', {}), h('button', { class: 'fermer', onclick: quitter }, 'Terminer')),
      h('div', { class: 'issue n' }, `${bons} réussi${bons > 1 ? 's' : ''} sur ${resultats.length}`),
      h('p', { class: 'meta' }, bons === resultats.length ? 'Séance parfaite. Ces positions reviendront dans quelques jours pour vérifier que tu les retiens.' : 'Les positions ratées reviendront bientôt : refaire les mêmes erreurs corrigées, c’est comme ça qu’elles disparaissent.'),
      h('div', { class: 'lignes' }, resultats.map(r => h('div', { class: 'ligne-kv' }, h('div', { class: 'k' }, TYPES[r.ex.ty].nom, h('small', {}, `Contre ${r.ex.adv}`)), h('div', { class: 'v', style: 'color:' + (r.ok ? 'var(--bleu-t)' : 'var(--rose-t)') }, r.ok ? 'Réussi' : 'À revoir')))),
      rates.length ? h('button', { class: 'btn', style: 'margin-top:20px;margin-right:10px', onclick: () => { ov.fermer(); fini && fini(resultats); seanceExos(rates); } }, `Refaire les ${rates.length} à revoir`) : null,
      h('button', { class: rates.length ? 'btn discret' : 'btn', style: 'margin-top:20px', onclick: quitter }, 'Terminer'));
  }
  function montrer() {
    if (k >= file.length) return bilan();
    const ex = file[k], cote = ex.co;
    const mien = e => (cote === 'w' ? e : -e);
    let essais = 0, fini_ = false;
    profond(ex.fen, ex.b).catch(() => {}); // prépare le moteur pendant que tu réfléchis
    const retour = h('div', { class: 'retour' }), actions = h('div', { class: 'actions' }), host = h('div', {});
    ov.in_.innerHTML = '';
    ov.in_.append(h('div', { class: 'haut' }, h('button', { class: 'fermer', onclick: quitter }, 'Quitter'), h('span', { class: 'compteur' }, `${k + 1} sur ${file.length}`)),
      h('div', { class: 'issue n' }, 'Trouve le coup'),
      h('p', { class: 'meta' }, `Position tirée de ta partie contre ${ex.adv}, ${fCourt.format(new Date(ex.t * 1000))}.`),
      h('p', { class: 'consigne' }, `Les ${cote === 'w' ? 'blancs' : 'noirs'} jouent. Trouve le meilleur coup.`), host, retour, actions);
    const pl = plateauJouable(host, { fen: ex.fen, bas: cote, couleur: cote, onMove });
    const suivant = () => h('button', { class: 'btn', onclick: () => { k++; montrer(); } }, k + 1 >= file.length ? 'Voir le bilan' : 'Exercice suivant');
    async function terminer(ok) {
      if (fini_) return; fini_ = true; pl.bloquer(true);
      const premier = essais <= 1 && ok;
      resultats.push({ ex, ok: premier });
      try { await rpc('echecs_exo_resultat', { p_code: S.code, p_id: ex.id, p_ok: premier }); } catch {}
      actions.innerHTML = ''; actions.append(suivant());
    }
    async function solution() {
      essais = Math.max(essais, 2); pl.bloquer(true); pl.set(ex.fen, { fleches: [[ex.j, '#55627C'], [ex.b, '#2F7BF6']] });
      retour.className = 'retour mauvais'; retour.innerHTML = '';
      retour.append(h('b', {}, `Le meilleur coup était ${sanDe(ex.fen, ex.b)} (flèche bleue).`), h('p', { class: 'ana-msg' }, 'Le moteur prépare l’explication…'));
      terminer(false);
      const bloc = await blocPourquoi(ex.fen, ex.j, 'tu', { titre: `Pourquoi ${sanDe(ex.fen, ex.j)}, ton coup de la partie (flèche grise), était moins bon` });
      retour.innerHTML = ''; retour.append(h('b', {}, `Le meilleur coup était ${sanDe(ex.fen, ex.b)} (flèche bleue).`), bloc);
    }
    actions.append(h('button', { class: 'btn discret', onclick: solution }, 'Voir la solution'));
    async function onMove(m) {
      if (fini_) return;
      essais++; pl.bloquer(true);
      const apres = new Chess(ex.fen); apres.move({ from: m.from, to: m.to, promotion: m.promotion });
      pl.set(apres.fen(), { dernier: m, anime: true });
      retour.className = 'retour'; retour.textContent = 'Le moteur vérifie ton coup…';
      let bon = false, R = null, autre = false;
      try { R = await profond(ex.fen, m.uci); } catch {}
      if (m.uci === ex.b) bon = true;
      else if (m.uci !== ex.j && R) {
        bon = winPct(mien(R.ra.e)) >= winPct(mien(R.rb.e)) - 6; autre = bon;
      }
      if (bon) {
        retour.className = 'retour bon'; retour.innerHTML = '';
        const titre = m.uci === ex.b ? (essais === 1 ? 'Bien joué.' : 'Trouvé, mais pas du premier coup.') : `${m.san} est aussi un bon coup${essais > 1 ? ' (mais pas du premier coup)' : ''}.`;
        retour.append(h('b', {}, titre));
        if (R) {
          const exp = explicationDe(R, ex.fen, m.uci === ex.b || autre ? R.rb.b : m.uci, 'tu');
          const lignes = m.uci === ex.b ? [] : [`Le moteur préfère ${sanDe(ex.fen, ex.b)}. Dans la partie, tu avais joué ${sanDe(ex.fen, ex.j)} et perdu ${Math.round(ex.p)} points de chances de gagner.`];
          retour.append(h('div', { class: 'pourquoi' }, ...lignes.map(t => h('p', {}, t)), h('h4', {}, `Pourquoi ${sanDe(ex.fen, R.rb.b)} est le meilleur coup`), ...exp.meilleur.map(t => h('p', {}, '• ' + t))));
        }
        terminer(essais === 1);
      } else {
        retour.className = 'retour mauvais'; retour.innerHTML = '';
        retour.append(h('b', {}, m.uci === ex.j ? 'C’est le coup que tu avais joué dans la partie.' : 'Pas tout à fait.'));
        if (R) retour.append(noeudExplication(explicationDe(R, ex.fen, m.uci, 'tu'), { sansMeilleur: true, titre: `Pourquoi ${m.san} est moins bon` }));
        actions.innerHTML = '';
        actions.append(h('button', { class: 'btn', onclick: () => { retour.className = 'retour'; retour.textContent = ''; pl.set(ex.fen); pl.bloquer(false); actions.innerHTML = ''; actions.append(h('button', { class: 'btn discret', onclick: solution }, 'Voir la solution')); } }, 'Réessayer'),
          h('button', { class: 'btn discret', onclick: solution }, 'Voir la solution'));
      }
    }
  }
  montrer();
}

/* ----- exercices de finale : mater contre le moteur ----- */
const DRILLS = [
  { id: 'q1', titre: 'Mat avec la dame et le roi', fen: '8/8/8/3k4/8/8/2Q5/4K3 w - - 0 1', obj: 12, astuce: 'Rapproche ton roi sans jamais laisser le roi adverse sans case : attention au pat.' },
  { id: 'q2', titre: 'Mat avec la dame, roi dans le coin', fen: '7k/8/8/8/8/8/5Q2/K7 w - - 0 1', obj: 10, astuce: 'Réduis l’espace du roi adverse case par case avec la dame, puis amène ton roi.' },
  { id: 'r1', titre: 'Mat avec la tour et le roi', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', obj: 25, astuce: 'Coupe le roi adverse avec la tour, avance ton roi, puis fais reculer l’adversaire vers le bord.' },
  { id: 'r2', titre: 'Mat en un coup avec la tour', fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', obj: 1, astuce: 'Ton roi tient les cases de fuite : il ne manque que l’échec de la tour.' },
  { id: 'rr', titre: 'Mat avec deux tours (l’escalier)', fen: '8/8/8/3k4/8/8/8/R3K2R w - - 0 1', obj: 20, astuce: 'Une tour donne échec, l’autre coupe la rangée suivante, et on pousse le roi vers le bord.' },
  { id: 'q3', titre: 'Mat avec la dame, roi adverse au centre', fen: '8/8/8/8/8/4k3/8/K2Q4 w - - 0 1', obj: 12, astuce: 'Utilise la dame pour limiter le roi adverse, ne cherche pas l’échec à tout prix.' }
];
function drillDuJour() { const j = Math.floor(Date.now() / 86400000); return DRILLS[j % DRILLS.length]; }

async function seanceFinale(drill, fini) {
  const ov = ouvrirEntrain();
  let nb = 0, termine = false;
  const retour = h('div', { class: 'retour' }), host = h('div', {}), actions = h('div', { class: 'actions' });
  const quitter = () => { ov.fermer(); fini && fini(termine); };
  ov.in_.append(h('div', { class: 'haut' }, h('button', { class: 'fermer', onclick: quitter }, 'Quitter'), h('span', { class: 'compteur' }, 'Finale')),
    h('div', { class: 'issue n' }, drill.titre),
    h('p', { class: 'meta' }, `Tu joues les blancs contre le moteur. Objectif : mater en ${drill.obj} coup${drill.obj > 1 ? 's' : ''} ou moins. ${drill.astuce}`), host, retour, actions);
  const pl = plateauJouable(host, { fen: drill.fen, bas: 'w', couleur: 'w', onMove });
  let jeu = new Chess(drill.fen);
  const etat = t => { retour.className = 'retour'; retour.textContent = t; };
  etat('À toi de jouer.');
  const bRec = h('button', { class: 'btn discret', onclick: () => { jeu = new Chess(drill.fen); nb = 0; pl.set(drill.fen); pl.bloquer(false); etat('À toi de jouer.'); } }, 'Recommencer');
  const bIndice = h('button', { class: 'btn discret', onclick: async () => {
    if (jeu.turn() !== 'w' || jeu.isGameOver()) return;
    const fen = jeu.fen(); pl.bloquer(true); etat('Le moteur cherche un bon coup…');
    const r = await exclusif(() => getMoteur().evaluer(fen, { d: 8, cap: 500 }));
    pl.set(fen, { fleches: r.b ? [[r.b, '#2F7BF6']] : [] }); pl.bloquer(false); etat(r.b ? `Indice : essaie ${sanDe(fen, r.b)}.` : 'Pas d’indice disponible.');
  } }, 'Indice');
  actions.append(bIndice, bRec);
  async function onMove(m) {
    pl.bloquer(true);
    const mv = jeu.move({ from: m.from, to: m.to, promotion: m.promotion }); nb++;
    pl.set(jeu.fen(), { dernier: mv, anime: true });
    if (jeu.isCheckmate()) {
      termine = true; retour.className = 'retour bon'; retour.innerHTML = '';
      retour.append(h('b', {}, `Échec et mat en ${nb} coup${nb > 1 ? 's' : ''}.`), h('p', {}, nb <= drill.obj ? 'Objectif atteint.' : `L’objectif était ${drill.obj} coups : refais-le pour t’améliorer.`));
      actions.innerHTML = ''; actions.append(h('button', { class: 'btn', onclick: quitter }, 'Terminer'), bRec); return;
    }
    if (jeu.isGameOver()) { retour.className = 'retour mauvais'; retour.textContent = jeu.isStalemate() ? 'Pat : le roi adverse n’a plus de coup mais n’est pas en échec. Recommence.' : 'Partie nulle. Recommence.'; pl.bloquer(true); return; }
    etat('Le moteur répond…');
    const fen = jeu.fen();
    const r = await exclusif(() => getMoteur().evaluer(fen, { d: 6, cap: 400 }));
    if (!r.b) { retour.textContent = 'Le moteur n’a pas de réponse.'; return; }
    const rep = jeu.move({ from: r.b.slice(0, 2), to: r.b.slice(2, 4), promotion: r.b[4] });
    pl.set(jeu.fen(), { dernier: rep, anime: true });
    if (jeu.isGameOver()) { retour.className = 'retour mauvais'; retour.textContent = 'Partie nulle ou pat. Recommence.'; return; }
    etat(`Coup ${nb} joué. À toi de jouer.`); pl.bloquer(false);
  }
}

/* ----- onglet Entraîner ----- */
async function vueEntrainer() {
  const v = $('#v-entrainer'); v.innerHTML = '';
  v.append(h('div', { class: 'entete' }, h('h1', {}, 'Entraîner')));
  if (!S.exos) S.exos = store.get('ec_exos', []);
  const rendu = () => {
    const zone = $('#zone-entrainer'); if (!zone) return; zone.innerHTML = '';
    const dus = exosDus(), tous = S.exos || [], plan = etatPlan(), dispo = etapesDispo(), nSerie = serie();
    const fait = e => !!plan.fait[e];
    const lignes = [
      ['exos', 'Cinq positions tirées de tes gaffes', tous.length ? `${Math.min(5, dus.length)} à travailler aujourd’hui` : 'Analyse des parties pour créer des exercices'],
      ['finale', 'Un exercice de finale', drillDuJour().titre],
      ['moment', 'Revoir le moment décisif d’une partie', momentDecisifCible() ? `Contre ${momentDecisifCible().adv}` : 'Disponible quand des parties sont analysées']
    ].filter(l => dispo.includes(l[0]));
    const toutFait = lignes.every(l => fait(l[0]));
    const carte = h('div', { class: 'plan' }, h('div', { class: 'plan-t' }, h('h2', {}, 'Plan du jour'), h('span', { class: 'serie' }, nSerie ? `${nSerie} jour${nSerie > 1 ? 's' : ''} d’affilée` : 'Série à démarrer')));
    lignes.forEach(([k, t, sub]) => carte.append(h('button', { class: 'etape' + (fait(k) ? ' fait' : ''), onclick: () => faireEtape(k) },
      h('span', { class: 'coche' }, fait(k) ? '✓' : ''), h('span', { class: 'corps' }, h('div', { class: 'et' }, t), h('div', { class: 'det' }, sub)))));
    carte.append(h('button', { class: 'btn', style: 'margin-top:14px', disabled: toutFait, onclick: () => lancerPlan() }, toutFait ? 'Plan terminé, à demain' : lignes.some(l => fait(l[0])) ? 'Continuer le plan' : 'Commencer le plan'));
    zone.append(carte);
    const bloc = h('div', { class: 'bloc', style: 'padding-top:26px' }, h('h2', {}, 'Mes exercices'));
    if (!tous.length) bloc.append(h('p', { class: 'ana-msg' }, 'Tes exercices sont créés à partir des gaffes repérées dans tes parties analysées. Ouvre une partie et touche « Analyser », ou laisse l’analyse automatique tourner : les premiers exercices apparaissent ici.'));
    else {
      bloc.append(h('div', { class: 'lignes' }, ligneKV('Exercices au total', null, String(tous.length)), ligneKV('À revoir maintenant', null, String(dus.length)), ligneKV('Maîtrisés (réussis plusieurs fois)', null, String(exosMaitrises()))));
      const dep = dus.length ? dus.slice(0, 20) : tous.slice().sort(() => Math.random() - 0.5).slice(0, 5);
      bloc.append(h('button', { class: 'btn discret', style: 'margin-top:14px', onclick: () => seanceExos(dep, async () => { await chargerExos(); rendu(); }) }, dus.length ? `M’entraîner librement (${Math.min(20, dus.length)})` : 'Réviser quand même 5 positions'));
      const types = {}; tous.forEach(x => { types[x.ty] = (types[x.ty] || 0) + 1; });
      const premier = Object.keys(types).sort((a, b) => types[b] - types[a])[0];
      if (premier) bloc.append(h('p', { class: 'ana-msg', style: 'margin-top:12px' }, `Tes exercices portent surtout sur : ${TYPES[premier].nom.toLowerCase()}. ${TYPES[premier].conseil}`));
    }
    zone.append(bloc);
    const fin = h('div', { class: 'bloc', style: 'padding-top:26px' }, h('h2', {}, 'Finales de base'), h('p', { class: 'ana-msg' }, 'Mater contre le moteur : un bon réflexe à avoir, et des points gagnés à coup sûr dans les finales.'),
      h('div', { class: 'liste-a' }, DRILLS.map(d => h('button', { class: 'ligne-a', onclick: () => seanceFinale(d) }, h('span', { class: 'corps' }, h('div', { class: 'adv' }, d.titre), h('div', { class: 'det' }, `Objectif : ${d.obj} coup${d.obj > 1 ? 's' : ''} maximum`))))));
    zone.append(fin);
  };
  v.append(h('div', { id: 'zone-entrainer' }));
  rendu();
  await chargerExos(); if (S.tab === 'entrainer') rendu();
}
function faireEtape(k, suite) {
  const fin = () => { marquerFait(k); if (S.tab === 'entrainer') vueEntrainer(); suite && suite(); };
  if (k === 'exos') {
    const dus = exosDus().slice(0, 5); const liste = dus.length ? dus : (S.exos || []).slice().sort(() => Math.random() - 0.5).slice(0, 5);
    if (!liste.length) return fin();
    seanceExos(liste, async res => { await chargerExos(); if (res.length) fin(); else if (S.tab === 'entrainer') vueEntrainer(); });
  } else if (k === 'finale') seanceFinale(drillDuJour(), ok => { if (ok) fin(); else if (S.tab === 'entrainer') vueEntrainer(); });
  else if (k === 'moment') {
    const g = momentDecisifCible(); if (!g) return fin();
    S.surFermeture = fin; ouvrirPartie(g, { decisif: true });
  }
}
function lancerPlan() {
  const plan = etatPlan(); const reste = etapesDispo().filter(e => !plan.fait[e]);
  if (!reste.length) return;
  const enchaine = () => { const p = etatPlan(); const r = etapesDispo().filter(e => !p.fait[e]); if (r.length) faireEtape(r[0], enchaine); };
  faireEtape(reste[0], enchaine);
}

/* ---------- navigation ---------- */
const VUES = { accueil: vueAccueil, parties: vueParties, entrainer: vueEntrainer, ouvertures: vueOuvertures, reglages: vueReglages };
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
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  $$('nav.tabs button').forEach(b => b.addEventListener('click', () => aller(b.dataset.t)));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  addEventListener('resize', () => { if (S.tab === 'accueil') { clearTimeout(init.rt); init.rt = setTimeout(() => { const c = $('.courbe'); if (c) { c.dataset.anime = '1'; rendre(); } }, 150); } });
  if (!S.code) { afficherAcces(); return; }
  demarrer();
  if (await charger(true)) { rendre(); migrerRapide(); autoAnalyse(); }
}
init();
