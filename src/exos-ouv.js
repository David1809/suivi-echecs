/* Exercices et progression du module Ouvertures : arbre des lignes d'une fiche, classement d'un coup, adversaire varié
   (parties réelles, fiches, moteur), révisions espacées mêlant compréhension, lecture, coups et transfert, et compétences.
   Fonctions pures, testables sans navigateur (les évaluations du moteur sont fournies par l'appelant). */
import { Chess } from 'chess.js';
import { sansDe } from './positions.js';

/* ---------- classement d'un coup (perte de chances de gagner, en points de pourcentage) ----------
   On compare des chances de gagner (courbe de l'analyse des parties), pas des centipions : 0,3 pion pèse peu dans une
   position équilibrée et beaucoup dans une position gagnante. Les seuils reprennent ceux de l'analyse des parties :
   « erreur » commence là où l'analyse parle d'imprécision (5 × coefficient de niveau). */
export const COEF_NIVEAU = 1.35; // niveau d'environ 1000 Elo, comme l'analyse des parties
export const SEUIL_ALTERNATIF = 3; // en dessous : deux coups quasi équivalents (bruit de recherche compris)
export const SEUIL_ERREUR = 5 * COEF_NIVEAU;
export const MARGE_VERIF = 3; // un coup à moins de 3 points du seuil d'erreur (de part et d'autre) est revérifié plus profondément
export function classerCoup(perte, estMeilleur, k = COEF_NIVEAU) {
  if (estMeilleur || perte <= 1) return 'meilleur';
  if (perte <= SEUIL_ALTERNATIF) return 'alternatif';
  if (perte < 5 * k) return 'jouable';
  return 'erreur';
}
/* Mesuré sur 1 074 coups (profondeur 12 contre 16) : 5 % changent de verdict accepté/refusé, dont les deux tiers sont des coups acceptés à tort.
   En revérifiant tous les coups à ± 3 points du seuil, il ne reste que 1 bascule sur 1 074. */
export const aVerifier = (perte, k = COEF_NIVEAU) => perte >= 5 * k - MARGE_VERIF && perte < 5 * k + MARGE_VERIF;
export const LIBELLES = { meilleur: 'Meilleur coup', alternatif: 'Bon coup alternatif', jouable: 'Jouable, mais moins précis', erreur: 'Erreur' };
export const accepte = cl => cl !== 'erreur'; // un coup différent n'est jamais compté faux s'il reste correct

/* ---------- arbre des lignes d'une fiche ---------- */
export const cleDe = fen => fen.split(' ').slice(0, 4).join(' ');
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
    lignes: [...new Set([].concat(...[...n.enfants.values()].map(e => [...e.lignes])))].sort((a, b) => a - b)
  })).sort((a, b) => a.ply - b.ply);
}

/* ---------- réponses adverses : parties réelles + fiches + moteur ---------- */
/* table[clé de la position avant la réponse adverse] = { san: { n, grave } } à partir de tes parties.
   parties : [{ m: [coups SAN], ofa: [[demi-coup, classe]…] | null }] ; moi = 'w' | 'b'.
   « grave » : l'analyse des parties a signalé ce coup adverse comme une erreur ou une gaffe (quand la partie est analysée). */
export function tableReponses(parties, moi) {
  const table = {};
  for (const g of parties) {
    const c = new Chess(), graves = new Set((g.ofa || []).filter(f => f[1] === 'e' || f[1] === 'g').map(f => f[0]));
    for (let i = 0; i < g.m.length; i++) {
      const trait = c.turn(), cle = cleDe(c.fen());
      let mv; try { mv = c.move(g.m[i]); } catch { break; }
      if (trait !== moi) { const t = table[cle] || (table[cle] = {}), e = t[mv.san] || (t[mv.san] = { n: 0, grave: 0 }); e.n++; if (graves.has(i + 1)) e.grave++; }
    }
  }
  return table;
}
export const MIN_ECHANTILLON = 5; // en dessous, une fréquence n'est pas assez stable pour guider le tirage
export const POIDS_COUP_DOUTEUX = 0.25; // un coup adverse fréquent mais signalé comme mauvais pèse quatre fois moins
/* candidats : coups de la fiche, coups réellement rencontrés (au moins 2 fois), meilleur coup du moteur.
   Tout candidat garde un poids ≥ 1 : les réponses rares restent possibles. */
