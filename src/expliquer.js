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
    ses: tu ? 'tes' : 'leurs',
    pieces: tu ? 'tes pièces' : `les pièces ${col === 'w' ? 'blanches' : 'noires'}`,
    dePieces: tu ? 'de tes pièces' : `des pièces ${col === 'w' ? 'blanches' : 'noires'}`,
    piecesAdv: tu ? 'les pièces de l’adversaire' : `les pièces ${col === 'w' ? 'noires' : 'blanches'}`,
    sien: tu ? 'à toi' : deCamp,
    coup: tu ? 'ton coup' : 'ce coup',
    chances: tu ? 'Tes chances de gagner' : `Les chances de gagner ${deCamp}`,
    deCamp, camp
  };
}


/* ---------- plan positionnel : activité des pièces, structure de pions, roi, développement ---------- */
const FICH = 'abcdefgh';
const caseCouleur = sq => (FICH.indexOf(sq[0]) + +sq[1]) % 2; // 0 = foncée, 1 = claire
const pionsDe = (c, col) => piecesDe(c, col).filter(p => p.type === 'p');
function pionsDoubles(c, col) { const m = {}; for (const p of pionsDe(c, col)) m[p.sq[0]] = (m[p.sq[0]] || 0) + 1; return Object.keys(m).filter(f => m[f] > 1); }
function pionsIsoles(c, col) {
  const ps = pionsDe(c, col), cols = new Set(ps.map(p => p.sq[0]));
  return ps.filter(p => { const i = FICH.indexOf(p.sq[0]); return !(cols.has(FICH[i - 1]) || cols.has(FICH[i + 1])); }).map(p => p.sq);
}
function pionsPasses(c, col) {
  const adv = pionsDe(c, autre(col));
  return pionsDe(c, col).filter(p => { const f = FICH.indexOf(p.sq[0]), r = +p.sq[1]; return !adv.some(a => Math.abs(FICH.indexOf(a.sq[0]) - f) <= 1 && (col === 'w' ? +a.sq[1] > r : +a.sq[1] < r)); }).map(p => p.sq);
}
function mobilite(c, col) { // cases jouables par pièce (cavalier, fou, tour, dame)
  const parts = c.fen().split(' '); parts[1] = col; parts[3] = '-';
  let cc; try { cc = new Chess(parts.join(' ')); } catch { return null; }
  const res = {}; let total = 0;
  for (const p of piecesDe(cc, col)) if (['n', 'b', 'r', 'q'].includes(p.type)) { const n = cc.moves({ square: p.sq }).length; res[p.sq] = { type: p.type, n }; total += n; }
  return { par: res, total };
}
function colonneOuverte(c, f, col) { // 'ouverte' | 'semi' | null
  const ps = piecesDe(c, 'w').concat(piecesDe(c, 'b')).filter(p => p.type === 'p' && p.sq[0] === f);
  if (!ps.length) return 'ouverte';
  return ps.every(p => p.color !== col) ? 'semi' : null;
}
const toursActives = (c, col) => piecesDe(c, col).filter(p => p.type === 'r' && colonneOuverte(c, p.sq[0], col)).map(p => p.sq);
function avantPostes(c, col) {
  const adv = pionsDe(c, autre(col));
  return piecesDe(c, col).filter(p => p.type === 'n' && (col === 'w' ? +p.sq[1] >= 4 && +p.sq[1] <= 6 : +p.sq[1] >= 3 && +p.sq[1] <= 5)).filter(p => {
    const f = FICH.indexOf(p.sq[0]), r = +p.sq[1];
    const chassable = adv.some(a => Math.abs(FICH.indexOf(a.sq[0]) - f) === 1 && (col === 'w' ? +a.sq[1] > r : +a.sq[1] < r));
    const protege = c.attackers(p.sq, col).some(s => c.get(s).type === 'p');
    return protege && !chassable;
  }).map(p => p.sq);
}
/* « mauvais fou » : critère strict (pas de simple comptage de cases). Il faut ENSEMBLE : un fou déjà sorti de sa case de départ,
   au moins 4 pions du même camp sur sa couleur, au moins 2 d'entre eux bloqués (case devant eux occupée) et au moins 2 de ses
   4 diagonales coupées par un de ses propres pions à moins de 2 cases. Un fou moins mobile mais sans ces signes n'est PAS dit « mauvais ». */
