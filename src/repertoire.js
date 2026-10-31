/* Répertoire personnel : quelles ouvertures je travaille, lesquelles je maîtrise, lesquelles restent à découvrir.
   Fonctions pures (aucun accès au navigateur) : l'état est un objet simple que l'appli sauvegarde dans le stockage local.
   L'appli peut recommander une ouverture, jamais l'ajouter toute seule. */

export const SLOTS = [
  { id: 'blancs', titre: 'Avec les Blancs', court: 'Blancs' },
  { id: 'noirs-e4', titre: 'Noirs contre 1.e4', court: 'Noirs · 1.e4' },
  { id: 'noirs-d4', titre: 'Noirs contre 1.d4', court: 'Noirs · 1.d4' }
];
export const MAX_PAR_EMPLACEMENT = 2; // « une ou deux ouvertures » par emplacement

export function slotDe(cours) {
  if (cours.co === 'blancs') return 'blancs';
  const m = /^1\.(\S+)/.exec(cours.debut || '');
  return m && m[1] === 'd4' ? 'noirs-d4' : 'noirs-e4';
}

export const etatVide = () => ({ v: 1, ouv: {} });

/* état d'une ouverture : 'cours' | 'maitrisee' | 'dispo' */
export const etatDe = (st, id) => (st.ouv[id] ? st.ouv[id].etat : 'dispo');

export function peutAjouter(st, cours, toutes) {
  const slot = slotDe(cours);
  const deja = toutes.filter(c => slotDe(c) === slot && etatDe(st, c.id) === 'cours').length;
  if (etatDe(st, cours.id) === 'cours') return { ok: false, raison: 'Cette ouverture est déjà en apprentissage.' };
  if (deja >= MAX_PAR_EMPLACEMENT) return { ok: false, raison: `Tu travailles déjà ${MAX_PAR_EMPLACEMENT} ouvertures sur cet emplacement : termine-en une avant d’en ajouter.` };
  return { ok: true };
}

export function changer(st, id, etat, jour) {
  const ouv = { ...st.ouv };
  if (etat === 'dispo') delete ouv[id]; else ouv[id] = { etat, depuis: jour };
  return { ...st, ouv };
}

/* regroupe les fiches par emplacement et par état */
export function parEmplacement(st, toutes) {
  return SLOTS.map(s => {
    const fiches = toutes.filter(c => slotDe(c) === s.id);
    return { ...s, cours: fiches.filter(c => etatDe(st, c.id) === 'cours'), maitrisees: fiches.filter(c => etatDe(st, c.id) === 'maitrisee'), dispo: fiches.filter(c => etatDe(st, c.id) === 'dispo') };
  });
}

/* recommandation : la fiche disponible la plus rencontrée dans tes parties, pour un emplacement sans ouverture en cours.
   `nParties` : { idFiche: nombre de parties }. Renvoie null s'il n'y a rien de pertinent. */
export function recommander(st, toutes, nParties) {
  const res = [];
  for (const s of SLOTS) {
    const fiches = toutes.filter(c => slotDe(c) === s.id);
    if (fiches.some(c => etatDe(st, c.id) === 'cours')) continue;
    const c = fiches.filter(f => etatDe(st, f.id) === 'dispo').sort((a, b) => (nParties[b.id] || 0) - (nParties[a.id] || 0))[0];
    if (c && (nParties[c.id] || 0) > 0) res.push({ slot: s.id, id: c.id, n: nParties[c.id] });
  }
  return res;
}