export function reponsesAdverses(arbre, fenApres, reel = {}, moteurSan = null) {
  const n = arbre.get(cleDe(fenApres)), fiche = n ? [...n.enfants.keys()] : [];
  const total = Object.values(reel).reduce((s, e) => s + e.n, 0), assez = total >= MIN_ECHANTILLON;
  const cands = new Map();
  for (const san of fiche) cands.set(san, { san, poids: 1, src: 'fiche' });
  if (assez) for (const [san, e] of Object.entries(reel)) {
    if (!cands.has(san) && e.n < 2) continue; // un coup vu une seule fois hors fiche n'est pas une tendance
    const part = e.grave / e.n, eff = e.n * ((1 - part) + part * POIDS_COUP_DOUTEUX);
    const c = cands.get(san) || { san, poids: 1, src: 'reel' }; c.poids += eff; c.reel = e.n; cands.set(san, c);
  }
  if (moteurSan && !cands.has(moteurSan)) cands.set(moteurSan, { san: moteurSan, poids: 1, src: 'moteur' });
  return [...cands.values()];
}
export function tirer(reponses, alea = Math.random) {
  if (!reponses.length) return null;
  const R = reponses.map(r => (typeof r === 'string' ? { san: r, poids: 1 } : r));
  let t = alea() * R.reduce((s, r) => s + r.poids, 0);
  for (const r of R) { t -= r.poids; if (t <= 0) return r.san; }
  return R[R.length - 1].san;
}
/* Diversité sur plusieurs séances : une réponse déjà proposée récemment (`recents[san]` fois) voit son poids divisé par 1 + 0,6 × n.
   Le poids n'est jamais augmenté : une réponse rare gagne en part relative parce que la dominante recule, mais un coup adverse faible
   n'est jamais promu pour varier (son poids de départ reste celui qu'il a, 0,25 fois la fréquence s'il est signalé comme erreur). */
export const DECROISSANCE_REPETITION = 0.6;
export function tirerDiverse(reponses, recents = {}, alea = Math.random) {
  return tirer(reponses.map(r => ({ ...r, poids: r.poids / (1 + DECROISSANCE_REPETITION * (recents[r.san] || 0)) })), alea);
}
/* mémoire des réponses récemment proposées pour une position : on compte, on plafonne, et on divise par deux quand elle grossit */
export function memoriserReponse(recents = {}, san) {
  const m = { ...recents }; m[san] = Math.min(20, (m[san] || 0) + 1);
  if (Object.values(m).reduce((s, n) => s + n, 0) > 30) for (const k of Object.keys(m)) { m[k] = Math.floor(m[k] / 2); if (!m[k]) delete m[k]; }
  return m;
}

/* ---------- notions fondamentales ----------
   Une notion fondamentale doit être acquise pour qu'une compétence soit solide : aucune réussite sur des notions secondaires ne la remplace.
   - Comprendre / Reconnaître : l'idée de l'ouverture, son plan et son erreur courante.
   - Appliquer : les lignes principales de la fiche (liste explicite ci-dessous) ; les autres lignes sont secondaires.
   - Généraliser : tous les types d'écart proposés (il y en a deux ou trois par ouverture, tous nécessaires).
   Tolérance justifiée : parmi les notions secondaires (pièces, centre, adaptations, lignes annexes), une seule peut manquer, et seulement s'il y en a
   au moins trois : ce sont des compléments (cas particuliers) qui n'engagent pas la compréhension de l'ouverture. */
export const FONDAMENTALES_NOTIONS = ['idee', 'plan', 'erreur'];
export const LIGNES_PRINCIPALES = { 'deux-cavaliers': [0, 1], giuoco: [0, 1], fou: [0, 3], caro: [0, 1, 2], scandinave: [0, 1], philidor: [0, 1], 'fr-avance': [0, 1], 'fr-echange': [0, 1],
  'fr-nc3': [0, 1, 2], 'fr-nf3': [0, 1], 'e5-italienne': [0, 1], 'e5-dame': [0, 1], 'd4-d5': [0, 2] };
export const TOLERANCE_SECONDAIRES_MIN = 3;
export function estFondamentale(cours, comp, notion) {
  if (comp === 'comprendre' || comp === 'reconnaitre') return FONDAMENTALES_NOTIONS.includes(notion);
  if (comp === 'generaliser') return true;
  if (comp === 'choisir') { const i = +String(notion).slice(1); return (LIGNES_PRINCIPALES[cours.id] || [0]).includes(i); }
  return false;
}