export function foursMauvais(c, col) {
  const ps = pionsDe(c, col), dir = col === 'w' ? 1 : -1, dep = col === 'w' ? ['c1', 'f1'] : ['c8', 'f8'], res = [];
  for (const b of piecesDe(c, col).filter(p => p.type === 'b' && !dep.includes(p.sq))) {
    const meme = ps.filter(p => caseCouleur(p.sq) === caseCouleur(b.sq));
    if (meme.length < 4) continue;
    const bloques = meme.filter(p => { const r = +p.sq[1] + dir; return r >= 1 && r <= 8 && c.get(p.sq[0] + r); });
    if (bloques.length < 2) continue;
    let coupees = 0;
    for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let k = 1; k <= 2; k++) {
        const f = FICH.indexOf(b.sq[0]) + df * k, r = +b.sq[1] + dr * k; if (f < 0 || f > 7 || r < 1 || r > 8) break;
        const q = c.get(FICH[f] + r); if (!q) continue;
        if (q.color === col && q.type === 'p') coupees++;
        break;
      }
    }
    if (coupees >= 2) res.push({ sq: b.sq, pions: meme.map(p => p.sq), bloques: bloques.map(p => p.sq) });
  }
  return res;
}
function abriRoi(c, col) { // nombre de pions devant le roi (roque : colonnes voisines, rangs 2 ou 3 pour les blancs)
  const k = piecesDe(c, col).find(p => p.type === 'k'); if (!k) return null;
  if (k.sq[1] !== (col === 'w' ? '1' : '8')) return null;
  const f = FICH.indexOf(k.sq[0]); if (f === 3 || f === 4) return null; // roi encore au centre
  let n = 0; const rangs = col === 'w' ? ['2', '3'] : ['7', '6'];
  for (let d = -1; d <= 1; d++) { const ff = FICH[f + d]; if (ff && pionsDe(c, col).some(p => p.sq[0] === ff && rangs.includes(p.sq[1]))) n++; }
  return n;
}
function developpement(c, col) { // pièces mineures encore sur leur case de départ + roque non fait
  const dep = col === 'w' ? ['b1', 'c1', 'f1', 'g1'] : ['b8', 'c8', 'f8', 'g8'];
  const n = piecesDe(c, col).filter(p => (p.type === 'n' || p.type === 'b') && dep.includes(p.sq)).length;
  const roi = piecesDe(c, col).find(p => p.type === 'k');
  return { mineures: n, roiAuCentre: !!roi && roi.sq === (col === 'w' ? 'e1' : 'e8') };
}
function controleCentre(c, col) { return ['d4', 'e4', 'd5', 'e5'].reduce((s, sq) => s + c.attackers(sq, col).length, 0); }

/* prolonge une position par les coups de la suite probable tant que ce sont des captures (échanges) */
function suivreEchanges(c, pv, dejaCapture) {
  const cc = new Chess(c.fen()); let prev = dejaCapture;
  for (const u of (pv || []).slice(0, 3)) {
    if (!prev) break;
    try { const m = cc.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); prev = !!m.captured; } catch { break; }
  }
  return cc;
}

