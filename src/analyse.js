/* Analyse des parties : moteur Stockfish (navigateur) et calculs de notation */

export const SEUILS = { i: 5, e: 10, g: 15 }; // points de chances de gagner perdus sur un coup (niveau expert)

/* Niveau d'analyse : le moteur regarde aussi loin qu'un joueur de ce niveau (profondeur limitée) et les
   seuils de faute sont plus tolérants quand le niveau est bas. */
export const NIV_ELO = [600, 800, 1000, 1200, 1500, 1800, 2000, 2200, 2500];
const TAB = { 600: { d: 3, k: 1.6 }, 800: { d: 5, k: 1.5 }, 1000: { d: 6, k: 1.35 }, 1200: { d: 8, k: 1.25 }, 1500: { d: 10, k: 1.1 }, 1800: { d: 12, k: 1 }, 2000: { d: 14, k: 1 }, 2200: { d: 16, k: 1 }, 2500: { d: 20, k: 1 } };
export const paramsElo = e => { const n = TAB[e] ? e : eloProche(e); return { ...TAB[n], cap: TAB[n].d >= 14 ? 1500 : 800, elo: n }; };
export const eloProche = e => { const x = e || 800; return NIV_ELO.reduce((b, v) => (Math.abs(v - x) < Math.abs(b - x) ? v : b), NIV_ELO[0]); };

export const winPct = e => {
  const c = Math.max(-1000, Math.min(1000, e));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
};
export const precisionCoup = perte => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * perte) - 3.1669));

export function formatEval(e) {
  if (Math.abs(e) >= 9000) return (e > 0 ? '+#' : '−#') + (10000 - Math.abs(e));
  const v = (e / 100).toFixed(1).replace('.', ',');
  return e > 0.5 ? '+' + v : e < -0.5 ? '−' + v.replace('-', '') : '0,0';
}

export class Moteur {
  constructor(url) { this.url = url; this.w = null; this.pret = null; this.onligne = null; }
  init() {
    if (this.pret) return this.pret;
    this.pret = new Promise((res, rej) => {
      try { this.w = new Worker(this.url); } catch (e) { this.pret = null; return rej(e); }
      this.w.onerror = err => { this.pret = null; rej(new Error('Le moteur n’a pas pu démarrer')); };
      let etape = 0;
      this.w.onmessage = ev => {
        const l = String(ev.data);
        if (etape === 0 && l === 'uciok') { etape = 1; this.cmd('setoption name Threads value 1'); this.cmd('setoption name Hash value 32'); this.cmd('isready'); }
        else if (etape === 1 && l === 'readyok') { etape = 2; res(); }
        else if (this.onligne) this.onligne(l);
      };
      this.cmd('uci');
    });
    return this.pret;
  }
  cmd(c) { this.w.postMessage(c); }
  async nouvellePartie() {
    await this.init();
    await new Promise(res => { this.onligne = l => { if (l === 'readyok') { this.onligne = null; res(); } }; this.cmd('ucinewgame'); this.cmd('isready'); });
  }
  stop() { if (this.w) this.cmd('stop'); }
  async evaluer(fen, prm) {
    await this.init();
    const trait = fen.split(' ')[1];
    return new Promise(res => {
      let dernier = null;
      this.onligne = l => {
        if (l.startsWith('info') && l.includes(' score ') && !/ (lowerbound|upperbound)/.test(l)) {
          const m = l.match(/ depth (\d+).* score (cp|mate) (-?\d+)/);
          if (m) {
            const pv = l.match(/ pv (\S+)/);
            dernier = { d: +m[1], type: m[2], v: +m[3], pv: pv ? pv[1] : null };
          }
        } else if (l.startsWith('bestmove')) {
          this.onligne = null;
          const b = l.split(' ')[1];
          let e = 0;
          if (dernier) {
            const sgn = trait === 'w' ? 1 : -1;
            if (dernier.type === 'cp') e = sgn * Math.max(-3000, Math.min(3000, dernier.v));
            else e = sgn * (dernier.v > 0 ? 1 : -1) * (10000 - Math.min(99, Math.abs(dernier.v)));
          }
          res({ e: Math.round(e), b: b && b !== '(none)' ? b : null, d: dernier ? dernier.d : 0 });
        }
      };
      this.cmd('position fen ' + fen);
      this.cmd(`go depth ${prm.d} movetime ${prm.cap}`);
    });
  }
}

