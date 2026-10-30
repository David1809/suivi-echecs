/* Analyse des 15 premiers coups d'une partie, en deux passes :
   1. profondeur 10 sur toutes les positions (rapide) ;
   2. profondeur 14 sur les seuls coups qui semblent perdre au moins une imprécision (vérification).
   Mesure faite sur 40 parties réelles (référence : profondeur 18) : retrouve environ 91 % des erreurs et gaffes, 1 fausse alerte sur 87.
   Ce n'est pas une certitude : un coup peut être mal classé, surtout en cas de position très tactique. */
import { Chess } from 'chess.js';
import { SEUILS, winPct } from './analyse.js';

export const VERSION_OP = 2, D1 = 10, D2 = 14, METHODE = '10>14', MAX_PLIES = 30;
const perteDe = (ea, eb, mover) => { const a = winPct(ea), b = winPct(eb); return Math.max(0, mover === 'w' ? a - b : b - a); };

/* tokens : coups SAN ; moi : 'w' | 'b' ; k : coefficient de tolérance du niveau ;
   evalFn(fen, profondeur) -> { e (centipions, point de vue des blancs), b (meilleur coup UCI) } ou null si interrompu ;
   typeFn(i, plies, pos, coups, couleurDuJoueurQuiJoue) -> type de faute (réutilise la règle de l'appli) */
export async function analyserDebut({ tokens, moi, k, evalFn, typeFn, annule = () => false }) {
  const ch = new Chess(), fens = [ch.fen()], fin = [null], coups = [];
  for (const t of tokens.slice(0, MAX_PLIES)) { const m = ch.move(t); coups.push(m); fens.push(ch.fen()); fin.push(ch.isCheckmate() ? 'mat' : (ch.isStalemate() || ch.isInsufficientMaterial()) ? 'nulle' : null); }
  const n = coups.length; if (n < 2) return null;
  const pos = fens.map((fen, i) => ({ fen, fin: fin[i] }));
  const ev1 = new Array(n + 1), v = {};
  const terminal = i => fin[i] === 'mat' ? { e: i % 2 ? 10000 : -10000, b: null } : fin[i] === 'nulle' ? { e: 0, b: null } : null;
  for (let i = 0; i <= n; i++) { if (annule()) return null; const t = terminal(i); if (t) { ev1[i] = t; continue; } const r = await evalFn(fens[i], D1); if (!r) return null; ev1[i] = r; }
  const flag = SEUILS.i * k, perte1 = [null], flagged = [];
  for (let i = 1; i <= n; i++) { const p = perteDe(ev1[i - 1].e, ev1[i].e, i % 2 ? 'w' : 'b'); perte1[i] = p; if (p >= flag) { flagged.push(i); } }
  for (const i of flagged) for (const j of [i - 1, i]) { if (v[j] || terminal(j)) continue; if (annule()) return null; const r = await evalFn(fens[j], D2); if (!r) return null; v[j] = r; }
  const evF = j => v[j] || ev1[j], pliesF = Array.from({ length: n + 1 }, (_, j) => ({ e: evF(j).e, b: evF(j).b || null }));
  const cls = p => (p >= SEUILS.g * k ? 'g' : p >= SEUILS.e * k ? 'e' : p >= SEUILS.i * k ? 'i' : null);
  const of = [], ofa = [];
  for (let i = 1; i <= n; i++) {
    const mover = i % 2 ? 'w' : 'b', verifie = !!(v[i - 1] && v[i]);
    const p = verifie ? perteDe(v[i - 1].e, v[i].e, mover) : perte1[i], c = cls(p); if (!c) continue;
    const bu = pliesF[i - 1].b, joue = coups[i - 1].from + coups[i - 1].to + (coups[i - 1].promotion || '');
    let meilleur = null; if (bu && bu !== joue) { try { meilleur = new Chess(fens[i - 1]).move({ from: bu.slice(0, 2), to: bu.slice(2, 4), promotion: bu[4] }).san; } catch {} }
    let type = 'autre'; try { type = typeFn(i, pliesF, pos, coups, mover); } catch {}
    (mover === moi ? of : ofa).push([i, c, Math.round(p), meilleur, type]);
  }
  const M = j => (j <= n ? Math.round(moi === 'w' ? winPct(evF(j).e) : 100 - winPct(evF(j).e)) : null);
  const premiere = a => { const x = a.find(f => f[1] === 'g' || f[1] === 'e'); return x ? x[0] : null; };
  return { v: VERSION_OP, m: METHODE, k, n, e: ev1.map(x => x.e), q: Object.fromEntries(Object.entries(v).map(([j, r]) => [j, [r.e, r.b]])),
    of, ofa, e5: M(10), e10: M(20), e15: M(30), f1: premiere(of), fa1: premiere(ofa), nv: flagged.length };
}