/* compare la position après le coup joué et après le meilleur coup, du point de vue de `col` */
function raisonsPositionnelles({ avant, apresJoue, apresMeilleur, m0, mb, col, plyNum, finale, voc }) {
  const O = autre(col), R = []; // R : { poids, texte }
  const ajoute = (poids, texte) => R.push({ poids, texte });
  const S = m0.san, B = mb ? mb.san : null;

  // structure de pions
  const dblAv = pionsDoubles(avant, col), dblJ = pionsDoubles(apresJoue, col);
  const nouveauxDbl = dblJ.filter(f => !dblAv.includes(f));
  if (nouveauxDbl.length) ajoute(1.0, `Avec ${S}, ${voc.sujet} ${voc.v('doubles', 'doublent')} ${voc.ses} pions sur la colonne ${nouveauxDbl[0]} : deux pions sur la même colonne se protègent moins bien et sont plus faciles à attaquer.`);
  const isoAv = pionsIsoles(avant, col), isoJ = pionsIsoles(apresJoue, col);
  const nouveauxIso = isoJ.filter(sq => !isoAv.includes(sq) && sq !== m0.to).concat(isoJ.includes(m0.to) && !isoAv.includes(m0.from) ? [m0.to] : []);
  if (nouveauxIso.length) ajoute(0.9, `${voc.P('p')} en ${nouveauxIso[0]} se retrouve isolé : plus aucun pion voisin ne peut le défendre ; il peut devenir une cible.`);
  const pasAv = pionsPasses(avant, O), pasJ = pionsPasses(apresJoue, O);
  const nouveauPasse = pasJ.filter(sq => !pasAv.includes(sq));
  if (nouveauPasse.length) ajoute(1.4, `Après ${S}, ${voc.adv} ${voc.v('obtient', 'obtiennent')} un pion passé en ${nouveauPasse[0]} : plus aucun pion ${voc.sien} ne peut l’arrêter en chemin.`);
  if (apresMeilleur) {
    const pasB = pionsPasses(apresMeilleur, col), pasJm = pionsPasses(apresJoue, col);
    const gagne = pasB.filter(sq => !pasJm.includes(sq));
    if (gagne.length) ajoute(1.3, `Avec ${B}, ${voc.sujet} ${voc.v('obtenais', 'obtenaient')} un pion passé en ${gagne[0]} : un pion qu’aucun pion adverse ne peut plus arrêter.`);
  }

  // fou gêné par ses propres pions (critère de structure, jamais le seul nombre de cases)
  {
    const fAv = foursMauvais(avant, col).map(x => x.sq);
    const fJ = foursMauvais(apresJoue, col).filter(x => !fAv.includes(x.sq));
    if (fJ.length && (m0.piece === 'b' || !fAv.length)) ajoute(0.7, `Après ${S}, ${voc.p('b')} en ${fJ[0].sq} est gêné par ses propres pions (${fJ[0].bloques.join(', ')} sont bloqués, sur des cases de sa couleur) : ses diagonales sont coupées. Ce n’est pas définitif : un coup de pion ou un échange peut le libérer.`);
  }

  // colonnes ouvertes, avant-postes, fous
  if (apresMeilleur) {
    const tB = toursActives(apresMeilleur, col), tJ = toursActives(apresJoue, col);
    const nouv = tB.filter(sq => !tJ.includes(sq));
    if (nouv.length) ajoute(0.9, `Avec ${B}, ${voc.p('r')} se placerait sur la colonne ${nouv[0][0]}, ${colonneOuverte(apresMeilleur, nouv[0][0], col) === 'ouverte' ? 'une colonne ouverte' : `une colonne sans pion ${voc.sien}`} : les tours y sont en général plus actives.`);
    const aB = avantPostes(apresMeilleur, col), aJ = avantPostes(apresJoue, col);
    const nouvA = aB.filter(sq => !aJ.includes(sq));
    if (nouvA.length) ajoute(1.0, `Avec ${B}, ${voc.sujet} ${voc.v('installes', 'installent')} un cavalier en ${nouvA[0]} : il est protégé par un pion et aucun pion adverse ne peut le chasser (avant-poste).`);
    const fB = foursMauvais(apresMeilleur, col).map(x => x.sq), fJ2 = foursMauvais(apresJoue, col).filter(x => !fB.includes(x.sq));
    if (fJ2.length) ajoute(0.5, `${voc.P('b')} en ${fJ2[0].sq} reste gêné par ses propres pions (${fJ2[0].bloques.join(', ')} bloqués, sur sa couleur), ce que ${B} évitait.`);
  }
  const aAv = avantPostes(avant, O), aJo = avantPostes(apresJoue, O);
  if (aJo.length > aAv.length) ajoute(1.0, `Après ${S}, ${voc.adv} ${voc.v('peut', 'peuvent')} installer un cavalier en ${aJo.find(sq => !aAv.includes(sq))} sans qu’un pion ${voc.sien} puisse le chasser.`);

  // roi
  const abAv = abriRoi(avant, col), abJ = abriRoi(apresJoue, col);
  if (abAv != null && abJ != null && abJ < abAv) ajoute(1.1, `Avec ${S}, ${voc.sujet} ${voc.v('retires', 'retirent')} un pion de devant ${voc.roi} (il y en avait ${abAv}, il n’en reste que ${abJ}) : les cases laissées libres peuvent devenir des portes d’entrée pour l’attaque adverse.`);
  const dvAv = developpement(avant, col), dvJ = developpement(apresJoue, col), dvB = apresMeilleur ? developpement(apresMeilleur, col) : null;
  if (plyNum <= 24 && dvB) {
    if (dvB.mineures < dvJ.mineures) ajoute(0.9, `${voc.Sujet} ${voc.v('as', 'ont')} encore ${dvJ.mineures} pièce${dvJ.mineures > 1 ? 's' : ''} à développer : avec ${B}, ${voc.sujet} en ${voc.v('sortais', 'sortaient')} une, alors que ${S} ne le fait pas. En ouverture, développer une pièce est en général prioritaire.`);
    if (dvB.roiAuCentre === false && dvJ.roiAuCentre) ajoute(0.9, `Avec ${B}, ${voc.roi} se mettrait à l’abri par le roque, ce que ${S} retarde : un roi resté au centre est plus vulnérable quand les lignes s’ouvrent.`);
  }
  // centre
  const ctr = c => controleCentre(c, col);
  if (apresMeilleur && ctr(apresMeilleur) - ctr(apresJoue) >= 2) ajoute(0.5, `Avec ${B}, les attaques ${voc.dePieces} sur les cases centrales (d4, e4, d5, e5) seraient plus nombreuses.`);
  else if (m0.piece !== 'k' && ctr(avant) - ctr(apresJoue) >= 2) ajoute(0.5, `${cap(voc.coup)} réduit les attaques ${voc.dePieces} sur les cases centrales (d4, e4, d5, e5).`);
  // roi en finale
  if (finale && mb && mb.piece === 'k') ajoute(0.8, 'En finale, le roi est une pièce active : le meilleur coup le rapproche de l’action (centre, pions adverses ou ses propres pions).');
  if (finale && m0.piece === 'k' && mb && mb.piece === 'k' && m0.to !== mb.to) ajoute(0.6, `${cap(voc.roi)} va en ${m0.to} alors que ${B} le plaçait mieux pour la suite.`);

  return R.sort((a, b) => b.poids - a.poids).map(x => x.texte);
}

/* ---------- vérification d'une variante du moteur ----------
   Le moteur donne une suite probable (PV), pas une suite obligatoire. On la rejoue coup par coup avec chess.js : un coup
   illégal coupe la variante ; le matériel est recompté après chaque coup ; un motif tactique n'est annoncé que si la suite
   rejouée le confirme (gain de matériel net, une fois les échanges terminés). */
