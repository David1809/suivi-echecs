/* Leçons du module Ouvertures : cartes « Comprendre » et questions « Reconnaître », chacune avec son échiquier annoté.
   Une annotation (case, flèche, affirmation) n'est jamais décorative : elle est vérifiée sur la position réelle avec chess.js
   (voir verifierCarte). Une idée par carte, trois flèches au plus. */
import { Chess } from 'chess.js';
import { sansDe } from './positions.js';
import { LECONS_PLUS } from './lecons-contenu.js';
import { QUESTIONS } from './lecons-questions.js';
import { TRANSFERTS } from './lecons-transferts.js';
import { objectifAtteint } from './exos-ouv.js';

export const positionDe = coups => { const c = new Chess(); for (const s of sansDe(coups)) c.move(s); return c; };
const cleDe = c => c.fen().split(' ').slice(0, 4).join(' ');

/* ---------- vérifications ---------- */
export const NOTIONS = ['idee', 'centre', 'pieces', 'plan', 'erreur', 'adaptation'];
export const ECARTS = ['ordre', 'reponse', 'echange', 'piece', 'structure', 'plan'];
const couleurEn = (c, sq) => { const p = c.get(sq); return p ? p.color : null; };
export function evaluerVerif(c, v) {
  switch (v.t) {
    case 'attaque': { const col = couleurEn(c, v.par); return !!col && c.attackers(v.sq, col).includes(v.par); }
    case 'defenseurs': { const col = couleurEn(c, v.sq); return !!col && c.attackers(v.sq, col).slice().sort().join() === v.liste.slice().sort().join(); }
    case 'nonDefendu': { const col = couleurEn(c, v.sq); return !!col && c.attackers(v.sq, col).length === 0; }
    case 'libre': return v.cases.every(s => !c.get(s));
    case 'coupLegal': return c.moves({ verbose: true }).some(m => m.from === v.de && m.to === v.vers);
    case 'piece': { const p = c.get(v.sq); return !!p && p.type === v.p && p.color === v.c; }
    case 'mobilite': { // nombre de coups possibles d'une pièce (en lui donnant le trait)
      const p = c.get(v.sq); if (!p) return false; const f = c.fen().split(' '); f[1] = p.color; f[3] = '-';
      try { return new Chess(f.join(' ')).moves({ square: v.sq }).length <= v.max; } catch { return false; }
    }
    case 'devel': { // pièces mineures qui ont quitté leur case de départ
      const dep = v.camp === 'w' ? ['b1', 'c1', 'f1', 'g1'] : ['b8', 'c8', 'f8', 'g8'];
      const n = c.board().flat().filter(p => p && p.color === v.camp && (p.type === 'n' || p.type === 'b')).filter(p => !dep.includes(p.square)).length;
      return n === v.n;
    }
    case 'nonAttaque': { const col = couleurEn(c, v.par); return !!col && !c.attackers(v.sq, col).includes(v.par); }
    case 'suite': { // après les coups indiqués, une autre vérification est vraie
      const x = new Chess(c.fen()); try { for (const m of v.coups.split(' ')) x.move(m); } catch { return false; } return evaluerVerif(x, v.v);
    }
    case 'transpose': return cleDe(c) === cleDe(positionDe(v.coups));
    case 'materiel': { // après la suite indiquée, le camp a au moins `min` points de matériel de plus
      const x = new Chess(c.fen()); try { for (const s of v.suite.split(' ')) x.move(s); } catch { return false; }
      const val = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }; let d = 0;
      for (const r of x.board()) for (const p of r) if (p) d += (p.color === v.camp ? 1 : -1) * val[p.type];
      return d >= v.min;
    }
    case 'mat': { const x = new Chess(c.fen()); try { for (const s of v.suite.split(' ')) x.move(s); } catch { return false; } return x.isCheckmate(); }
    default: return false;
  }
}
export function verifierFleche(c, f) {
  if (f.type === 'coup') return evaluerVerif(c, { t: 'coupLegal', de: f.de, vers: f.vers });
  const col = couleurEn(c, f.de); return !!col && c.attackers(f.vers, col).includes(f.de); // 'visee' (attaque) ou 'defense'
}
/* renvoie la liste des problèmes (vide si la carte est exacte) */
export function verifierCarte(carte) {
  const pb = [];
  let c; try { c = positionDe(carte.coups); } catch { return ['position illégale : ' + carte.coups]; }
  if ((carte.fleches || []).length > 3) pb.push('plus de 3 flèches');
  for (const f of carte.fleches || []) if (!verifierFleche(c, f)) pb.push(`flèche fausse : ${f.de}→${f.vers} (${f.type})`);
  for (const v of carte.verif || []) if (!evaluerVerif(c, v)) pb.push('affirmation fausse : ' + JSON.stringify(v));
  if (carte.reponse) { const ok = (carte.verif || []).length > 0; if (!ok) pb.push('question sans affirmation vérifiée'); }
  if (carte.q) { if (carte.q.bonne < 0 || carte.q.bonne >= carte.q.options.length) pb.push('bonne réponse hors liste'); if (carte.q.options.length !== 4) pb.push('la question doit avoir quatre propositions'); }
  if (!carte.notion || !NOTIONS.includes(carte.notion)) pb.push('notion absente ou inconnue : ' + carte.notion);
  for (const s of carte.strat || []) { try { positionDe(s.coups); } catch { pb.push('position de vérification illégale : ' + s.coups); } }
  return pb;
}

