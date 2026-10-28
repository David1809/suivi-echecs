/* Explications en clair : pourquoi un coup est moins bon, pourquoi le meilleur coup est meilleur.
   voix « tu » : coup du joueur ; voix « neutre » : coup de l'adversaire (on parle des blancs / des noirs). */
import { Chess } from 'chess.js';
import { winPct } from './analyse.js';

const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NOM = { p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' };
const FEM = { p: false, n: false, b: false, r: true, q: true, k: false };
const un = t => (FEM[t] ? 'une ' : 'un ') + NOM[t];
const laLe = t => (FEM[t] ? 'la ' : 'le ') + NOM[t];
const il = t => (FEM[t] ? 'elle' : 'il');
const fe = t => (FEM[t] ? 'e' : '');
const autre = c => (c === 'w' ? 'b' : 'w');
const points = n => `${n} point${n > 1 ? 's' : ''}`;
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const uci = m => m.from + m.to + (m.promotion || '');

function essai(fen, u) {
  try { const c = new Chess(fen); const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); return { c, m }; } catch { return null; }
}
function materiel(c, col) {
  let s = 0;
  for (const rang of c.board()) for (const p of rang) if (p && p.type !== 'k') s += (p.color === col ? 1 : -1) * V[p.type];
  return s;
}
function piecesDe(c, col) { const L = []; c.board().forEach((r, i) => r.forEach((p, j) => { if (p && p.color === col) L.push({ ...p, sq: 'abcdefgh'[j] + (8 - i) }); })); return L; }

/* pièce de `col` en prise : attaquée et soit non défendue, soit attaquée par une pièce de moindre valeur */
function enPrise(c, sq, col) {
  const p = c.get(sq); if (!p || p.color !== col || p.type === 'k') return null;
  const att = c.attackers(sq, autre(col));
  if (!att.length) return null;
  const defs = c.attackers(sq, col).length;
  const minAtt = Math.min(...att.map(a => V[c.get(a).type] || 99));
  if (defs === 0) return { sq, type: p.type, att, defs, minAtt, motif: 'non défendu' };
  if (minAtt < V[p.type] - 0.5) return { sq, type: p.type, att, defs, minAtt, motif: 'échange perdant' };
  return null;
}
const piecesEnPrise = (c, col) => piecesDe(c, col).map(p => enPrise(c, p.sq, col)).filter(Boolean);
function cibles(c, sq, col) { // pièces de `col` (hors pions) attaquées par la pièce adverse en `sq`
  return piecesDe(c, col).filter(p => c.attackers(p.sq, autre(col)).includes(sq) && (p.type === 'k' || V[p.type] >= 3));
}
const valeurNonPions = c => piecesDe(c, 'w').concat(piecesDe(c, 'b')).filter(p => p.type !== 'k' && p.type !== 'p').reduce((t, p) => t + V[p.type], 0);