/* ---------- registre : chaque question ou exercice, sa compétence, sa notion et sa situation ---------- */
export const COMPETENCES = [['comprendre', 'Comprendre'], ['reconnaitre', 'Reconnaître'], ['choisir', 'Appliquer'], ['generaliser', 'Généraliser']];
export function registre(cours, lecon) {
  const R = new Map(), ajout = (id, m) => R.set(id, { ...m, fond: estFondamentale(cours, m.comp, m.notion) });
  for (const ca of lecon.cartes) ajout(ca.id, { kind: 'q', comp: 'comprendre', notion: ca.notion, groupe: ca.id });
  for (const q of lecon.reconnaitre) ajout(q.id, { kind: 'r', comp: 'reconnaitre', notion: q.notion, groupe: q.id });
  for (const t of lecon.transferts || []) ajout(t.id, { kind: 't', comp: 'generaliser', notion: t.ecart, groupe: t.id });
  for (const p of positionsAppliquer(cours)) ajout(p.id, { kind: 'p', comp: 'choisir', notion: 'v' + p.lignes[0], groupe: p.id });
  return R;
}

/* ---------- verdict d'une réponse : réussite / réponse partielle / échec ----------
   qualité du coup (Stockfish) × pertinence pédagogique :
   - le coup de la fiche, ou un coup « meilleur » / « bon alternatif » qui répond à l'objectif de l'exercice : réussite ;
   - un coup correct mais sans rapport avec l'objectif, ou « jouable mais moins précis » : réponse partielle (ne valide rien) ;
   - une erreur : échec.
   `objectifOk` vaut undefined quand l'exercice n'a pas d'objectif particulier (positions de la fiche : bien jouer la position suffit). */
export function verdict(cl, enFiche, objectifOk) {
  if (enFiche) return 'reussite';
  if (cl === 'erreur') return 'echec';
  if ((cl === 'meilleur' || cl === 'alternatif') && objectifOk !== false) return 'reussite';
  return 'partiel';
}
export const LIBELLES_VERDICT = { reussite: 'Réussi', partiel: 'Réponse partielle', echec: 'Échec' };
/* L'objectif d'un exercice est une liste d'alternatives ; chacune est une liste d'atomes qui doivent tous être vrais après le coup.
   atomes : { t:'devel' } (une pièce mineure quitte sa case de départ) · { t:'piece', p, de?, vers? } · { t:'roque' } · { t:'defend', sq } · { t:'attaque', sq } · { t:'prend', sq? } · { t:'pion', vers:[...] } · { t:'echec' } */
export function objectifAtteint(avant, san, objectifs) {
  if (!objectifs || !objectifs.length) return undefined;
  const c = new Chess(avant), m = c.move(san), col = m.color;
  const atome = a => {
    switch (a.t) {
      case 'devel': return (m.piece === 'n' || m.piece === 'b') && (col === 'w' ? ['b1', 'c1', 'f1', 'g1'] : ['b8', 'c8', 'f8', 'g8']).includes(m.from);
      case 'piece': return m.piece === a.p && (!a.de || m.from === a.de) && (!a.vers || [].concat(a.vers).includes(m.to));
      case 'roque': return m.flags.includes('k') || m.flags.includes('q');
      case 'defend': { const p = c.get(a.sq); return !!p && p.color === col && c.attackers(a.sq, col).length > 0; }
      case 'attaque': return c.attackers(a.sq, col).length > 0;
      case 'prend': return !!m.captured && (!a.sq || m.to === a.sq);
      case 'pion': return m.piece === 'p' && [].concat(a.vers).includes(m.to);
      case 'echec': return c.inCheck();
      default: return false;
    }
  };
  return objectifs.some(liste => liste.every(atome));
}

/* ---------- jours ---------- */
export const joursEntre = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);
export const ESPACEMENT_MIN = 3; // jours calendaires entre les deux réussites qui fondent l'acquisition d'une notion
/* issue d'une entrée du journal : 'r' réussite, 'p' réponse partielle, 'e' échec (les anciennes entrées n'ont que `ok`) */
export const issueDe = e => e.r || (e.ok ? 'r' : 'e');

/* ---------- compétences ----------
   Une notion (une idée, une variante, un type d'écart) est « acquise » quand :
   1. la dernière réponse sur cette notion est une réussite (les réponses partielles ne comptent ni pour ni contre) ;
   2. on part de la dernière erreur : seules comptent les réussites survenues un jour postérieur au dernier échec ;
   3. parmi elles, deux réussites sont séparées d'au moins trois jours calendaires (J0 puis J3 : oui ; J0 puis J1 ou J2 : non) ;
   4. ces deux réussites portent sur deux situations différentes dès que la notion en compte au moins deux.
   Seules la première tentative d'un exercice compte : un réessai (`re`) est consigné mais ignoré. Une réussite répétée dans la même séance
   n'est qu'une période de réussite. Une compétence est « solide » quand toutes ses notions fondamentales sont acquises et qu'au plus
   une notion secondaire manque (seulement s'il y a au moins trois notions secondaires). */