/* un exercice de transfert : position légale du même thème, différente des positions apprises (la différence est dite) */
export function verifierTransfert(t, cours, arbre, classerFiche) {
  const pb = [];
  let c; try { c = positionDe(t.coups); } catch { return ['position illégale : ' + t.coups]; }
  if (!ECARTS.includes(t.ecart)) pb.push('écart inconnu : ' + t.ecart);
  if (!t.contexte || !t.principe || !t.attendus || !t.attendus.length) pb.push('contexte, principe ou coups attendus manquants');
  if (!t.objectif || !t.objectif.length) pb.push('objectif pédagogique manquant');
  const legaux = c.moves();
  for (const s of t.attendus || []) {
    if (!legaux.includes(s)) { pb.push('coup attendu illégal : ' + s); continue; }
    try { if (t.objectif && objectifAtteint(c.fen(), s, t.objectif) !== true) pb.push('le coup attendu ' + s + ' n’atteint pas l’objectif'); } catch { pb.push('objectif invalide'); }
  }
  if (c.turn() !== (cours.co === 'blancs' ? 'w' : 'b')) pb.push('ce n’est pas à l’utilisateur de jouer');
  if ((t.cote || (cours.co === 'blancs' ? 'w' : 'b')) !== (cours.co === 'blancs' ? 'w' : 'b')) pb.push('échiquier orienté du mauvais côté');
  if (arbre && arbre.has(cleDe(c))) pb.push('position déjà apprise (présente dans les lignes de la fiche)');
  if (classerFiche && !classerFiche(t.coups, cours)) pb.push('la position n’appartient pas à la fiche (classement par position)');
  return pb;
}