export function sanDe(fen, u) { try { return new Chess(fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { return u; } }
function sanLigne(fen, pv, max) {
  if (!pv || !pv.length) return '';
  const c = new Chess(fen); const S = [];
  for (const u of pv.slice(0, max)) { try { S.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
  return S.join(' ');
}

/* vocabulaire selon la voix */
function parler(col, voix) {
  const tu = voix === 'tu';
  const camp = col === 'w' ? 'les blancs' : 'les noirs', adv = col === 'w' ? 'les noirs' : 'les blancs';
  const deCamp = col === 'w' ? 'des blancs' : 'des noirs';
  return {
    tu,
    sujet: tu ? 'tu' : camp, Sujet: tu ? 'Tu' : cap(camp),
    adv: tu ? 'l’adversaire' : adv, Adv: tu ? 'L’adversaire' : cap(adv),
    v: (a, b) => (tu ? a : b), // forme « tu » / forme « les blancs »
    p: t => (tu ? (FEM[t] ? 'ta ' : 'ton ') + NOM[t] : `${laLe(t)} ${deCamp}`),
    P: t => cap(tu ? (FEM[t] ? 'ta ' : 'ton ') + NOM[t] : `${laLe(t)} ${deCamp}`),
    roi: tu ? 'ton roi' : `le roi ${deCamp}`,
    coup: tu ? 'ton coup' : 'ce coup',
    chances: tu ? 'Tes chances de gagner' : `Les chances de gagner ${deCamp}`,
    deCamp, camp
  };
}

/* explication du MEILLEUR coup (voix neutre : valable pour les deux camps) */
export function pourquoiMeilleur(fen, best, pv, eMoi, ctx = {}) {
  const r = essai(fen, best); if (!r) return [];
  const { c, m } = r; const col = m.color; const L = [];
  const avant = new Chess(fen);
  if (eMoi >= 9000) L.push(`il mène à un mat en ${10000 - eMoi} coup${10000 - eMoi > 1 ? 's' : ''}.`);
  if (m.captured) {
    const defs = avant.attackers(m.to, autre(col)).length;
    L.push(`il prend ${laLe(m.captured)} en ${m.to}` + (defs === 0 ? `, qui n’était pas défendu${fe(m.captured)}.` : V[m.captured] >= V[m.piece] ? ' : l’échange est favorable.' : '.'));
  }
  if (/#/.test(m.san)) L.push('c’est échec et mat.');
  else if (/\+/.test(m.san)) L.push('il met le roi adverse en échec et l’oblige à réagir.');
  if (m.san.startsWith('O-O')) L.push('il met le roi à l’abri et rapproche la tour du centre.');
  const prises = piecesEnPrise(avant, col).filter(p => p.sq === m.from);
  if (prises.length && !m.captured) L.push(`il met ${laLe(m.piece)} à l’abri : ${il(m.piece)} était attaqué${fe(m.piece)}.`);
  const cibs = cibles(c, m.to, autre(col));
  if (!m.captured && cibs.length >= 2) L.push(`depuis ${m.to}, ${laLe(m.piece)} attaque deux pièces à la fois : ${cibs.map(x => (x.type === 'k' ? 'le roi' : un(x.type)) + ' en ' + x.sq).join(' et ')}.`);
  else if (!m.captured && cibs.length === 1 && cibs[0].type !== 'k') {
    const e = enPrise(c, cibs[0].sq, autre(col)); if (e) L.push(`il menace ${un(e.type)} en ${e.sq} (${e.motif === 'non défendu' ? 'sans défense' : 'échange favorable'}).`);
  }
  const avantMen = piecesEnPrise(avant, col), apresMen = piecesEnPrise(c, col);
  if (avantMen.length && apresMen.length < avantMen.length && !prises.length) L.push('il règle la menace qui pesait sur ses pièces (en défendant ou en échangeant).');
  const nPly = (fen.split(' ')[5] | 0) * 2 - (col === 'w' ? 1 : 0);
  if (!L.length && nPly <= 20 && (m.piece === 'n' || m.piece === 'b')) L.push(`il développe ${laLe(m.piece)}, ce qui l’active pour la suite.`);
  if (!L.length && m.piece !== 'k' && ['d4', 'e4', 'd5', 'e5'].includes(m.to)) L.push('il occupe ou surveille le centre de l’échiquier.');
  if (ctx.perteMat && ctx.perteMat <= -2) L.push(`il évite la perte de matériel que ${ctx.joue} permet (environ ${points(-ctx.perteMat)}).`);
  if (!L.length && ctx.finale && m.piece === 'k') L.push('en finale, le roi doit participer à la partie : ce coup le rapproche de l’action.');
  if (!L.length) L.push('il garde la position solide et ne laisse aucune prise à l’adversaire.');
  return L;
}

/* explication d'un coup joué */
export function expliquerCoup({ fen, joue, best, pvApres, pvMeilleur, eAvant, eApres, voix = 'tu' }) {
  const r0 = essai(fen, joue); if (!r0) return { lignes: [], meilleur: [], titre: '' };
  const { c: cApres, m: m0 } = r0; const col = m0.color;
  const S = parler(col, voix);
  const mien = e => (col === 'w' ? e : -e);
  const avant = new Chess(fen);
  const lignes = []; let expliqueMat = false;
  const bonne = best && joue === best;
  const wAv = winPct(mien(eAvant)), wAp = winPct(mien(eApres));
  const finaleCtx = valeurNonPions(avant) <= 8;

  if (bonne) return { titre: `${m0.san} est le meilleur coup`, lignes: [], meilleur: pourquoiMeilleur(fen, best, pvMeilleur, mien(eAvant), { finale: finaleCtx }).map(cap), san: m0.san };

  // 1. mat subi ou mat manqué
  if (mien(eApres) <= -9000) {
    const n = 10000 + mien(eApres), ligne = sanLigne(cApres.fen(), pvApres, 5);
    lignes.push(`Après ${m0.san}, ${S.adv} ${S.v('a', 'ont')} un mat forcé en ${n} coup${n > 1 ? 's' : ''}${ligne ? ` (${ligne})` : ''}.`);
    expliqueMat = true;
  } else if (mien(eAvant) >= 9000) {
    const n = 10000 - mien(eAvant);
    lignes.push(`Un mat en ${n} coup${n > 1 ? 's' : ''} existait avec ${sanDe(fen, best)}, et ${S.coup} le laisse passer.`);
  }

  // 2. conséquence matérielle sur la suite proposée par le moteur
  let perteMat = 0, premiereCapture = null, fourchette = null, suite = '';
  if (pvApres && pvApres.length) {
    const c1 = new Chess(cApres.fen()); const avantMat = materiel(c1, col);
    const mvs = [];
    for (const u of pvApres.slice(0, 6)) { try { mvs.push(c1.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })); } catch { break; } }
    perteMat = materiel(c1, col) - avantMat;
    const idx = mvs.findIndex(m => m.color !== col && m.captured);
    if (idx >= 0) premiereCapture = { m: mvs[idx], avant: mvs.slice(0, idx) };
    if (mvs.length) {
      const t0 = essai(cApres.fen(), uci(mvs[0]));
      if (t0 && !mvs[0].captured) { const cb = cibles(t0.c, mvs[0].to, col); if (cb.length >= 2) fourchette = { m: mvs[0], cb }; }
    }
    suite = sanLigne(cApres.fen(), pvApres, 4);
  }
  if (perteMat <= -2 && !expliqueMat) {
    if (fourchette) {
      const f = fourchette;
      lignes.push(`Après ${m0.san}, ${un(f.m.piece)} adverse peut aller en ${f.m.to} (${f.m.san}) et attaquer deux pièces à la fois : ${f.cb.map(x => (x.type === 'k' ? S.roi : S.p(x.type)) + ' en ' + x.sq).join(' et ')}. ${S.Sujet} ${S.v('ne peux', 'ne peuvent')} pas sauver les deux.`);
    } else if (premiereCapture) {
      const { m, avant: pre } = premiereCapture;
      const cc = new Chess(cApres.fen()); for (const p of pre) cc.move(p.san);
      const defs = cc.attackers(m.to, col).length;
      lignes.push(pre.length
        ? `Après ${m0.san}, ${S.adv} ${S.v('joue', 'jouent')} ${pre.map(x => x.san).join(' puis ')} et ${S.v('peut', 'peuvent')} ensuite prendre ${S.p(m.captured)} en ${m.to} (${m.san}).`
        : `Après ${m0.san}, ${S.adv} ${S.v('peut', 'peuvent')} prendre ${S.p(m.captured)} en ${m.to} avec ${m.san}.`);
      if (!pre.length) {
        if (defs === 0) lignes.push(`${S.P(m.captured)} n’était défendu${fe(m.captured)} par aucune pièce.`);
        else if (V[m.piece] < V[m.captured]) lignes.push(`Même défendu${fe(m.captured)}, ${il(m.captured)} est pris par ${un(m.piece)} qui vaut moins : ${points(V[m.captured])} perdus pour ${points(V[m.piece])} au mieux.`);
      }
    }
    if (suite) lignes.push(`Suite probable : ${suite}.`);
    lignes.push(`Bilan : environ ${points(-perteMat)} de matériel perdus (pion 1, cavalier ou fou 3, tour 5, dame 9).`);
  }

  // 3. cause : ce que le coup a changé
  const apresEP = piecesEnPrise(cApres, col), avantEP = piecesEnPrise(avant, col);
  const nouvelles = apresEP.filter(p => !(avantEP.some(a => a.sq === p.sq) && p.sq !== m0.to));
  if (nouvelles.length && perteMat <= -1 && !(premiereCapture && nouvelles.every(p => p.sq === premiereCapture.m.to))) {
    const p = nouvelles.sort((a, b) => V[b.type] - V[a.type])[0];
    if (p.sq === m0.to) lignes.push(`En jouant ${m0.san}, ${S.sujet} ${S.v('poses', 'posent')} ${S.p(p.type)} sur une case où ${il(p.type)} est attaqué${fe(p.type)} par ${un(cApres.get(p.att[0]).type)} adverse (${p.motif === 'non défendu' ? 'sans aucune défense' : 'l’échange est défavorable'}).`);
    else {
      const defAvant = avant.attackers(p.sq, col).includes(m0.from);
      lignes.push(defAvant ? `${S.P(m0.piece)} en ${m0.from} défendait ${S.p(p.type)} en ${p.sq} : en ${FEM[m0.piece] ? 'la' : 'le'} déplaçant, ${S.sujet} ${S.v('retires', 'retirent')} cette protection.`
        : `${S.P(p.type)} en ${p.sq} devient une cible et ${S.coup} ne ${FEM[p.type] ? 'la' : 'le'} protège pas.`);
    }
  }
  const ignoree = avantEP.filter(a => apresEP.some(p => p.sq === a.sq) && a.sq !== m0.from);
  if (ignoree.length) {
    const p = ignoree.sort((a, b) => V[b.type] - V[a.type])[0];
    if ((V[p.type] >= 3 && lignes.length < 3) || !lignes.length) {
      const at = avant.get(p.att[0]);
      lignes.push(`${S.Adv} menaçait ${S.p(p.type)} en ${p.sq}${at ? ` (attaqué${fe(p.type)} par ${un(at.type)})` : ''}, et ${S.coup} ne règle pas cette menace.`);
    }
  }

  // 4. raisons positionnelles quand aucun matériel n'est en jeu
  if (perteMat > -2 && !expliqueMat && !lignes.length) {
    const plyNum = (fen.split(' ')[5] | 0) * 2 - (col === 'w' ? 1 : 0);
    const raisons = [];
    if (m0.piece === 'q' && plyNum <= 14) raisons.push('Sortir la dame trop tôt l’expose aux attaques : l’adversaire gagne du temps en la chassant.');
    if (m0.piece === 'n' && /^[ah]/.test(m0.to)) raisons.push('Un cavalier au bord de l’échiquier contrôle moins de cases et devient peu utile.');
    const mobAv = avant.moves({ square: m0.from }).length;
    const parts = cApres.fen().split(' '); parts[1] = col; parts[3] = '-';
    let mobAp = 0; try { mobAp = new Chess(parts.join(' ')).moves({ square: m0.to }).length; } catch {}
    if (['n', 'b', 'r', 'q'].includes(m0.piece) && mobAp + 3 <= mobAv) raisons.push(`${cap(laLe(m0.piece))} contrôle moins de cases qu’avant (${mobAp} au lieu de ${mobAv}) : ${il(m0.piece)} devient moins actif${fe(m0.piece)}.`);
    if (m0.piece === 'p') {
      const roi = piecesDe(avant, col).find(p => p.type === 'k'); const fl = f => 'abcdefgh'.indexOf(f);
      if (roi && roi.sq[1] === (col === 'w' ? '1' : '8') && Math.abs(fl(m0.from[0]) - fl(roi.sq[0])) <= 1 && (col === 'w' ? ['2', '3'] : ['7', '6']).includes(m0.from[1]) && ![3, 4].includes(fl(roi.sq[0])))
        raisons.push(`Ce coup de pion affaiblit les cases devant ${S.roi} : l’adversaire pourra s’en servir pour attaquer.`);
    }
    if (m0.piece === 'k' && finaleCtx) raisons.push('En finale, le roi est une pièce active : ce coup l’éloigne de l’action alors qu’il devrait s’en rapprocher (centre, pions adverses ou ses propres pions).');
    const centre = ['d4', 'e4', 'd5', 'e5'], ctrl = c => centre.reduce((s, sq) => s + c.attackers(sq, col).length, 0);
    if (m0.piece !== 'k' && ctrl(avant) - ctrl(cApres) >= 2) raisons.push('Le contrôle du centre diminue, ce qui donne plus de place à l’adversaire.');
    if (best) { const rb = essai(fen, best); if (rb && rb.m.captured) raisons.push(`Une bonne capture était possible : ${sanDe(fen, best)} prenait ${laLe(rb.m.captured)}.`); }
    lignes.push(...(raisons.length ? raisons.slice(0, 2) : ['Aucune pièce n’est perdue tout de suite, mais le moteur trouve mieux : la position de l’adversaire devient plus agréable.']));
  }

  if (Math.abs(wAv - wAp) >= 1) lignes.push(`${S.chances} passent d’environ ${Math.round(wAv)} % à ${Math.round(wAp)} %.`);
  const meilleur = best ? pourquoiMeilleur(fen, best, pvMeilleur, mien(eAvant), { perteMat, joue: m0.san, finale: finaleCtx }).map(cap) : [];
  return { titre: `Pourquoi ${m0.san} est moins bon`, lignes, meilleur, san: best ? sanDe(fen, best) : null };
}