export function etatNotions(entrees, reg, comp, cours) {
  const items = [...reg].filter(([, m]) => m.comp === comp), notions = [...new Set(items.map(([, m]) => m.notion))], out = {};
  for (const nt of notions) {
    const ids = new Set(items.filter(([, m]) => m.notion === nt).map(([id]) => id));
    const nGroupes = new Set(items.filter(([, m]) => m.notion === nt).map(([, m]) => m.groupe)).size;
    const tent = entrees.filter(e => ids.has(e.id) && !e.re && issueDe(e) !== 'p');
    const der = tent[tent.length - 1], fond = estFondamentale(cours || { id: '' }, comp, nt);
    let acquise = false;
    if (der && issueDe(der) === 'r') {
      let jEchec = null; for (const e of tent) if (issueDe(e) === 'e') jEchec = e.j;
      const reussites = tent.filter(e => issueDe(e) === 'r' && (jEchec === null || e.j > jEchec));
      outer: for (let i = 0; i < reussites.length; i++) for (let k = i + 1; k < reussites.length; k++) {
        const a = reussites[i], b = reussites[k];
        if (joursEntre(a.j, b.j) < ESPACEMENT_MIN) continue;
        if (nGroupes >= 2 && reg.get(a.id).groupe === reg.get(b.id).groupe) continue;
        acquise = true; break outer;
      }
    }
    out[nt] = { acquise, fondamentale: fond, tentatives: tent.length, situations: nGroupes };
  }
  const L = Object.values(out), fond = L.filter(x => x.fondamentale), sec = L.filter(x => !x.fondamentale);
  return { notions: out, total: notions.length, acquises: L.filter(x => x.acquise).length,
    fondamentales: fond.length, fondamentalesAcquises: fond.filter(x => x.acquise).length, secondaires: sec.length, secondairesAcquises: sec.filter(x => x.acquise).length };
}
export function competence(entrees, reg, comp, cours) {
  const mine = entrees.filter(e => reg.has(e.id) && reg.get(e.id).comp === comp && !e.re);
  const e = etatNotions(mine, reg, comp, cours);
  if (!mine.length) return { etat: 'decouvrir', ...e };
  const tol = e.secondaires >= TOLERANCE_SECONDAIRES_MIN ? 1 : 0;
  const solide = e.total > 0 && e.fondamentalesAcquises === e.fondamentales && e.secondairesAcquises >= e.secondaires - tol;
  return { etat: solide ? 'solide' : 'cours', ...e, tolerance: tol };
}
export function competences(histo, reg, cours) { return Object.fromEntries(COMPETENCES.map(([k]) => [k, competence(histo || [], reg, k, cours)])); }
/* La maîtrise n'est proposée que si les quatre compétences sont solides ET qu'aucune notion fondamentale n'est fragile. */
export const prete = comp => COMPETENCES.every(([k]) => comp[k].etat === 'solide' && comp[k].fondamentalesAcquises === comp[k].fondamentales);
/* notions fondamentales manquantes (pour l'afficher et pour la réévaluation d'une ouverture maîtrisée) */
export function fondamentalesManquantes(entrees, reg, cours) {
  const res = [];
  for (const [k] of COMPETENCES) { const e = etatNotions(entrees.filter(x => reg.has(x.id) && !x.re), reg, k, cours); for (const [nt, v] of Object.entries(e.notions)) if (v.fondamentale && !v.acquise) res.push({ comp: k, notion: nt }); }
  return res;
}
/* ouverture maîtrisée : à revoir si au moins deux échecs récents (14 jours) sur des notions fondamentales différentes, ou le même deux fois */
export function aReevaluer(entrees, reg, jour) {
  const recents = entrees.filter(e => !e.re && issueDe(e) === 'e' && reg.has(e.id) && reg.get(e.id).fond && joursEntre(e.j, jour) <= 14 && joursEntre(e.j, jour) >= 0);
  const notions = new Set(recents.map(e => reg.get(e.id).comp + reg.get(e.id).notion));
  return recents.length >= 2 && (notions.size >= 2 || recents.length >= 3);
}
/* réexplication : la notion de l'exercice a donné trois échecs (ou réponses partielles) de suite, ou trois sur les cinq dernières tentatives */
export function besoinAide(entrees, reg, id) {
  const m = reg.get(id); if (!m) return false;
  const tent = entrees.filter(e => !e.re && reg.has(e.id) && reg.get(e.id).comp === m.comp && reg.get(e.id).notion === m.notion).slice(-5);
  const rate = e => issueDe(e) !== 'r';
  return (tent.length >= 3 && tent.slice(-3).every(rate)) || tent.filter(rate).length >= 3;
}

