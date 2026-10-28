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
function foursMauvais(c, col) {
  const ps = pionsDe(c, col);
  return piecesDe(c, col).filter(p => p.type === 'b').filter(b => ps.filter(p => caseCouleur(p.sq) === caseCouleur(b.sq)).length >= 5 - 0).map(b => b.sq);
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
function raisonsPositionnelles({ avant, apresJoue, apresMeilleur, m0, mb, col, plyNum, finale }) {
  const O = autre(col), R = []; // R : { poids, texte }
  const ajoute = (poids, texte) => R.push({ poids, texte });
  const S = m0.san, B = mb ? mb.san : null;

  // structure de pions
  const dblAv = pionsDoubles(avant, col), dblJ = pionsDoubles(apresJoue, col);
  const nouveauxDbl = dblJ.filter(f => !dblAv.includes(f));
  if (nouveauxDbl.length) ajoute(1.0, `Avec ${S}, tu doubles tes pions sur la colonne ${nouveauxDbl[0]} : deux pions sur la même colonne se protègent mal et sont plus faciles à attaquer.`);
  const isoAv = pionsIsoles(avant, col), isoJ = pionsIsoles(apresJoue, col);
  const nouveauxIso = isoJ.filter(sq => !isoAv.includes(sq) && sq !== m0.to).concat(isoJ.includes(m0.to) && !isoAv.includes(m0.from) ? [m0.to] : []);
  if (nouveauxIso.length) ajoute(0.9, `Ton pion en ${nouveauxIso[0]} se retrouve isolé : plus aucun pion voisin ne peut le défendre, il sera une cible durable.`);
  const pasAv = pionsPasses(avant, O), pasJ = pionsPasses(apresJoue, O);
  const nouveauPasse = pasJ.filter(sq => !pasAv.includes(sq));
  if (nouveauPasse.length) ajoute(1.4, `Après ${S}, l’adversaire obtient un pion passé en ${nouveauPasse[0]} : plus aucun de tes pions ne peut l’arrêter en chemin, c’est un atout durable pour lui.`);
  if (apresMeilleur) {
    const pasB = pionsPasses(apresMeilleur, col), pasJm = pionsPasses(apresJoue, col);
    const gagne = pasB.filter(sq => !pasJm.includes(sq));
    if (gagne.length) ajoute(1.3, `Avec ${B}, tu obtenais un pion passé en ${gagne[0]} : un pion qu’aucun pion adverse ne peut plus arrêter.`);
  }

  // activité des pièces
  const mAv = mobilite(avant, col), mJ = mobilite(apresJoue, col), mB = apresMeilleur ? mobilite(apresMeilleur, col) : null;
  if (mAv && mJ) {
    const moved = mJ.par[m0.to];
    const before = mAv.par[m0.from];
    if (moved && before && moved.n + 3 <= before.n) ajoute(0.9, `${cap(laLe(m0.piece))} contrôlait ${before.n} cases en ${m0.from} et n’en contrôle plus que ${moved.n} en ${m0.to} : ${il(m0.piece)} devient moins actif${fe(m0.piece)}.`);
    const perdues = Object.entries(mAv.par).filter(([sq, v]) => sq !== m0.from && (mJ.par[sq] ? mJ.par[sq].n + 3 <= v.n : false));
    if (perdues.length) { const [sq, v] = perdues[0]; ajoute(0.8, `${cap(laLe(v.type))} en ${sq} perd de la liberté (${v.n} cases puis ${mJ.par[sq].n}) : ton coup ${FEM[v.type] ? 'lui' : 'lui'} ferme des cases.`); }
    if (mB && mB.total - mJ.total >= 4) ajoute(0.6 + Math.min(0.6, (mB.total - mJ.total) / 20), `Avec ${B}, tes pièces contrôlent plus de cases (${mB.total} au lieu de ${mJ.total}) : elles sont plus actives.`);
  }
  const mOAv = mobilite(avant, O), mOJ = mobilite(apresJoue, O);
  if (mOAv && mOJ && mOJ.total - mOAv.total >= 5) ajoute(0.6, `Après ${S}, les pièces de l’adversaire gagnent de la liberté (${mOAv.total} cases puis ${mOJ.total}).`);

  // colonnes ouvertes, avant-postes, fous
  if (apresMeilleur) {
    const tB = toursActives(apresMeilleur, col), tJ = toursActives(apresJoue, col);
    const nouv = tB.filter(sq => !tJ.includes(sq));
    if (nouv.length) ajoute(0.9, `Avec ${B}, ta tour se place sur la colonne ${nouv[0][0]}, ${colonneOuverte(apresMeilleur, nouv[0][0], col) === 'ouverte' ? 'une colonne ouverte' : 'une colonne sans pion à toi'} : c’est là que les tours sont les plus efficaces.`);
    const aB = avantPostes(apresMeilleur, col), aJ = avantPostes(apresJoue, col);
    const nouvA = aB.filter(sq => !aJ.includes(sq));
    if (nouvA.length) ajoute(1.0, `Avec ${B}, tu installes un cavalier en ${nouvA[0]} : il est protégé par un pion et aucun pion adverse ne peut le chasser, c’est une très bonne case.`);
    const fB = foursMauvais(apresMeilleur, col).length, fJ = foursMauvais(apresJoue, col).length;
    if (fJ > fB) ajoute(0.5, 'Ton fou reste enfermé derrière tes propres pions (« mauvais fou ») : le meilleur coup l’aurait libéré.');
  }
  const aAv = avantPostes(avant, O), aJo = avantPostes(apresJoue, O);
  if (aJo.length > aAv.length) ajoute(1.0, `Après ${S}, l’adversaire peut installer un cavalier en ${aJo.find(sq => !aAv.includes(sq))} sans que tu puisses le chasser avec un pion.`);

  // roi
  const abAv = abriRoi(avant, col), abJ = abriRoi(apresJoue, col);
  if (abAv != null && abJ != null && abJ < abAv) ajoute(1.1, `Avec ${S}, tu retires un pion de devant ton roi (il y en avait ${abAv}, il n’en reste que ${abJ}) : les cases laissées libres deviennent des portes d’entrée pour l’attaque adverse.`);
  const dvAv = developpement(avant, col), dvJ = developpement(apresJoue, col), dvB = apresMeilleur ? developpement(apresMeilleur, col) : null;
  if (plyNum <= 24 && dvB) {
    if (dvB.mineures < dvJ.mineures) ajoute(0.9, `Il te reste ${dvJ.mineures} pièce${dvJ.mineures > 1 ? 's' : ''} à développer : avec ${B}, tu en sortais une, alors que ${S} ne le fait pas. En ouverture, chaque coup devrait mettre une pièce en jeu.`);
    if (dvB.roiAuCentre === false && dvJ.roiAuCentre) ajoute(0.9, `Avec ${B}, ton roi se met à l’abri par le roque, ce que ${S} retarde : un roi resté au centre est vulnérable quand les lignes s’ouvrent.`);
  }
  // centre
  const ctr = c => controleCentre(c, col);
  if (apresMeilleur && ctr(apresMeilleur) - ctr(apresJoue) >= 2) ajoute(0.5, `Avec ${B}, tu aurais plus de contrôle sur les cases centrales (d4, e4, d5, e5).`);
  else if (m0.piece !== 'k' && ctr(avant) - ctr(apresJoue) >= 2) ajoute(0.5, 'Ton coup réduit ton contrôle des cases centrales (d4, e4, d5, e5), ce qui donne plus de place à l’adversaire.');
  // roi en finale
  if (finale && mb && mb.piece === 'k') ajoute(0.8, 'En finale, le roi est une pièce active : le meilleur coup le rapproche de l’action (centre, pions adverses ou ses propres pions).');
  if (finale && m0.piece === 'k' && mb && mb.piece === 'k' && m0.to !== mb.to) ajoute(0.6, `Ton roi va en ${m0.to} alors que ${B} le plaçait mieux pour la suite.`);

  return R.sort((a, b) => b.poids - a.poids).map(x => x.texte);
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
  if (!m.captured && !cibs.length) {
    const vises = piecesDe(c, autre(col)).filter(p => p.type !== 'k' && c.attackers(p.sq, col).includes(m.to));
    const libres = vises.filter(p => !c.attackers(p.sq, autre(col)).length);
    if (libres.length) L.push(`depuis ${m.to}, ${laLe(m.piece)} attaque ${libres.slice(0, 2).map(p => un(p.type) + ' en ' + p.sq).join(' et ')} sans défense.`);
    else if (vises.length) L.push(`depuis ${m.to}, ${laLe(m.piece)} met la pression sur ${vises.slice(0, 2).map(p => un(p.type) + ' en ' + p.sq).join(' et ')}.`);
  }
  const protegees = piecesDe(c, col).filter(p => p.type !== 'k' && p.sq !== m.to && c.attackers(p.sq, autre(col)).length && c.attackers(p.sq, col).includes(m.to) && !avant.attackers(p.sq, col).length);
  if (protegees.length) L.push(`il protège ${un(protegees[0].type)} en ${protegees[0].sq}, qui était menacé${fe(protegees[0].type)}.`);
  const mAv = mobilite(avant, col), mAp = mobilite(c, col);
  if (mAv && mAp && mAp.total - mAv.total >= 3 && !m.captured) L.push(`il libère tes pièces : elles contrôlent ${mAp.total - mAv.total} cases de plus qu’avant.`);
  if (m.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(m.to)) L.push('il occupe le centre avec un pion, ce qui donne de la place à tes pièces.');
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
    const c1 = new Chess(cApres.fen()); const avantMat = materiel(avant, col);
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
  if (perteMat <= -1 && !expliqueMat) {
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
    lignes.push(`Bilan : environ ${points(-perteMat)} de matériel perdu${-perteMat > 1 ? 's' : ''} au total (pion 1, cavalier ou fou 3, tour 5, dame 9).`);
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

  // 4. plan positionnel quand aucun matériel n'est en jeu
  if (perteMat > -2 && !expliqueMat) {
    const plyNum = (fen.split(' ')[5] | 0) * 2 - (col === 'w' ? 1 : 0);
    const rb = best ? essai(fen, best) : null;
    const apJ = suivreEchanges(cApres, pvApres, !!m0.captured), apB = rb ? suivreEchanges(rb.c, (pvMeilleur || []).slice(1), !!rb.m.captured) : null;
    const raisons = raisonsPositionnelles({ avant, apresJoue: apJ, apresMeilleur: apB, m0, mb: rb ? rb.m : null, col, plyNum, finale: finaleCtx });
    const dv = developpement(avant, col);
    if (m0.piece === 'p' && /^[ah]$/.test(m0.to[0]) && plyNum <= 16 && dv.mineures > 0) raisons.unshift(`Ce coup de pion sur le bord de l’échiquier ne développe aucune pièce alors qu’il t’en reste ${dv.mineures} à sortir : en ouverture, mieux vaut occuper le centre et développer.`);
    if (m0.piece === 'p' && ['f', 'g', 'h'].includes(m0.from[0]) && plyNum <= 20) {
      const roi = piecesDe(avant, col).find(p => p.type === 'k');
      if (roi && (dv.roiAuCentre || ['g', 'h'].includes(roi.sq[0]))) raisons.unshift(`Les pions f, g et h protègent ton roi après le roque : les avancer ainsi l’affaiblit et ouvre des lignes pour l’attaque adverse.`.replace('ton roi', col === 'w' || true ? 'ton roi' : 'ton roi'));
    }
    if (m0.piece === 'q' && plyNum <= 14) raisons.push('Sortir la dame trop tôt l’expose aux attaques : l’adversaire gagne du temps en la chassant.');
    if (m0.piece === 'n' && /^[ah]/.test(m0.to)) raisons.push('Un cavalier au bord de l’échiquier contrôle moins de cases et devient peu utile.');
    if (rb && rb.m.captured && !m0.captured) raisons.push(`Une bonne capture était possible : ${sanDe(fen, best)} prenait ${laLe(rb.m.captured)}.`);
    const gardees = raisons.slice(0, lignes.length ? 1 : 3);
    if (gardees.length) lignes.push(...gardees);
    else if (!lignes.length) lignes.push('Aucune pièce n’est perdue tout de suite, et la différence est subtile : le moteur juge simplement la position de l’adversaire un peu plus confortable après ce coup.');
  }

  if (Math.abs(wAv - wAp) >= 1) lignes.push(`${S.chances} passent d’environ ${Math.round(wAv)} % à ${Math.round(wAp)} %.`);
  const meilleur = best ? pourquoiMeilleur(fen, best, pvMeilleur, mien(eAvant), { perteMat, joue: m0.san, finale: finaleCtx }).map(cap) : [];
  return { titre: `Pourquoi ${m0.san} est moins bon`, lignes, meilleur, san: best ? sanDe(fen, best) : null };
}