/* positions : [{fen, fin: null | 'mat' | 'nulle'}] ; renvoie [{e, b, d}] (évaluation du point de vue des blancs, en centipions) */
export async function evaluerPositions(moteur, positions, prm, progres, annule) {
  await moteur.nouvellePartie();
  const sortie = [];
  const cache = new Map();
  for (let i = 0; i < positions.length; i++) {
    if (annule()) return null;
    const p = positions[i];
    const trait = p.fen.split(' ')[1];
    if (p.fin === 'mat') sortie.push({ e: trait === 'b' ? 10000 : -10000, b: null, d: 0 });
    else if (p.fin === 'nulle') sortie.push({ e: 0, b: null, d: 0 });
    else {
      const cle = p.fen.split(' ').slice(0, 4).join(' ');
      let r = cache.get(cle);
      if (!r) {
        r = await moteur.evaluer(p.fen, prm);
        if (annule()) return null;
        cache.set(cle, r);
      }
      sortie.push(r);
    }
    progres(i + 1, positions.length);
  }
  return sortie;
}

/* plies : évaluations des n+1 positions ; moi : 'w' | 'b' ; issue : 'g' | 'p' | 'n' */
export function calculer(plies, moi, issue, ctx = {}) {
  const k = ctx.k || 1;
  const W = plies.map(p => winPct(p.e));
  const n = plies.length - 1;
  const coups = [];
  const acc = { w: [], b: [] };
  const cnt = { w: { g: 0, e: 0, i: 0 }, b: { g: 0, e: 0, i: 0 } };
  const miens = p => (moi === 'w' ? p : 100 - p);
  for (let i = 1; i <= n; i++) {
    const mover = i % 2 ? 'w' : 'b';
    const perte = Math.max(0, mover === 'w' ? W[i - 1] - W[i] : W[i] - W[i - 1]);
    const cls = perte >= SEUILS.g * k ? 'g' : perte >= SEUILS.e * k ? 'e' : perte >= SEUILS.i * k ? 'i' : null;
    if (cls) cnt[mover][cls]++;
    acc[mover].push(precisionCoup(perte));
    coups.push({ i, mover, perte, cls, avant: miens(W[i - 1]), apres: miens(W[i]), delta: miens(W[i]) - miens(W[i - 1]) });
  }
  const moy = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  // moment décisif
  let pt = null;
  const meilleur = (filtre, signe) => {
    let best = null;
    for (const c of coups) if (filtre(c) && (best === null || signe * c.delta > signe * best.delta)) best = c;
    return best;
  };
  if (issue === 'p') {
    pt = meilleur(c => c.mover === moi && c.delta < 0, -1);
    if (!pt || pt.delta > -8) pt = meilleur(c => c.delta < 0, -1);
  } else if (issue === 'g') {
    pt = meilleur(c => c.delta > 0, 1);
  } else {
    pt = coups.reduce((b, c) => (b === null || Math.abs(c.delta) > Math.abs(b.delta) ? c : b), null);
  }
  if (pt && Math.abs(pt.delta) < 8) pt = null;
  const resume = { v: 2, nv: ctx.elo || null, aw: moy(acc.w), ab: moy(acc.b), cw: cnt.w, cb: cnt.b, pt: pt ? pt.i : null };
  if (ctx.ph) {
    const nouv = () => [0, 0, 0, 0];
    const st = { ph: { o: nouv(), m: nouv(), f: nouv() }, tm: { a: nouv(), b: nouv(), c: nouv() }, vt: { r: nouv(), n: nouv(), l: nouv() } };
    const ajoute = (t, cls) => { t[0]++; if (cls === 'g') t[1]++; else if (cls === 'e') t[2]++; else if (cls === 'i') t[3]++; };
    for (const c of coups) {
      if (c.mover !== moi) continue;
      ajoute(st.ph[ctx.ph[c.i]], c.cls);
      const rem = ctx.rem ? ctx.rem[c.i] : null;
      if (ctx.base && rem != null) {
        const fr = rem / ctx.base;
        ajoute(st.tm[fr > 0.5 ? 'a' : fr > 0.2 ? 'b' : 'c'], c.cls);
        const sp = ctx.spent[c.i];
        if (sp != null) ajoute(st.vt[sp < 3 ? 'r' : sp <= 15 ? 'n' : 'l'], c.cls);
      }
    }
    resume.st = st;
    if (pt) { resume.ptp = ctx.ph[pt.i]; resume.ptm = pt.mover === moi; resume.ptd = pt.delta < 0 ? 'p' : 'g'; }
  }
  return { coups, W, resume, pt };
}