function rejouer(fen, pv, max = 6) {
  const S = []; if (!pv || !pv.length) return S;
  let c; try { c = new Chess(fen); } catch { return S; }
  for (const u of pv.slice(0, max)) {
    const av = new Chess(c.fen()), nLegaux = c.moves().length; let m;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    S.push({ m, av, c: new Chess(c.fen()), nLegaux });
  }
  return S;
}
function bilanVariante(fen, pv, col, max = 6) {
  const S = rejouer(fen, pv, max); if (!S.length) return null;
  const m0 = materiel(new Chess(fen), col);
  const bal = S.map(s => materiel(s.c, col) - m0);
  let kc = -1; S.forEach((s, i) => { if (s.m.captured || s.m.promotion) kc = i; });
  let incertain = false;
  if (kc >= 0 && kc === S.length - 1) { const s = S[kc]; incertain = !s.c.isGameOver() && s.c.attackers(s.m.to, autre(s.m.color)).length > 0; }
  const nCaptures = S.filter(s => s.m.captured).length;
  return { S, bal, kc, gain: kc >= 0 ? bal[kc] : 0, minBal: Math.min(0, ...bal), incertain, nCaptures, mat: S[S.length - 1].c.isCheckmate(), fen };
}
/* « 4.Nxe5 Nxe4 5.Nxf7 » */
function numerote(fen, S, max = 5) {
  const f = fen.split(' '); let n = +f[5] || 1; const out = [];
  S.slice(0, max).forEach((s, i) => { if (s.m.color === 'w') out.push(`${n}.${s.m.san}`); else { out.push((i === 0 ? `${n}…` : '') + s.m.san); n++; } });
  return out.join(' ');
}
/* pièces adverses clouées au roi par la position `c` (le roi serait en échec si la pièce partait) */
function clouees(c, col) { // col = camp qui cloue
  const O = autre(col), roi = piecesDe(c, O).find(p => p.type === 'k'); if (!roi || c.isCheck()) return [];
  const res = [];
  for (const p of piecesDe(c, O).filter(p => p.type !== 'k')) {
    const t = new Chess(c.fen()); t.remove(p.sq);
    if (t.isAttacked(roi.sq, col)) res.push(p);
  }
  return res;
}
/* motifs tactiques de `col` dans la variante, SEULEMENT s'ils sont confirmés par la suite rejouée */
function motifs(bil, col) {
  const R = []; if (!bil || bil.incertain || bil.gain < 1) return R;
  const { S } = bil, O = autre(col);
  S.forEach((s, i) => {
    if (s.m.color !== col) return;
    // fourchette : la pièce jouée attaque 2 pièces (≥ 3 points ou roi) et la suite prend l'une d'elles
    const cb = cibles(s.c, s.m.to, O);
    if (cb.length >= 2) {
      const j = S.findIndex((t, k) => k > i && t.m.color === col && t.m.captured && cb.some(x => x.sq === t.m.to && x.type === t.m.captured));
      if (j >= 0) R.push({ type: 'fourchette', texte: `${s.m.san} attaque deux pièces à la fois : ${cb.map(x => (x.type === 'k' ? 'le roi' : un(x.type)) + ' en ' + x.sq).join(' et ')}. Dans la suite calculée, l’adversaire n’en sauve qu’une et ${S[j].m.san} prend ${laLe(S[j].m.captured)} en ${S[j].m.to}.`, lecon: 'Une pièce qui attaque deux cibles à la fois (fourchette) force l’adversaire à en abandonner une. Avant de jouer, cherche si l’une de tes pièces peut en attaquer deux d’un coup, et regarde si l’adversaire peut le faire contre toi.' });
    }
    // clouage nouveau, confirmé par la prise de la pièce clouée
    const apres = clouees(s.c, col).filter(p => !clouees(s.av, col).some(q => q.sq === p.sq));
    for (const p of apres) {
      const j = S.findIndex((t, k) => k > i && t.m.color === col && t.m.captured && t.m.to === p.sq);
      if (j >= 0) { R.push({ type: 'clouage', texte: `${s.m.san} cloue ${laLe(p.type)} adverse en ${p.sq} : s’${il(p.type)} bougeait, le roi serait en échec. Dans la suite calculée, ${S[j].m.san} le prend ensuite.`, lecon: 'Une pièce clouée devant son roi ne peut pas bouger : c’est une cible facile. Regarde si tu peux clouer une pièce adverse, et si l’une des tiennes l’est.' }); break; }
    }
    // échec à la découverte
    if (/\+/.test(s.m.san) && s.c.isCheck()) {
      const roi = piecesDe(s.c, O).find(p => p.type === 'k');
      if (roi && !s.c.attackers(roi.sq, col).includes(s.m.to) && S.some((t, k) => k > i && t.m.color === col && t.m.captured))
        R.push({ type: 'decouverte', texte: `${s.m.san} dévoile une attaque : en bougeant, la pièce ouvre la ligne d’une autre pièce sur le roi adverse (échec à la découverte). L’adversaire doit répondre à l’échec, ce qui permet la suite.`, lecon: 'Un échec « à la découverte » oblige l’adversaire à réagir pendant que la pièce qui a bougé fait autre chose.' });
    }
    // défenseur éliminé : la pièce prise défendait la case de la capture suivante
    if (s.m.captured) {
      const j = S.findIndex((t, k) => k > i && t.m.color === col && t.m.captured && t.m.to !== s.m.to && s.av.attackers(t.m.to, O).includes(s.m.to) && !s.c.attackers(t.m.to, O).includes(s.m.to));
      if (j >= 0 && !R.some(x => x.type === 'fourchette')) R.push({ type: 'defenseur', texte: `${s.m.san} élimine ${laLe(s.m.captured)} qui défendait ${laLe(S[j].m.captured)} en ${S[j].m.to} : sans ce défenseur, ${S[j].m.san} devient possible.`, lecon: 'Avant de croire qu’une pièce est bien protégée, regarde si son défenseur peut être pris ou chassé.' });
    }
  });
  return R;
}
/* texte de la variante (pour le coup du moteur ou la suite d'un coup joué) ; `qui` : camp dont on parle */
function decrire(fen, bil, col, voc, tien) {
  const L = [], pour = tien ? 'pour toi' : `pour ${col === 'w' ? 'les blancs' : 'les noirs'}`;
  const { S } = bil; const tour = S.filter(s => s.m.color !== col);
  if (S.length >= 2) {
    const forces = tour.length && tour.every(s => s.nLegaux === 1);
    L.push(`Variante calculée par le moteur : ${numerote(fen, S, Math.max(5, bil.kc + 1))}. ${forces ? 'Les réponses de l’adversaire y sont toutes obligatoires (un seul coup légal).' : 'C’est la suite que le moteur juge la plus probable, pas une suite obligatoire : l’adversaire peut jouer autre chose.'}`);
  }
  if (bil.mat) L.push(`Cette variante se termine par échec et mat (${S[S.length - 1].m.san}).`);
  else if (bil.nCaptures) {
    if (bil.incertain) L.push('La variante s’arrête sur une capture qui peut être reprise : le gain n’est pas confirmé.');
    else if (bil.gain >= 1) L.push(`Une fois les échanges terminés dans cette variante, le matériel est de +${bil.gain} ${pour} (pion 1, cavalier ou fou 3, tour 5, dame 9).`);
    else if (bil.gain === 0 && bil.nCaptures >= 2) L.push('Dans cette variante, chaque pièce prise est reprise : les échanges se compensent et le matériel reste égal.');
    else if (bil.gain <= -1) L.push(`Dans cette variante, le matériel est de ${bil.gain} ${pour} une fois les échanges terminés.`);
  }
  return L;
}