/* ---------- contenu : Partie du fou (1.e4 e5 2.Bc4) ---------- */
const FOU = {
  cartes: [
    { id: 'fou-1', notion: 'idee', titre: 'Pourquoi 2.Bc4 ?', coups: 'e4 e5 Bc4', cote: 'w',
      texte: 'Le fou sort tout de suite sur la diagonale a2-g8 et vise f7. Au début de la partie, seul le roi noir défend ce pion : c’est le point faible de Noir.',
      cases: [{ sq: 'f7', role: 'cible' }], fleches: [{ de: 'c4', vers: 'f7', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'f7', par: 'c4' }, { t: 'defenseurs', sq: 'f7', liste: ['e8'] }] },
    { id: 'fou-2', notion: 'pieces', titre: 'Ce que Noir menace', coups: 'e4 e5 Bc4 Nf6', cote: 'w',
      strat: [{ t: 'bon', coups: 'e4 e5 Bc4 Nf6', san: 'd3', max: 3 }],
      texte: 'Le cavalier f6 attaque ton pion e4 et rien ne le défend. Il faut réagir tout de suite : d3, Cc3 ou De2 le défendent.',
      cases: [{ sq: 'e4', role: 'danger' }], fleches: [{ de: 'f6', vers: 'e4', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'e4', par: 'f6' }, { t: 'nonDefendu', sq: 'e4' }] },
    { id: 'fou-3', notion: 'centre', titre: '3.d3 : la réponse tranquille', coups: 'e4 e5 Bc4 Nf6 d3', cote: 'w',
      strat: [{ t: 'bon', coups: 'e4 e5 Bc4 Nf6', san: 'd3', max: 3 }],
      texte: 'Le pion d3 défend e4 et ouvre la diagonale du fou c1. Tu gardes le fou c4 en place et tu développes sans complication.',
      cases: [{ sq: 'e4', role: 'idee' }], fleches: [{ de: 'd3', vers: 'e4', type: 'defense', role: 'idee' }, { de: 'c1', vers: 'g5', type: 'visee', role: 'plan' }],
      verif: [{ t: 'defenseurs', sq: 'e4', liste: ['d3'] }, { t: 'libre', cases: ['d2', 'e3', 'f4', 'g5', 'h6'] }] },
    { id: 'fou-4', notion: 'adaptation', titre: 'Quand ...d5 attaque le fou', coups: 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5', cote: 'w',
      strat: [{ t: 'bon', coups: 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5', san: 'Bb3', max: 3 }],
      texte: 'Le pion d5 attaque ton fou c4. Retire-le en b3 : il reste sur la diagonale a2-g8 et continue de viser le centre. 5.exd5 est aussi possible.',
      cases: [{ sq: 'c4', role: 'danger' }], fleches: [{ de: 'd5', vers: 'c4', type: 'visee', role: 'danger' }, { de: 'c4', vers: 'b3', type: 'coup', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'c4', par: 'd5' }, { t: 'coupLegal', de: 'c4', vers: 'b3' }] },
    { id: 'fou-5', notion: 'plan', titre: 'Un plan : c3 prépare d4', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6 c3 O-O Re1 a6', cote: 'w',
      strat: [{ t: 'bon', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6 c3 O-O Re1 a6', san: 'd4', max: 3 }, { t: 'bon', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6 c3 O-O Re1 a6', san: 'Bb3', max: 1 }, { t: 'bon', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6 c3 O-O Re1 a6', san: 'Nbd2', max: 1 }],
      texte: 'Quand les pièces sont sorties et le roi à l’abri, c3 prépare l’avance d3-d4 pendant que la tour e1 soutient e4. Ce n’est pas urgent : Fb3 et Cbd2, qui finissent le développement, sont au moins aussi précis ; d4 reste un coup possible.',
      cases: [{ sq: 'd4', role: 'plan' }], fleches: [{ de: 'd3', vers: 'd4', type: 'coup', role: 'plan' }, { de: 'c3', vers: 'd4', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'd4', par: 'c3' }, { t: 'coupLegal', de: 'd3', vers: 'd4' }, { t: 'attaque', sq: 'e4', par: 'e1' }] },
    { id: 'fou-6', notion: 'erreur', titre: 'Une erreur à éviter : 3.f4?', coups: 'e4 e5 Bc4 Nf6 f4', cote: 'w',
      strat: [{ t: 'mauvais', coups: 'e4 e5 Bc4 Nf6', san: 'f4', min: 5 }],
      texte: 'f4 laisse e4 sans défense et ouvre la diagonale e1-h4 de ton roi : Noir prend le pion (…Cxe4) ou contre-attaque au centre (…d5) et obtient l’avantage.',
      cases: [{ sq: 'e4', role: 'danger' }], fleches: [{ de: 'f6', vers: 'e4', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'e4', par: 'f6' }, { t: 'nonDefendu', sq: 'e4' }, { t: 'libre', cases: ['f2', 'g3'] }] }
  ],
  reconnaitre: [
    { id: 'fou-r1', notion: 'pieces', coups: 'e4 e5 Bc4 Nf6', cote: 'w', question: 'Quel pion blanc est attaqué sans être défendu ? Touche sa case.', reponse: 'e4',
      explication: 'Le cavalier f6 attaque e4 et aucune pièce blanche ne le défend.', cases: [{ sq: 'e4', role: 'danger' }], fleches: [{ de: 'f6', vers: 'e4', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'e4', par: 'f6' }, { t: 'nonDefendu', sq: 'e4' }] },
    { id: 'fou-r2', notion: 'idee', coups: 'e4 e5 Bc4', cote: 'w', question: 'Quel pion noir le fou c4 attaque-t-il ? Touche-le.', reponse: 'f7',
      explication: 'La diagonale c4-f7 est libre et f7 n’est défendue que par le roi.', cases: [{ sq: 'f7', role: 'cible' }], fleches: [{ de: 'c4', vers: 'f7', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'f7', par: 'c4' }, { t: 'defenseurs', sq: 'f7', liste: ['e8'] }] },
    { id: 'fou-r3', notion: 'adaptation', coups: 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5', cote: 'w', question: 'Quelle pièce blanche est attaquée par un pion ? Touche-la.', reponse: 'c4',
      explication: 'Le pion d5 attaque le fou c4.', cases: [{ sq: 'c4', role: 'danger' }], fleches: [{ de: 'd5', vers: 'c4', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'c4', par: 'd5' }] },
    { id: 'fou-r4', notion: 'plan', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6 c3 O-O Re1 a6', cote: 'w', question: 'Sur quelle case le pion d3 va-t-il avancer, soutenu par c3 ? Touche-la.', reponse: 'd4',
      explication: 'c3 attaque d4 : le pion d3 peut y avancer avec un soutien.', cases: [{ sq: 'd4', role: 'plan' }], fleches: [{ de: 'd3', vers: 'd4', type: 'coup', role: 'plan' }],
      verif: [{ t: 'attaque', sq: 'd4', par: 'c3' }, { t: 'coupLegal', de: 'd3', vers: 'd4' }] },
    { id: 'fou-r5', notion: 'pieces', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O', cote: 'w', question: 'Quel pion blanc le fou noir c5 menace-t-il ? Touche-le.', reponse: 'f2',
      explication: 'Le fou c5 regarde vers f2 par la diagonale c5-f2 : elle est défendue par le roi et la tour.', cases: [{ sq: 'f2', role: 'cible' }], fleches: [{ de: 'c5', vers: 'f2', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'f2', par: 'c5' }] }
  ]
};
/* ---------- contenu : Contre 1.d4, la défense 1...d5 ---------- */
const D4D5 = {
  cartes: [
    { id: 'd4d5-1', notion: 'idee', titre: 'Pourquoi 1...d5 ?', coups: 'd4 d5', cote: 'b',
      strat: [{ t: 'bon', coups: 'd4', san: 'd5', max: 3 }],
      texte: 'Tu prends ta part du centre tout de suite : le pion d5 contrôle c4 et e4, deux cases que les Blancs voudraient occuper.',
      cases: [{ sq: 'c4', role: 'idee' }, { sq: 'e4', role: 'idee' }], fleches: [{ de: 'd5', vers: 'c4', type: 'visee', role: 'idee' }, { de: 'd5', vers: 'e4', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'c4', par: 'd5' }, { t: 'attaque', sq: 'e4', par: 'd5' }] },
    { id: 'd4d5-2', notion: 'centre', titre: 'Défendre le pion d5', coups: 'd4 d5 c4 e6', cote: 'b',
      strat: [{ t: 'bon', coups: 'd4 d5 c4', san: 'e6', max: 3 }],
      texte: 'Après 2.c4, ton pion d5 est attaqué. 2...e6 le défend simplement et ouvre la diagonale du fou f8.',
      cases: [{ sq: 'd5', role: 'idee' }], fleches: [{ de: 'c4', vers: 'd5', type: 'visee', role: 'danger' }, { de: 'e6', vers: 'd5', type: 'defense', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'd5', par: 'c4' }, { t: 'attaque', sq: 'd5', par: 'e6' }, { t: 'libre', cases: ['e7', 'd6', 'c5', 'b4', 'a3'] }] },
    { id: 'd4d5-3', notion: 'pieces', titre: 'Quand le fou g5 attaque le cavalier', coups: 'd4 d5 c4 e6 Nc3 Nf6 Bg5', cote: 'b',
      strat: [{ t: 'bon', coups: 'd4 d5 c4 e6 Nc3 Nf6 Bg5', san: 'Be7', max: 3 }],
      texte: 'Le fou g5 attaque ton cavalier f6, qui protège d5. ...Fe7 le défend et prépare le petit roque.',
      cases: [{ sq: 'f6', role: 'danger' }], fleches: [{ de: 'g5', vers: 'f6', type: 'visee', role: 'danger' }, { de: 'f8', vers: 'e7', type: 'coup', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'f6', par: 'g5' }, { t: 'coupLegal', de: 'f8', vers: 'e7' }] },
    { id: 'd4d5-4', notion: 'plan', titre: 'Libérer ta position avec ...c5', coups: 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5', cote: 'b',
      strat: [{ t: 'bon', coups: 'd4 d5 Nf3 Nf6 e3 e6 Bd3', san: 'c5', max: 3 }],
      texte: 'Quand tes pièces sont sorties, ...c5 attaque le pion d4 : tu contestes le centre blanc au lieu de rester passif.',
      cases: [{ sq: 'd4', role: 'cible' }], fleches: [{ de: 'c5', vers: 'd4', type: 'visee', role: 'plan' }],
      verif: [{ t: 'attaque', sq: 'd4', par: 'c5' }] },
    { id: 'd4d5-5', notion: 'adaptation', titre: 'Contre le fou f4 (système de Londres)', coups: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6', cote: 'b',
      strat: [{ t: 'bon', coups: 'd4 d5 Bf4 Nf6 e3 e6 Nf3', san: 'Bd6', max: 3 }],
      texte: 'Le fou d6 attaque le fou f4 et propose l’échange.',
      cases: [{ sq: 'f4', role: 'cible' }], fleches: [{ de: 'd6', vers: 'f4', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'f4', par: 'd6' }] },
    { id: 'd4d5-6', notion: 'erreur', titre: 'Ne laisse pas d5 sans réponse', coups: 'd4 d5 c4', cote: 'b',
      texte: '2.c4 attaque ton pion d5, que seule ta dame défend. Tu as trois bonnes réponses : le défendre avec ...e6 ou ...c6, ou le prendre avec ...dxc4 (gambit dame accepté : tu rendras le pion plus tard). N’ignore pas l’attaque avec un coup comme 2...f5?',
      cases: [{ sq: 'd5', role: 'danger' }], fleches: [{ de: 'c4', vers: 'd5', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'd5', par: 'c4' }, { t: 'defenseurs', sq: 'd5', liste: ['d8'] }],
      strat: [{ t: 'bon', coups: 'd4 d5 c4', san: 'e6', max: 3 }, { t: 'bon', coups: 'd4 d5 c4', san: 'c6', max: 3 }, { t: 'bon', coups: 'd4 d5 c4', san: 'dxc4', max: 3 }, { t: 'mauvais', coups: 'd4 d5 c4', san: 'f5', min: 6.75 }] }
  ],
  reconnaitre: [
    { id: 'd4d5-r1', notion: 'centre', coups: 'd4 d5 c4', cote: 'b', question: 'Quel pion noir est attaqué ? Touche sa case.', reponse: 'd5',
      explication: 'Le pion c4 attaque d5.', cases: [{ sq: 'd5', role: 'danger' }], fleches: [{ de: 'c4', vers: 'd5', type: 'visee', role: 'danger' }], verif: [{ t: 'attaque', sq: 'd5', par: 'c4' }] },
    { id: 'd4d5-r2', notion: 'pieces', coups: 'd4 d5 c4 e6 Nc3 Nf6 Bg5', cote: 'b', question: 'Quelle pièce noire le fou g5 attaque-t-il ? Touche-la.', reponse: 'f6',
      explication: 'Le fou g5 attaque le cavalier f6.', cases: [{ sq: 'f6', role: 'danger' }], fleches: [{ de: 'g5', vers: 'f6', type: 'visee', role: 'danger' }], verif: [{ t: 'attaque', sq: 'f6', par: 'g5' }] },
    { id: 'd4d5-r4', notion: 'plan', coups: 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5', cote: 'b', question: 'Quel pion blanc ton pion c5 attaque-t-il ? Touche-le.', reponse: 'd4',
      explication: 'Le pion c5 attaque d4 : c’est la rupture qui libère ta position.', cases: [{ sq: 'd4', role: 'cible' }], fleches: [{ de: 'c5', vers: 'd4', type: 'visee', role: 'plan' }], verif: [{ t: 'attaque', sq: 'd4', par: 'c5' }] },
    { id: 'd4d5-r3', notion: 'adaptation', coups: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6', cote: 'b', question: 'Quelle pièce blanche le fou d6 attaque-t-il ? Touche-la.', reponse: 'f4',
      explication: 'La diagonale d6-f4 est libre : le fou d6 attaque le fou f4.', cases: [{ sq: 'f4', role: 'cible' }], fleches: [{ de: 'd6', vers: 'f4', type: 'visee', role: 'idee' }], verif: [{ t: 'attaque', sq: 'f4', par: 'd6' }] }
  ]
};
/* Les questions de compréhension et les exercices de transfert sont dans leurs propres fichiers (lecons-questions.js, lecons-transferts.js) :
   les cartes ne portent que l'échiquier, l'annotation et l'explication ; la question est posée avant l'explication. */
const BRUT = { fou: FOU, 'd4-d5': D4D5, ...LECONS_PLUS };
export const LECONS = Object.fromEntries(Object.entries(BRUT).map(([id, L]) => [id, { ...L,
  cartes: L.cartes.map(c => ({ ...c, q: QUESTIONS[c.id] })), transferts: TRANSFERTS[id] || [] }]));

/* leçon d'une fiche : toujours une leçon rédigée (cartes, lecture de position, exercices de transfert) */
export function cartesDe(cours) {
  const L = LECONS[cours.id];
  if (!L) throw new Error('Aucune leçon pour la fiche ' + cours.id);
  return { riche: true, cartes: L.cartes, reconnaitre: L.reconnaitre, transferts: L.transferts || [] };
}