/* ---------- enregistrement d'une réponse (pur, testable) ----------
   etat = { histo, rev } d'une ouverture ; r = 'r' réussite, 'p' réponse partielle, 'e' échec ; o.re = réessai ; o.d = « je ne sais pas ».
   Seule la première tentative d'un exercice change le calendrier et les compétences : un réessai est consigné (`re`) mais ignoré ensuite,
   si bien qu'échouer puis réussir au réessai le même jour laisse l'exercice marqué comme échoué (retour à demain, paliers rapprochés). */
export function appliquerReponse(etat, reg, id, r, jour, o = {}) {
  const m = reg.get(id), rev0 = etat.rev || {}; if (!m) return { histo: etat.histo, rev: rev0, aide: false };
  const histo = etat.histo.concat({ c: m.comp, ok: r === 'r', r, id, j: jour, ...(o.re ? { re: 1 } : {}), ...(o.d ? { d: 1 } : {}) }).slice(-400);
  if (o.re) return { histo, rev: rev0, aide: false };
  let rev = { ...rev0, [id]: planifier(rev0[id], r === 'r', jour) };
  if (r !== 'r') rev = rapprocherNotion(rev, reg, id, jour);
  return { histo, rev, aide: r !== 'r' && besoinAide(histo, reg, id) };
}

/* ---------- révisions espacées ----------
   Chaque question, position ou exercice de transfert a son propre calendrier. Un exercice réussi sans accroc monte d'un palier
   (1, 3, 7, 21 jours) ; une erreur le ramène à demain, et il suit ensuite des paliers plus rapprochés (1, 2, 4, 10 jours) tant
   qu'il n'a pas été réussi jusqu'en haut. Une erreur rapproche aussi les autres exercices de la même notion (dans 2 jours au plus),
   sans toucher au reste de l'ouverture. */
export const INTERVALLES = [1, 3, 7, 21], INTERVALLES_FRAGILES = [1, 2, 4, 10];
export const ajouterJours = (jour, n) => { const d = new Date(jour + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
export function planifier(item, ok, jour) {
  const prec = item || {};
  if (!ok) return { boite: 0, echecs: (prec.echecs || 0) + 1, prochaine: ajouterJours(jour, 1), vu: jour };
  const boite = Math.min(INTERVALLES.length - 1, prec.boite != null ? prec.boite + 1 : 0);
  const echecs = boite === INTERVALLES.length - 1 ? 0 : (prec.echecs || 0);
  return { boite, echecs, prochaine: ajouterJours(jour, (echecs ? INTERVALLES_FRAGILES : INTERVALLES)[boite]), vu: jour };
}
/* après une erreur sur `id`, les exercices de la même notion et de la même compétence reviennent dans 2 jours au plus */
export function rapprocherNotion(revisions, reg, id, jour) {
  const m = reg.get(id), out = { ...revisions }; if (!m) return out;
  const limite = ajouterJours(jour, 2);
  for (const [autre, r] of Object.entries(out)) { const a = reg.get(autre); if (autre !== id && a && a.comp === m.comp && a.notion === m.notion && r.prochaine > limite) out[autre] = { ...r, prochaine: limite }; }
  return out;
}
export const aReviser = (revisions, jour) => Object.entries(revisions || {}).filter(([, r]) => r.prochaine <= jour).map(([id]) => id);
/* séance de révision : mélange les types (compréhension, lecture, coups, transfert), pas plus de deux exercices par notion,
   et rien de ce qui a déjà été revu aujourd'hui */
export function selectionRevision(revisions, reg, jour, n = 6) {
  const dus = Object.entries(revisions || {}).filter(([id, r]) => r.prochaine <= jour && r.vu !== jour && reg.has(id)).sort((a, b) => a[1].prochaine.localeCompare(b[1].prochaine));
  const files = { q: [], r: [], p: [], t: [] };
  for (const [id] of dus) files[reg.get(id).kind].push(id);
  const res = [], parNotion = {};
  for (let tour = 0; res.length < n && tour < dus.length; tour++) {
    let pris = false;
    for (const k of ['q', 'r', 'p', 't']) {
      const id = files[k].shift(); if (!id) continue;
      const nt = reg.get(id).comp + reg.get(id).notion;
      if ((parNotion[nt] || 0) >= 2) continue;
      parNotion[nt] = (parNotion[nt] || 0) + 1; res.push(id); pris = true; if (res.length >= n) break;
    }
    if (!pris && !Object.values(files).some(f => f.length)) break;
  }
  return res;
}
