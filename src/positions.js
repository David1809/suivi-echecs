/* Position réelle d'une partie : cases, camp au trait, droits au roque, prise en passant (sans les compteurs de coups).
   Sert à reconnaître une ouverture même quand les coups sont joués dans un autre ordre (transposition). */
import { Chess } from 'chess.js';

const RESULTAT = /^(1-0|0-1|1\/2-1\/2|\*)$/;
const SAN = /^([KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](x[a-h])?[1-8](=[QRBN])?|O-O(-O)?)[+#]?$/;

export const sansDe = deb => deb.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);

/* « 4.d3 d6 » à partir de jetons et du rang (1 = premier demi-coup) du premier jeton */
export function libelle(jetons, ply0) {
  return jetons.map((t, k) => { const p = ply0 + k; return p % 2 ? `${(p + 1) / 2}.${t}` : (k === 0 ? `${p / 2}...${t}` : t); }).join(' ');
}

/* protection : ne garde que de vrais coups (jamais un résultat « 1-0 » ni un jeton illisible) */
export function nettoyerCoups(s) {
  const out = [];
  for (const t of (s ? String(s).split(' ') : [])) { if (!t || RESULTAT.test(t)) continue; if (!SAN.test(t)) break; out.push(t); }
  return out;
}

export const cleDe = ch => ch.fen().split(' ').slice(0, 4).join(' ');

/* position après les n premiers coups (null si un coup est illégal) */
export function cleApres(jetons, n) {
  const ch = new Chess();
  for (let k = 0; k < n; k++) { try { ch.move(jetons[k]); } catch { return null; } }
  return cleDe(ch);
}

/* positions de départ des fiches : clé -> [{ id, co, L, suite }] */
export function departsDe(COURS) {
  const m = new Map();
  for (const c of COURS) {
    const t = sansDe(c.debut), ch = new Chess();
    for (const s of t) ch.move(s);
    const k = cleDe(ch), v = m.get(k) || []; v.push({ id: c.id, co: c.co, L: t.length, suite: t.join(' ') }); m.set(k, v);
  }
  return m;
}
export const nivMax = departs => { let n = 0; for (const v of departs.values()) for (const d of v) n = Math.max(n, d.L); return n; };

/* Classement d'une partie.
   a : fiches dont la position de départ est atteinte, [id, rang du demi-coup, transposition (1 = autre ordre de coups)]
   o : ouverture réellement jouée au départ = première fiche atteinte
   ok : false si un coup est illisible ou illégal (la partie est alors signalée, pas ignorée en silence) */
export function classer(jetons, co, departs, nmax) {
  const ch = new Chess(), a = [], res = { o: null, a, f: jetons.slice(0, 4).join(' '), np: jetons.length, ok: true };
  const lim = Math.min(nmax, jetons.length);
  for (let p = 1; p <= lim; p++) {
    try { ch.move(jetons[p - 1]); } catch { res.ok = false; break; }
    const hit = departs.get(cleDe(ch));
    if (!hit) continue;
    for (const d of hit) if (d.co === co && d.L === p) a.push([d.id, p, jetons.slice(0, p).join(' ') === d.suite ? 0 : 1]);
  }
  if (a.length) res.o = a.slice().sort((x, y) => x[1] - y[1])[0][0];
  return res;
}
