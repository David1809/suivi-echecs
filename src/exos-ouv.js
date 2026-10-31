/* Exercices et progression du module Ouvertures : arbre des lignes d'une fiche, classement d'un coup, adversaire varié,
   révisions espacées et compétences. Fonctions pures, testables sans navigateur (la valeur du moteur est fournie par l'appelant). */
import { Chess } from 'chess.js';
import { sansDe } from './positions.js';

/* ---------- classement d'un coup (perte de chances de gagner, en points) ---------- */
export const SEUIL_ALTERNATIF = 3; // repère : écart très faible avec le meilleur coup
export const COEF_NIVEAU = 1.35; // niveau d'environ 1000 Elo, comme l'analyse des parties
export function classerCoup(perte, estMeilleur, k = COEF_NIVEAU) {
  if (estMeilleur || perte <= 1) return 'meilleur';
  if (perte <= SEUIL_ALTERNATIF) return 'alternatif';
  if (perte < 5 * k) return 'jouable';
  return 'erreur';
}
export const LIBELLES = { meilleur: 'Meilleur coup', alternatif: 'Bon coup alternatif', jouable: 'Jouable, mais moins précis', erreur: 'Erreur' };
export const accepte = cl => cl !== 'erreur'; // un coup différent n'est jamais compté faux s'il reste correct

/* ---------- arbre des lignes d'une fiche ---------- */
const cleDe = fen => fen.split(' ').slice(0, 4).join(' ');
export function arbreDeFiche(cours) {
  const noeuds = new Map(); // clé -> { fen, ply, trait, enfants: Map(san -> { lignes:Set }) }
  const lignes = cours.lignes.concat((cours.pieges || []).map(p => ({ nom: p.titre, coups: p.coups })));
  lignes.forEach((l, li) => {
    const c = new Chess();
    sansDe(l.coups).forEach((san, i) => {
      const fen = c.fen(), cle = cleDe(fen);
      const n = noeuds.get(cle) || { cle, fen, ply: i, trait: c.turn(), enfants: new Map() };
      const e = n.enfants.get(san) || { san, lignes: new Set() }; e.lignes.add(li); n.enfants.set(san, e); noeuds.set(cle, n);
      c.move(san);
    });
  });
  return noeuds;
}

/* positions d'« Appliquer » : celles où c'est à toi de jouer, après le début de la fiche */
export function positionsAppliquer(cours) {
  const moi = cours.co === 'blancs' ? 'w' : 'b', L = sansDe(cours.debut).length;
  return [...arbreDeFiche(cours).values()].filter(n => n.trait === moi && n.ply >= L && n.enfants.size).map(n => ({
    id: cours.id + '|' + n.cle, cle: n.cle, fen: n.fen, ply: n.ply, attendus: [...n.enfants.keys()],
    lignes: [...new Set([].concat(...[...n.enfants.values()].map(e => [...e.lignes])))]
  })).sort((a, b) => a.ply - b.ply);
}

/* réponses adverses cohérentes après un coup de l'utilisateur : coups de la fiche à cette position, pondérés par tes parties */
export function reponsesAdverses(arbre, fenApres, poidsParties = {}) {
  const n = arbre.get(cleDe(fenApres)); if (!n) return [];
  return [...n.enfants.keys()].map(san => ({ san, poids: 1 + (poidsParties[san] || 0) }));
}
export function tirer(reponses, alea = Math.random) {
  if (!reponses.length) return null;
  let t = alea() * reponses.reduce((s, r) => s + r.poids, 0);
  for (const r of reponses) { t -= r.poids; if (t <= 0) return r.san; }
  return reponses[reponses.length - 1].san;
}

/* ---------- dates et révisions espacées ---------- */
export const INTERVALLES = [1, 3, 7, 21]; // jours : repères, à ajuster
export const ajouterJours = (jour, n) => { const d = new Date(jour + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
/* boîte 0..3 ; réussite : boîte suivante ; échec : retour à la première */
export function planifier(item, ok, jour) {
  const boite = ok ? Math.min(INTERVALLES.length - 1, (item && item.boite != null ? item.boite + 1 : 0)) : 0;
  return { boite, prochaine: ajouterJours(jour, INTERVALLES[boite]), vu: jour };
}
export const aReviser = (revisions, jour) => Object.entries(revisions || {}).filter(([, r]) => r.prochaine <= jour).map(([id]) => id);

/* ---------- compétences ---------- */
export const COMPETENCES = [
  ['comprendre', 'Comprendre'], ['reconnaitre', 'Reconnaître'], ['choisir', 'Choisir'], ['generaliser', 'Généraliser']
];
/* repères d'affichage : au moins 6 réponses sur au moins 2 jours, avec 80 % de réussite sur les 8 dernières */
export const SEUIL_SOLIDE = { n: 6, jours: 2, taux: 0.8 };
export function competence(entrees) {
  const n = entrees.length; if (!n) return { etat: 'decouvrir', n: 0, ok: 0 };
  const dern = entrees.slice(-8), ok = dern.filter(e => e.ok).length, jours = new Set(entrees.map(e => e.j)).size;
  const solide = n >= SEUIL_SOLIDE.n && jours >= SEUIL_SOLIDE.jours && ok / dern.length >= SEUIL_SOLIDE.taux;
  return { etat: solide ? 'solide' : 'cours', n, ok: entrees.filter(e => e.ok).length };
}
/* historique : liste de { c: compétence, ok, j: jour, id } */
export function competences(histo) {
  return Object.fromEntries(COMPETENCES.map(([k]) => [k, competence((histo || []).filter(e => e.c === k))]));
}
export const prete = comp => COMPETENCES.every(([k]) => comp[k].etat === 'solide');
/* un exercice d'application compte comme « idées retrouvées » s'il porte sur une position jamais rencontrée */
export const competenceApplication = (histo, id) => ((histo || []).some(e => e.id === id && (e.c === 'choisir' || e.c === 'generaliser')) ? 'choisir' : 'generaliser');