/* explication du MEILLEUR coup (voix neutre : valable pour les deux camps) */
function detailMeilleur(fen, best, pv, eMoi, ctx = {}) {
  const r = essai(fen, best); if (!r) return null;
  const { c, m } = r; const col = m.color; const L = [];
  // voix : `ctx.voix` ('tu' = coup du joueur) ou `ctx.camp` (couleur du joueur) ; sans indication, on parle du joueur
  const tien = ctx.voix ? ctx.voix === 'tu' : (ctx.camp ? col === ctx.camp : true);
  const cotes = col === 'w' ? 'blanches' : 'noires';
  const sesPieces = tien ? 'tes pièces' : `les pièces ${cotes}`;
  const avant = new Chess(fen);
  if (eMoi >= 9000) L.push(`il mène à un mat en ${10000 - eMoi} coup${10000 - eMoi > 1 ? 's' : ''}.`);
  const bil = pv && pv.length && pv[0] === best ? bilanVariante(fen, pv, col) : null;
  if (m.captured) {
    const defs = avant.attackers(m.to, autre(col)).length, cible = `${laLe(m.captured)} en ${m.to}`;
    if (bil) L.push(`il prend ${cible}.`); // le bilan réel (reprises comprises) vient de la variante vérifiée, plus bas
    else if (defs === 0) L.push(`il prend ${cible}, qui n’était pas défendu${fe(m.captured)}.`);
    else if (V[m.captured] > V[m.piece]) L.push(`il prend ${cible} : même si l’adversaire reprend, ${il(m.captured)} vaut plus que ${laLe(m.piece)} qui ${FEM[m.captured] ? 'la' : 'le'} prend (bilan du premier échange : +${V[m.captured] - V[m.piece]}).`);
    else if (V[m.captured] === V[m.piece]) L.push(`il prend ${cible} : si l’adversaire reprend, c’est un échange de pièces de même valeur. Sans suite calculée par le moteur, on ne peut pas annoncer de gain.`);
    else L.push(`il prend ${cible}, mais ${il(m.captured)} est défendu${fe(m.captured)} : l’adversaire peut reprendre. Sans suite calculée par le moteur, on ne peut pas annoncer de gain.`);
  }
  if (/#/.test(m.san)) L.push('c’est échec et mat.');
  else if (/\+/.test(m.san)) L.push('il met le roi adverse en échec et l’oblige à réagir.');
  if (m.san.startsWith('O-O')) L.push('il roque : le roi quitte le centre et la tour entre en jeu.');
  const prises = piecesEnPrise(avant, col).filter(p => p.sq === m.from);
  if (prises.length && !m.captured) L.push(enPrise(c, m.to, col) ? `il déplace ${laLe(m.piece)}, qui était attaqué${fe(m.piece)} (${il(m.piece)} reste cependant menacé${fe(m.piece)} en ${m.to}).` : `il met ${laLe(m.piece)} à l’abri : ${il(m.piece)} était attaqué${fe(m.piece)}.`);
  const cibs = cibles(c, m.to, autre(col));
  if (!m.captured && cibs.length >= 2) L.push(`depuis ${m.to}, ${laLe(m.piece)} attaque deux pièces à la fois : ${cibs.map(x => (x.type === 'k' ? 'le roi' : un(x.type)) + ' en ' + x.sq).join(' et ')}.`);
  else if (!m.captured && cibs.length === 1 && cibs[0].type !== 'k') {
    const e = enPrise(c, cibs[0].sq, autre(col)); if (e) L.push(`il menace ${un(e.type)} en ${e.sq} (${e.motif === 'non défendu' ? 'sans défense' : 'attaqué par une pièce qui vaut moins'}).`);
  }
  if (!m.captured && !cibs.length) {
    const vises = piecesDe(c, autre(col)).filter(p => p.type !== 'k' && c.attackers(p.sq, col).includes(m.to));
    const libres = vises.filter(p => !c.attackers(p.sq, autre(col)).length);
    if (libres.length) L.push(`depuis ${m.to}, ${laLe(m.piece)} attaque ${libres.slice(0, 2).map(p => un(p.type) + ' en ' + p.sq).join(' et ')} sans défense.`);
    else if (vises.length) L.push(`depuis ${m.to}, ${laLe(m.piece)} met la pression sur ${vises.slice(0, 2).map(p => un(p.type) + ' en ' + p.sq).join(' et ')}.`);
  }
  const protegees = piecesDe(c, col).filter(p => p.type !== 'k' && p.sq !== m.to && c.attackers(p.sq, autre(col)).length && c.attackers(p.sq, col).includes(m.to) && !avant.attackers(p.sq, col).length);
  if (protegees.length) L.push(`il protège ${un(protegees[0].type)} en ${protegees[0].sq}, qui était menacé${fe(protegees[0].type)}.`);
  if (m.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(m.to)) L.push(`il place un pion au centre, en ${m.to}.`);
  const avantMen = piecesEnPrise(avant, col), apresMen = piecesEnPrise(c, col);
  if (avantMen.length && apresMen.length < avantMen.length && !prises.length) L.push('il règle la menace qui pesait sur ses pièces (en défendant ou en échangeant).');
  const nPly = (fen.split(' ')[5] | 0) * 2 - (col === 'w' ? 1 : 0);
  // « développe » seulement si la pièce quitte sa case de départ
  if (!L.length && nPly <= 20 && (m.piece === 'n' || m.piece === 'b') && ['b1', 'c1', 'f1', 'g1', 'b8', 'c8', 'f8', 'g8'].includes(m.from)) L.push(`il développe ${laLe(m.piece)} : ${il(m.piece)} quitte sa case de départ.`);
  if (!L.length && m.piece !== 'k' && ['d4', 'e4', 'd5', 'e5'].includes(m.to)) L.push(`il place ${laLe(m.piece)} sur une case centrale (${m.to}).`);
  if (ctx.perteMat && ctx.perteMat <= -2) L.push(`il évite la perte de matériel que ${ctx.joue} permet (environ ${points(-ctx.perteMat)}).`);
  if (!L.length && ctx.finale && m.piece === 'k') L.push('en finale, le roi doit participer à la partie : ce coup le rapproche de l’action.');
  // pas de phrase de remplissage : si aucune règle vérifiée ne s’applique, la liste reste vide
  const V2 = [], M = bil ? motifs(bil, col) : [];
  if (bil) {
    V2.push(...decrire(fen, bil, col, null, tien));
    if (bil.minBal <= -2 && bil.S[0].m.color === col) {
      if (!bil.nCaptures || bil.incertain) { /* rien de sûr à dire */ }
      else if (bil.gain >= 0) V2.push(`Ce coup donne d’abord ${points(-bil.minBal)} de matériel, que la variante récupère ensuite : c’est un sacrifice dont le retour est vérifié.`);
      else if (eMoi > -50) V2.push(`Ce coup donne du matériel (${bil.gain}) sans le récupérer dans la variante, mais le moteur juge la position équivalente ou meilleure : la compensation n’est pas matérielle et dépend de la suite. Cette explication ne la détaille pas.`);
    }
    V2.push(...M.map(x => x.texte));
  }
  return { L, V: V2, M, bil, col, tien, m };
}
export function pourquoiMeilleur(fen, best, pv, eMoi, ctx = {}) { const d = detailMeilleur(fen, best, pv, eMoi, ctx); return d ? d.L.concat(d.V) : []; }

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

  if (bonne) {
    const d = detailMeilleur(fen, best, pvMeilleur, mien(eAvant), { finale: finaleCtx, voix });
    const meilleur = d ? d.L.concat(d.V).map(cap) : [];
    return { titre: `${m0.san} est le meilleur coup`, lignes: [], meilleur, san: m0.san, etapes: etapesDe({ voc: S, m0, bonne: true, d, eAvant: mien(eAvant), eApres: mien(eApres), lignes: [], statiques: d ? d.L.map(cap) : [], cause: null }) };
  }

  // 1. mat subi ou mat manqué
  if (mien(eApres) <= -9000) {
    const n = 10000 + mien(eApres), ligne = sanLigne(cApres.fen(), pvApres, 5);
    lignes.push(`Après ${m0.san}, ${S.adv} ${S.v('a', 'ont')} un mat forcé en ${n} coup${n > 1 ? 's' : ''}${ligne ? ` (${ligne})` : ''}.`);
    expliqueMat = true;
  } else if (mien(eAvant) >= 9000) {
    const n = 10000 - mien(eAvant);
    lignes.push(`Un mat en ${n} coup${n > 1 ? 's' : ''} existait avec ${sanDe(fen, best)}, et ${S.coup} le laisse passer.`);
  }

  // 2. conséquence matérielle sur la suite proposée par le moteur (rejouée et vérifiée)
  let perteMat = 0, premiereCapture = null, fourchette = null, suite = '', bilAdv = null, motifsAdv = [];
  if (pvApres && pvApres.length) {
    const c1 = new Chess(cApres.fen()); const avantMat = materiel(avant, col);
    const mvs = [];
    for (const u of pvApres.slice(0, 6)) { try { mvs.push(c1.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })); } catch { break; } }
    perteMat = materiel(c1, col) - avantMat;
    const idx = mvs.findIndex(m => m.color !== col && m.captured);
    if (idx >= 0) premiereCapture = { m: mvs[idx], avant: mvs.slice(0, idx) };
    // motifs de l'adversaire : seulement s'ils sont confirmés par la variante (et par un gain net pour lui)
    bilAdv = bilanVariante(cApres.fen(), pvApres, autre(col));
    if (bilAdv && !expliqueMat) motifsAdv = motifs(bilAdv, autre(col));
    fourchette = motifsAdv.find(x => x.type === 'fourchette') || null;
    suite = bilAdv ? numerote(cApres.fen(), bilAdv.S, Math.max(4, bilAdv.kc + 1)) : '';
  }
  const incertainPerte = !!(bilAdv && bilAdv.incertain);
  if (perteMat <= -1 && !expliqueMat) {
    if (fourchette) lignes.push(`Après ${m0.san} : ${fourchette.texte}`);
    else if (premiereCapture) {
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
    if (!fourchette && motifsAdv.length) lignes.push(...motifsAdv.map(x => x.texte));
    if (suite) lignes.push(`Suite probable : ${suite}. Ce n’est pas une suite obligatoire : l’adversaire peut jouer autre chose.`);
    lignes.push(incertainPerte
      ? `Bilan provisoire : environ ${points(-perteMat)} de matériel perdu${-perteMat > 1 ? 's' : ''} si cette suite se confirme (la variante s’arrête sur une capture qui peut être reprise ; pion 1, cavalier ou fou 3, tour 5, dame 9).`
      : `Bilan : environ ${points(-perteMat)} de matériel perdu${-perteMat > 1 ? 's' : ''} d’après cette variante (pion 1, cavalier ou fou 3, tour 5, dame 9).`);
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

  // meilleur coup : variante vérifiée (sert aussi à signaler un gain matériel manqué)
  const dB = best ? detailMeilleur(fen, best, pvMeilleur, mien(eAvant), { perteMat, joue: m0.san, finale: finaleCtx, voix }) : null;
  const gainManque = !!(dB && dB.bil && !dB.bil.incertain && dB.bil.nCaptures && dB.bil.gain >= 1 && perteMat > -1 && !expliqueMat);
  if (gainManque) lignes.push(`Avec ${sanDe(fen, best)}, une suite calculée rapporte +${dB.bil.gain} de matériel ; ${m0.san} laisse passer cette occasion.`);

  // 4. plan positionnel quand aucun matériel n'est en jeu
  if (perteMat > -2 && !expliqueMat && !gainManque) {
    const plyNum = (fen.split(' ')[5] | 0) * 2 - (col === 'w' ? 1 : 0);
    const rb = best ? essai(fen, best) : null;
    const apJ = suivreEchanges(cApres, pvApres, !!m0.captured), apB = rb ? suivreEchanges(rb.c, (pvMeilleur || []).slice(1), !!rb.m.captured) : null;
    const raisons = raisonsPositionnelles({ avant, apresJoue: apJ, apresMeilleur: apB, m0, mb: rb ? rb.m : null, col, plyNum, finale: finaleCtx, voc: S });
    const dv = developpement(avant, col);
    if (m0.piece === 'p' && /^[ah]$/.test(m0.to[0]) && plyNum <= 16 && dv.mineures > 0) raisons.unshift(`Ce coup de pion sur le bord de l’échiquier ne développe aucune pièce alors qu’il en reste ${dv.mineures} à sortir : en ouverture, développer est en général prioritaire.`);
    if (m0.piece === 'p' && ['f', 'g', 'h'].includes(m0.from[0]) && plyNum <= 20) {
      const roi = piecesDe(avant, col).find(p => p.type === 'k');
      if (roi && (dv.roiAuCentre || ['g', 'h'].includes(roi.sq[0]))) raisons.unshift(`Les pions f, g et h protègent ${S.roi} après le roque : les avancer ainsi peut l’affaiblir et ouvrir des lignes pour l’attaque adverse.`);
    }
    if (m0.piece === 'q' && plyNum <= 14) { const at = cApres.attackers(m0.to, autre(col)); if (at.length) raisons.push(`La dame en ${m0.to} est attaquée par ${un(cApres.get(at[0]).type)} adverse : ${S.adv} peut gagner du temps en la chassant.`); }
    if (m0.piece === 'n' && /^[ah]/.test(m0.to)) raisons.push('Un cavalier au bord de l’échiquier a en général moins de possibilités qu’au centre.');
    if (rb && rb.m.captured && !m0.captured) raisons.push(`Une bonne capture était possible : ${sanDe(fen, best)} prenait ${laLe(rb.m.captured)}.`);
    const gardees = raisons.slice(0, lignes.length ? 1 : 3);
    if (gardees.length) lignes.push(...gardees);
    else if (!lignes.length) lignes.push('Aucune pièce n’est perdue tout de suite, et la différence est subtile : le moteur juge simplement la position de l’adversaire un peu plus confortable après ce coup.');
  }

  const dEcart = Math.abs(mien(eApres) - mien(eAvant));
  const petit = dEcart < 30 && Math.abs(mien(eAvant)) < 9000 && Math.abs(mien(eApres)) < 9000;
  const lignePct = Math.abs(wAv - wAp) >= 1 ? `Estimation (un repère, pas une vraie probabilité de gagner) : en ${S.tu ? 'ta' : `la`} faveur${S.tu ? '' : ' ' + S.deCamp}, elle passe d’environ ${Math.round(wAv)} à ${Math.round(wAp)} sur 100.` : null;
  if (lignePct) lignes.push(lignePct);
  if (petit && !perteMat) lignes.push('L’écart est très faible : on ne peut pas conclure que l’un des deux coups est clairement meilleur.');
  const meilleur = dB ? dB.L.concat(dB.V).map(cap) : [];
  const cause = lignes.filter(l => l !== lignePct && !/^L’écart est très faible/.test(l));
  return { titre: `Pourquoi ${m0.san} est moins bon`, lignes, meilleur, san: best ? sanDe(fen, best) : null,
    etapes: etapesDe({ voc: S, m0, bonne: false, d: dB, best, fen, eAvant: mien(eAvant), eApres: mien(eApres), lignes, cause, lignePct, petit, perteMat, motifsAdv, statiques: dB ? dB.L.map(cap) : [] }) };
}

/* ---------- présentation en étapes (niveau 800–1000 Elo) : joué / manqué / pourquoi mieux / variante / résultat / leçon ----------
   Chaque étape n'est produite que si on a une information vérifiée ; sinon elle est omise (jamais de remplissage). */
function etapesDe({ voc, m0, bonne, d, best, fen, eAvant, eApres, lignes, cause, lignePct, petit, perteMat, motifsAdv, statiques }) {
  const E = [], tu = voc.tu;
  const joue = tu ? 'Tu as joué' : `${cap(voc.camp)} ont joué`;
  E.push({ t: tu ? 'Ce que tu as joué' : 'Le coup joué', x: [`${joue} ${m0.san}${m0.captured ? ` (il prend ${laLe(m0.captured)} en ${m0.to})` : ''}.`, ...(bonne ? ['C’est le coup que le moteur recommande.'] : [])] });
  if (!bonne && best) E.push({ t: tu ? 'Ce que tu as manqué' : 'Ce qui était mieux', x: [`Le moteur préférait ${sanDe(fen, best)}.`, ...(cause || []).slice(0, 3)] });
  const pourquoi = statiques || [];
  if (pourquoi.length) E.push({ t: 'Pourquoi c’est mieux', x: pourquoi.slice(0, 3) });
  if (d && d.V && d.V.length) E.push({ t: 'La suite vérifiée', x: d.V.map(cap) });
  else if (d && !d.bil) E.push({ t: 'La suite vérifiée', x: ['Le moteur n’a pas fourni de suite assez fiable pour la détailler ici : cette explication reste volontairement prudente.'] });
  const res = [];
  const bil = d && d.bil;
  if (bil && !bil.incertain && bil.nCaptures) res.push(bil.gain >= 1 ? `Matériel : +${bil.gain} à la fin des échanges de la variante.` : bil.gain === 0 ? 'Matériel : égal à la fin des échanges de la variante.' : `Matériel : ${bil.gain} à la fin des échanges de la variante.`);
  else if (!bonne && perteMat <= -1) res.push(`Matériel : environ ${-perteMat} point${-perteMat > 1 ? 's' : ''} perdu${-perteMat > 1 ? 's' : ''} avec ${m0.san}.`);
  if (lignePct) res.push(lignePct);
  if (petit && !perteMat) res.push('Écart très faible : ne pas en tirer de conclusion tranchée.');
  else if (Math.abs(eApres) < 30 && Math.abs(eAvant) < 30) res.push('Position proche de l’égalité selon le moteur : un avantage matériel ou positionnel n’est pas établi.');
  if (res.length) E.push({ t: 'Le résultat', x: res });
  const lecon = (d && d.M && d.M[0] && d.M[0].lecon) || (motifsAdv && motifsAdv[0] && motifsAdv[0].lecon) || null;
  if (lecon) E.push({ t: 'À retenir', x: [lecon] });
  return E;
}
