/* Leçons du module Ouvertures : cartes « Comprendre » et questions « Reconnaître », chacune avec son échiquier annoté.
   Une annotation (case, flèche, affirmation) n'est jamais décorative : elle est vérifiée sur la position réelle avec chess.js
   (voir verifierCarte). Une idée par carte, trois flèches au plus. */
import { Chess } from 'chess.js';
import { sansDe } from './positions.js';

export const positionDe = coups => { const c = new Chess(); for (const s of sansDe(coups)) c.move(s); return c; };

/* ---------- vérifications ---------- */
const couleurEn = (c, sq) => { const p = c.get(sq); return p ? p.color : null; };
export function evaluerVerif(c, v) {
  switch (v.t) {
    case 'attaque': { const col = couleurEn(c, v.par); return !!col && c.attackers(v.sq, col).includes(v.par); }
    case 'defenseurs': { const col = couleurEn(c, v.sq); return !!col && c.attackers(v.sq, col).slice().sort().join() === v.liste.slice().sort().join(); }
    case 'nonDefendu': { const col = couleurEn(c, v.sq); return !!col && c.attackers(v.sq, col).length === 0; }
    case 'libre': return v.cases.every(s => !c.get(s));
    case 'coupLegal': return c.moves({ verbose: true }).some(m => m.from === v.de && m.to === v.vers);
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
  if (carte.q) { if (carte.q.bonne < 0 || carte.q.bonne >= carte.q.options.length) pb.push('bonne réponse hors liste'); }
  return pb;
}

/* ---------- contenu : Partie du fou (1.e4 e5 2.Bc4) ---------- */
const FOU = {
  cartes: [
    { id: 'fou-1', titre: 'Pourquoi 2.Bc4 ?', coups: 'e4 e5 Bc4', cote: 'w',
      texte: 'Le fou sort tout de suite sur la diagonale a2-g8 et vise f7. Au début de la partie, seul le roi noir défend ce pion : c’est le point faible de Noir.',
      cases: [{ sq: 'f7', role: 'cible' }], fleches: [{ de: 'c4', vers: 'f7', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'f7', par: 'c4' }, { t: 'defenseurs', sq: 'f7', liste: ['e8'] }],
      q: { question: 'Quelle case faible de Noir le fou menace-t-il ?', options: ['f7, défendue seulement par le roi', 'a7', 'h7'], bonne: 0, explication: 'La diagonale c4-f7 est libre, et seul le roi e8 défend f7.' } },
    { id: 'fou-2', titre: 'Ce que Noir menace', coups: 'e4 e5 Bc4 Nf6', cote: 'w',
      texte: 'Le cavalier f6 attaque ton pion e4 et rien ne le défend. Il faut réagir tout de suite : d3, Cc3 ou De2 le défendent.',
      cases: [{ sq: 'e4', role: 'danger' }], fleches: [{ de: 'f6', vers: 'e4', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'e4', par: 'f6' }, { t: 'nonDefendu', sq: 'e4' }],
      q: { question: 'Que faut-il faire ?', options: ['Défendre le pion e4, par exemple avec d3', 'Laisser faire : e4 ne vaut pas grand-chose', 'Jouer f4 tout de suite'], bonne: 0, explication: 'e4 est attaqué sans défense. 3.f4? laisse la situation inchangée et Noir devient nettement mieux.' } },
    { id: 'fou-3', titre: '3.d3 : la réponse tranquille', coups: 'e4 e5 Bc4 Nf6 d3', cote: 'w',
      texte: 'Le pion d3 défend e4 et ouvre la diagonale du fou c1. Tu gardes le fou c4 en place et tu développes sans complication.',
      cases: [{ sq: 'e4', role: 'idee' }], fleches: [{ de: 'd3', vers: 'e4', type: 'defense', role: 'idee' }, { de: 'c1', vers: 'g5', type: 'visee', role: 'plan' }],
      verif: [{ t: 'defenseurs', sq: 'e4', liste: ['d3'] }, { t: 'libre', cases: ['d2', 'e3', 'f4', 'g5', 'h6'] }],
      q: { question: 'Quelle pièce le coup d3 libère-t-il ?', options: ['Le fou c1', 'La tour h1', 'Le cavalier b8'], bonne: 0, explication: 'Le pion quitte d2 : la diagonale du fou c1 vers h6 est ouverte.' } },
    { id: 'fou-4', titre: 'Quand ...d5 attaque le fou', coups: 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5', cote: 'w',
      texte: 'Le pion d5 attaque ton fou c4. Retire-le en b3 : il reste sur la diagonale a2-g8 et continue de viser le centre. 5.exd5 est aussi possible.',
      cases: [{ sq: 'c4', role: 'danger' }], fleches: [{ de: 'd5', vers: 'c4', type: 'visee', role: 'danger' }, { de: 'c4', vers: 'b3', type: 'coup', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'c4', par: 'd5' }, { t: 'coupLegal', de: 'c4', vers: 'b3' }],
      q: { question: 'Où retirer le fou attaqué par ...d5 ?', options: ['En b3, sur la même diagonale', 'En b5, près du roi noir', 'En a6'], bonne: 0, explication: 'b5 et a6 sont attaquées par les pions c6 et b7 ; b3 est sûre et garde la diagonale.' } },
    { id: 'fou-5', titre: 'Le plan : préparer d4', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6 c3 O-O Re1 a6', cote: 'w',
      texte: 'Quand les pièces sont sorties et le roi à l’abri, c3 prépare l’avance d3-d4 : le pion prend le centre, soutenu par c3, pendant que la tour e1 soutient e4.',
      cases: [{ sq: 'd4', role: 'plan' }], fleches: [{ de: 'd3', vers: 'd4', type: 'coup', role: 'plan' }, { de: 'c3', vers: 'd4', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'd4', par: 'c3' }, { t: 'coupLegal', de: 'd3', vers: 'd4' }, { t: 'attaque', sq: 'e4', par: 'e1' }],
      q: { question: 'Quel coup de pion prépare c3 ?', options: ['d4', 'b4', 'h3'], bonne: 0, explication: 'c3 attaque d4 : le pion qui avance en d4 est soutenu.' } },
    { id: 'fou-6', titre: 'Une erreur à éviter : 3.f4?', coups: 'e4 e5 Bc4 Nf6 f4', cote: 'w',
      texte: 'f4 laisse e4 sans défense et ouvre la diagonale e1-h4 de ton roi : Noir prend ou contre-attaque au centre et devient nettement mieux.',
      cases: [{ sq: 'e4', role: 'danger' }], fleches: [{ de: 'f6', vers: 'e4', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'e4', par: 'f6' }, { t: 'nonDefendu', sq: 'e4' }, { t: 'libre', cases: ['f2', 'g3'] }],
      q: { question: 'Pourquoi 3.f4? est-il une erreur ?', options: ['e4 reste attaqué et sans défense', 'Le fou c4 est perdu', 'Le roi blanc est en échec'], bonne: 0, explication: 'Le pion f4 ne défend pas e4, et il affaiblit la diagonale du roi.' } }
  ],
  reconnaitre: [
    { id: 'fou-r1', coups: 'e4 e5 Bc4 Nf6', cote: 'w', question: 'Quel pion blanc est attaqué sans être défendu ? Touche sa case.', reponse: 'e4',
      explication: 'Le cavalier f6 attaque e4 et aucune pièce blanche ne le défend.', cases: [{ sq: 'e4', role: 'danger' }], fleches: [{ de: 'f6', vers: 'e4', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'e4', par: 'f6' }, { t: 'nonDefendu', sq: 'e4' }] },
    { id: 'fou-r2', coups: 'e4 e5 Bc4', cote: 'w', question: 'Quelle case noire est la cible du fou c4 ? Touche-la.', reponse: 'f7',
      explication: 'La diagonale c4-f7 est libre et f7 n’est défendue que par le roi.', cases: [{ sq: 'f7', role: 'cible' }], fleches: [{ de: 'c4', vers: 'f7', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'f7', par: 'c4' }, { t: 'defenseurs', sq: 'f7', liste: ['e8'] }] },
    { id: 'fou-r3', coups: 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5', cote: 'w', question: 'Quelle pièce blanche est attaquée par un pion ? Touche-la.', reponse: 'c4',
      explication: 'Le pion d5 attaque le fou c4.', cases: [{ sq: 'c4', role: 'danger' }], fleches: [{ de: 'd5', vers: 'c4', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'c4', par: 'd5' }] },
    { id: 'fou-r4', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6 c3 O-O Re1 a6', cote: 'w', question: 'Sur quelle case le pion d3 va-t-il avancer, soutenu par c3 ? Touche-la.', reponse: 'd4',
      explication: 'c3 attaque d4 : le pion d3 peut y avancer avec un soutien.', cases: [{ sq: 'd4', role: 'plan' }], fleches: [{ de: 'd3', vers: 'd4', type: 'coup', role: 'plan' }],
      verif: [{ t: 'attaque', sq: 'd4', par: 'c3' }, { t: 'coupLegal', de: 'd3', vers: 'd4' }] },
    { id: 'fou-r5', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O', cote: 'w', question: 'Quelle case de ton camp le fou noir c5 vise-t-il ? Touche-la.', reponse: 'f2',
      explication: 'Le fou c5 regarde vers f2 par la diagonale c5-f2 : elle est défendue par le roi et la tour.', cases: [{ sq: 'f2', role: 'cible' }], fleches: [{ de: 'c5', vers: 'f2', type: 'visee', role: 'danger' }],
      verif: [{ t: 'attaque', sq: 'f2', par: 'c5' }] }
  ]
};
/* ---------- contenu : Contre 1.d4, la défense 1...d5 ---------- */
const D4D5 = {
  cartes: [
    { id: 'd4d5-1', titre: 'Pourquoi 1...d5 ?', coups: 'd4 d5', cote: 'b',
      texte: 'Tu prends ta part du centre tout de suite : le pion d5 contrôle c4 et e4, deux cases que les Blancs voudraient occuper.',
      cases: [{ sq: 'c4', role: 'idee' }, { sq: 'e4', role: 'idee' }], fleches: [{ de: 'd5', vers: 'c4', type: 'visee', role: 'idee' }, { de: 'd5', vers: 'e4', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'c4', par: 'd5' }, { t: 'attaque', sq: 'e4', par: 'd5' }],
      q: { question: 'Quelles cases le pion d5 contrôle-t-il ?', options: ['c4 et e4', 'c5 et e5', 'd4 et d6'], bonne: 0, explication: 'Un pion noir attaque les deux cases diagonales devant lui : c4 et e4.' } },
    { id: 'd4d5-2', titre: 'Défendre le pion d5', coups: 'd4 d5 c4 e6', cote: 'b',
      texte: 'Après 2.c4, ton pion d5 est attaqué. 2...e6 le défend simplement et ouvre la diagonale du fou f8.',
      cases: [{ sq: 'd5', role: 'idee' }], fleches: [{ de: 'c4', vers: 'd5', type: 'visee', role: 'danger' }, { de: 'e6', vers: 'd5', type: 'defense', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'd5', par: 'c4' }, { t: 'attaque', sq: 'd5', par: 'e6' }, { t: 'libre', cases: ['e7', 'd6', 'c5', 'b4', 'a3'] }],
      q: { question: 'Comment défendre d5 simplement après 2.c4 ?', options: ['...e6', '...a6', '...h6'], bonne: 0, explication: 'Le pion e6 défend d5 et libère le fou f8.' } },
    { id: 'd4d5-3', titre: 'Quand le fou g5 attaque le cavalier', coups: 'd4 d5 c4 e6 Nc3 Nf6 Bg5', cote: 'b',
      texte: 'Le fou g5 attaque ton cavalier f6, qui protège d5. ...Fe7 le défend et prépare le petit roque.',
      cases: [{ sq: 'f6', role: 'danger' }], fleches: [{ de: 'g5', vers: 'f6', type: 'visee', role: 'danger' }, { de: 'f8', vers: 'e7', type: 'coup', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'f6', par: 'g5' }, { t: 'coupLegal', de: 'f8', vers: 'e7' }],
      q: { question: 'Quel coup défend le cavalier f6 et prépare le roque ?', options: ['...Fe7', '...a6', '...Cc6'], bonne: 0, explication: 'Le fou e7 défend f6 ; il ne reste plus qu’à roquer.' } },
    { id: 'd4d5-4', titre: 'Libérer ta position avec ...c5', coups: 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5', cote: 'b',
      texte: 'Quand tes pièces sont sorties, ...c5 attaque le pion d4 : tu contestes le centre blanc au lieu de rester passif.',
      cases: [{ sq: 'd4', role: 'cible' }], fleches: [{ de: 'c5', vers: 'd4', type: 'visee', role: 'plan' }],
      verif: [{ t: 'attaque', sq: 'd4', par: 'c5' }],
      q: { question: 'Quel pion attaque le centre blanc après ...c5 ?', options: ['Le pion d4 est attaqué', 'Le pion e3 est attaqué', 'Le fou d3 est attaqué'], bonne: 0, explication: 'Le pion c5 attaque d4 ; e3 et le fou d3 ne sont pas visés.' } },
    { id: 'd4d5-5', titre: 'Contre le fou f4 (système de Londres)', coups: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6', cote: 'b',
      texte: 'Le fou d6 attaque le fou f4 et propose l’échange.',
      cases: [{ sq: 'f4', role: 'cible' }], fleches: [{ de: 'd6', vers: 'f4', type: 'visee', role: 'idee' }],
      verif: [{ t: 'attaque', sq: 'f4', par: 'd6' }],
      q: { question: 'Que fait le fou d6 ?', options: ['Il attaque le fou f4 et propose l’échange', 'Il attaque le roi blanc', 'Il défend d5'], bonne: 0, explication: 'La diagonale d6-f4 est libre : le fou d6 attaque f4.' } }
  ],
  reconnaitre: [
    { id: 'd4d5-r1', coups: 'd4 d5 c4', cote: 'b', question: 'Quel pion noir est attaqué ? Touche sa case.', reponse: 'd5',
      explication: 'Le pion c4 attaque d5.', cases: [{ sq: 'd5', role: 'danger' }], fleches: [{ de: 'c4', vers: 'd5', type: 'visee', role: 'danger' }], verif: [{ t: 'attaque', sq: 'd5', par: 'c4' }] },
    { id: 'd4d5-r2', coups: 'd4 d5 c4 e6 Nc3 Nf6 Bg5', cote: 'b', question: 'Quelle pièce noire le fou g5 attaque-t-il ? Touche-la.', reponse: 'f6',
      explication: 'Le fou g5 attaque le cavalier f6.', cases: [{ sq: 'f6', role: 'danger' }], fleches: [{ de: 'g5', vers: 'f6', type: 'visee', role: 'danger' }], verif: [{ t: 'attaque', sq: 'f6', par: 'g5' }] },
    { id: 'd4d5-r3', coups: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6', cote: 'b', question: 'Quelle pièce blanche le fou d6 attaque-t-il ? Touche-la.', reponse: 'f4',
      explication: 'La diagonale d6-f4 est libre : le fou d6 attaque le fou f4.', cases: [{ sq: 'f4', role: 'cible' }], fleches: [{ de: 'd6', vers: 'f4', type: 'visee', role: 'idee' }], verif: [{ t: 'attaque', sq: 'f4', par: 'd6' }] }
  ]
};
export const LECONS = { fou: FOU, 'd4-d5': D4D5 };

/* cartes d'une fiche : leçon rédigée si elle existe, sinon cartes tirées de la fiche (idée, objectifs, plans) sur l'échiquier de départ */
export function cartesDe(cours) {
  if (LECONS[cours.id]) return { riche: true, cartes: LECONS[cours.id].cartes, reconnaitre: LECONS[cours.id].reconnaitre };
  const moi = cours.co === 'blancs' ? 'w' : 'b', coups = cours.debut;
  const cartes = [{ id: cours.id + '-idee', titre: 'L’idée de l’ouverture', texte: cours.idee, coups, cote: moi }];
  if (cours.objectifs && cours.objectifs.length) cartes.push({ id: cours.id + '-obj', titre: 'Ce que tu cherches', texte: cours.objectifs.join(' '), coups, cote: moi });
  (cours.plans || []).forEach((pl, k) => cartes.push(typeof pl === 'string'
    ? { id: cours.id + '-plan' + k, titre: 'Plan ' + (k + 1), texte: pl, coups, cote: moi }
    : { id: cours.id + '-plan' + k, titre: pl.t, texte: [pl.obj, pl.pq, pl.cond && ('Quand : ' + pl.cond), pl.ev && ('À éviter : ' + pl.ev)].filter(Boolean).join(' '), coups, cote: moi }));
  if (cours.erreurs && cours.erreurs.length) cartes.push({ id: cours.id + '-err', titre: 'Erreurs fréquentes', texte: cours.erreurs.join(' '), coups, cote: moi });
  return { riche: false, cartes, reconnaitre: [] };
}
