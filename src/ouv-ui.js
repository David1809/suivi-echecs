/* Interface du module Ouvertures : « Mon répertoire » puis, pour chaque ouverture, Comprendre → Reconnaître → Appliquer → Mémoriser.
   Les fonctions de l'appli (échiquier, moteur, statistiques…) sont reçues dans `D` : ce fichier ne duplique aucune logique. */
import { Chess } from 'chess.js';
import { COURS } from './ouvertures-data.js';
import { SLOTS, etatVide, etatDe, changer, peutAjouter, parEmplacement, recommander } from './repertoire.js';
import { cartesDe } from './lecons.js';
import * as X from './exos-ouv.js';
import { winPct } from './analyse.js';
import { pourquoiMeilleur } from './expliquer.js';
import { libelle, sansDe } from './positions.js';

const NS = 'http://www.w3.org/2000/svg';
const melange = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const ETIQ = { decouvrir: 'à découvrir', cours: 'en cours', solide: 'solide' };

export function creerOuvUI(D) {
  const { h, $, S, store, dateLocale } = D;
  const jour = () => dateLocale();

  /* ---------- stockage local ---------- */
  const lireRep = () => store.get('ec_rep', etatVide());
  const ecrireRep = st => store.set('ec_rep', st);
  const histoDe = id => (store.get('ec_ouv_histo', {})[id] || []);
  const revDe = id => (store.get('ec_ouv_rev', {})[id] || {});
  /* registre des exercices d'une ouverture (mis en cache : il ne change pas pendant la session) */
  const REG = new Map();
  const regDe = c => { if (!REG.has(c.id)) REG.set(c.id, X.registre(c, cartesDe(c))); return REG.get(c.id); };
  const compDe = c => X.competences(histoDe(c.id), regDe(c), c);
  /* ---------- échiquier annoté : cases, flèches (les annotations sont vérifiées par les tests) ---------- */
  const COUL = () => ({ danger: D.C('--fl-joue') || '#d9577a', idee: D.C('--fl-mieux') || '#3a7bd5', plan: '#2e9e6b', cible: '#e0a21b' });
  function plateauAnnote(opts = {}) {
    const plateau = h('div', { class: 'plateau', role: 'img', 'aria-label': 'Échiquier' });
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 8 8'); svg.setAttribute('class', 'fleches');
    const env = h('div', { class: 'plateau-env' }, plateau, svg);
    function dessiner(fen, cote, cases = [], fleches = [], onclick = null) {
      D.construirePlateau(plateau, fen, cote, onclick ? { onclick } : {});
      const col = COUL(), pos = sq => { const c = 'abcdefgh'.indexOf(sq[0]), r = 8 - +sq[1]; return [cote === 'w' ? c : 7 - c, cote === 'w' ? r : 7 - r]; };
      svg.innerHTML = cases.map(k => { const [x, y] = pos(k.sq); return `<rect x="${x}" y="${y}" width="1" height="1" rx=".08" fill="${col[k.role] || col.idee}" opacity=".38"/>`; }).join('')
        + fleches.map(f => D.flecheSvg(f.de + f.vers, col[f.role] || col.idee, cote)).join('');
    }
    return { env, dessiner };
  }
  const fenDe = coups => { const c = new Chess(); for (const s of sansDe(coups)) c.move(s); return c.fen(); };

  /* ---------- données d'une ouverture ---------- */
  const infoOuv = c => { const ps = D.partiesDuCours(c), s = D.stats(ps); return { ps, s, comp: compDe(c), dus: X.aReviser(revDe(c.id), jour()).filter(i => regDe(c).has(i)).length }; };
  function prochaineAction(c, comp, dus) {
    if (dus > 0) return { label: `Réviser (${dus})`, onglet: 'memoriser' };
    if (comp.comprendre.etat !== 'solide') return { label: 'Continuer : comprendre', onglet: 'comprendre' };
    if (comp.reconnaitre.etat !== 'solide') return { label: 'Continuer : reconnaître', onglet: 'reconnaitre' };
    if (comp.choisir.etat !== 'solide' || comp.generaliser.etat !== 'solide') return { label: 'Continuer : appliquer', onglet: 'appliquer' };
    if (X.prete(comp)) return { label: 'Faire le point', onglet: 'memoriser' };
    return { label: 'Continuer', onglet: 'appliquer' };
  }
  const pastilles = comp => h('div', { class: 'comp-ligne' }, X.COMPETENCES.map(([k, l]) =>
    h('span', { class: 'comp ' + comp[k].etat, 'aria-label': `${l} : ${ETIQ[comp[k].etat]}` }, h('i', { class: 'pt-c' }), l)));

  /* =====================  ÉCRAN 1 : MON RÉPERTOIRE  ===================== */
  function vueRepertoire() {
    const v = $('#v-ouvertures'); v.innerHTML = '';
    v.append(h('div', { class: 'entete' }, h('h1', {}, 'Ouvertures')));
    D.preparerOuvertures();
    const rep = lireRep(), nP = Object.fromEntries(COURS.map(c => [c.id, D.partiesDuCours(c).length])), rec = recommander(rep, COURS, nP);
    const ajout = new Set();
    parEmplacement(rep, COURS).forEach(sl => {
      const bloc = h('section', { class: 'rep-slot' }, h('h2', {}, sl.titre));
      sl.cours.forEach(c => bloc.append(carteOuv(c)));
      const r = rec.find(x => x.slot === sl.id), tout = sl.cours.length + sl.maitrisees.length + sl.dispo.length;
      if (!tout) bloc.append(h('p', { class: 'rep-vide' }, 'Pas encore de fiche pour cet emplacement.'));
      else if (r) { const rc = COURS.find(x => x.id === r.id); bloc.append(h('div', { class: 'rep-reco' }, h('p', {}, `Tu as joué ${r.n} partie${r.n > 1 ? 's' : ''} avec « ${rc.nom} ». ${sl.cours.length ? 'Tu peux aussi la travailler.' : 'Tu peux commencer par celle-ci.'}`),
        h('button', { class: 'btn' + (sl.cours.length ? ' discret' : ''), onclick: () => ajouter(rc, rep) }, 'Travailler cette ouverture'))); }
      else if (!sl.cours.length) bloc.append(h('p', { class: 'rep-vide' }, 'Choisis une ouverture à travailler.'));
      if (sl.dispo.length && sl.cours.length < 2) {
        const liste = h('div', { class: 'rep-choix', hidden: true }, sl.dispo.map(c => h('button', { class: 'rep-ligne', onclick: () => ajouter(c, rep) }, h('b', {}, c.nom), h('small', {}, `${c.debut}${nP[c.id] ? ` · ${nP[c.id]} parties` : ''}`))));
        bloc.append(h('button', { class: 'btn discret petit', onclick: () => { liste.hidden = !liste.hidden; } }, sl.cours.length ? 'Ajouter une ouverture' : 'Voir les ouvertures disponibles'), liste);
      }
      if (sl.maitrisees.length) {
        const nd = sl.maitrisees.reduce((n, c) => n + dusDe(c), 0);
        bloc.append(h('details', { class: 'plie plat', ...(nd ? { open: true } : {}) }, h('summary', {}, `Maîtrisées (${sl.maitrisees.length})${nd ? ` · ${nd} à réviser` : ''}`), sl.maitrisees.map(ligneMaitrisee)));
      }
      v.append(bloc);
    });
    v.append(h('button', { class: 'btn discret', style: 'margin:18px 20px 0', onclick: () => { S.ouvMode = 'biblio'; D.vueOuvertures(); } }, `Bibliothèque des fiches (${COURS.length})`));
    v.append(h('details', { class: 'plie plat discret' }, h('summary', {}, 'Diagnostic'), h('div', { id: 'alerte-ouv' }, D.alerteDonnees()), h('div', { id: 'donnees-ouv', class: 'donnees-ouv' }, ...D.contenuDonnees())));
  }
  /* une ouverture maîtrisée reste révisable : les révisions échues sont visibles, et si plusieurs points fondamentaux sont fragiles on propose de la reprendre */
  const dusDe = c => X.aReviser(revDe(c.id), jour()).filter(i => regDe(c).has(i)).length;
  const fragile = c => X.aReevaluer(histoDe(c.id), regDe(c), jour());
  function ligneMaitrisee(c) {
    const n = dusDe(c), reprendre = () => { ecrireRep(changer(lireRep(), c.id, 'cours', jour())); vueRepertoire(); };
    return h('div', { class: 'rep-ligne fixe maitrisee' }, h('b', {}, c.nom),
      fragile(c) ? h('small', { class: 'alerte-fragile' }, 'Plusieurs points fondamentaux sont fragiles : tu peux la reprendre.') : null,
      n ? h('button', { class: 'btn petit', onclick: () => ouvrirApprendre(c, 'memoriser') }, `Réviser (${n})`) : null,
      h('button', { class: 'btn discret petit', onclick: reprendre }, 'Reprendre'));
  }
  function ajouter(c, rep) {
    const p = peutAjouter(rep, c, COURS);
    if (!p.ok) { D.toast(p.raison); return; }
    ecrireRep(changer(rep, c.id, 'cours', jour())); ouvrirApprendre(c, 'comprendre');
  }
  function carteOuv(c) {
    const { s, comp, dus } = infoOuv(c), a = prochaineAction(c, comp, dus);
    return h('div', { class: 'rep-ouv' },
      h('button', { class: 'rep-titre', onclick: () => ouvrirApprendre(c, a.onglet) }, h('b', {}, c.nom), h('small', {}, c.debut)),
      s.n ? h('div', { class: 'rep-parties' }, h('span', {}, `${s.n} partie${s.n > 1 ? 's' : ''} · ${D.pct(s.g, s.n)} % de victoires`), D.barreRes(s, true)) : h('p', { class: 'rep-parties' }, 'Pas encore jouée en partie rapide.'),
      pastilles(comp), h('button', { class: 'btn', onclick: () => ouvrirApprendre(c, a.onglet) }, a.label));
  }

  /* =====================  ÉCRAN 2 : UNE OUVERTURE  ===================== */
  const ONGLETS = [['comprendre', 'Comprendre'], ['reconnaitre', 'Reconnaître'], ['appliquer', 'Appliquer'], ['memoriser', 'Mémoriser']];
  function ouvrirApprendre(c, onglet0 = 'comprendre') {
    const ov = D.ouvrirEntrain(), moi = c.co === 'blancs' ? 'w' : 'b', { s } = infoOuv(c);
    let onglet = onglet0;
    const fermer = () => { ov.fermer(); vueRepertoire(); };
    const entete = h('div', { class: 'fiche-vue' }, h('h1', { class: 'fiche-nom' }, c.nom), h('p', { class: 'fiche-coups' }, `${c.debut} · avec les ${c.co}`));
    const suivi = h('div', { class: 'suivi' });
    const panneau = h('div', { class: 'fiche-panneau', role: 'tabpanel' });
    const tabs = ONGLETS.map(([k, l]) => h('button', { role: 'tab', 'data-o': k, 'aria-selected': k === onglet, onclick: () => aller(k) }, l));
    const nav = h('div', { class: 'fiche-nav' }, h('button', { class: 'nav-retour', 'aria-label': 'Retour au répertoire', onclick: fermer }, h('span', { html: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>' })), h('div', { class: 'tabs-fiche', role: 'tablist' }, tabs));
    ov.in_.classList.add('fiche'); ov.in_.append(entete, suivi, nav, panneau);
    const ctx = { c, moi, ov, aller: k => aller(k), fermer, maj: () => majSuivi() };
    function majSuivi() { suivi.replaceChildren(pastilles(compDe(c))); }
    function aller(k) {
      onglet = k; tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.o === k)); ov.in_.classList.toggle('en-exo', k !== 'memoriser');
      panneau.replaceChildren(k === 'comprendre' ? panComprendre(ctx) : k === 'reconnaitre' ? panReconnaitre(ctx) : k === 'appliquer' ? panAppliquer(ctx) : panMemoriser(ctx));
      ov.in_.parentElement.scrollTop = 0; majSuivi();
    }
    aller(onglet);
  }

  /* =====================  BRIQUES D'EXERCICE  =====================
     Chaque brique affiche un exercice dans `P`, enregistre la première réponse, puis appelle `fin(ok)` quand l'utilisateur passe à la suite.
     Les mêmes briques servent aux onglets Comprendre / Reconnaître / Appliquer et aux séances de révision mêlées.
     Seule la première tentative d'un exercice décide de son résultat et de son calendrier ; un réessai est consigné à part. */
  const bouton = (txt, f, cls = 'btn') => h('button', { class: cls, onclick: f }, txt);
  const NOM_PIECE = { p: 'Le pion', n: 'Le cavalier', b: 'Le fou', r: 'La tour', q: 'La dame', k: 'Le roi' };
  /* description en mots de ce que montrent les cases et les flèches (calculée sur la position, donc exacte) */
  function decrire(fen, cases = [], fleches = []) {
    const ch = new Chess(fen), nom = sq => { const p = ch.get(sq); return p ? `${NOM_PIECE[p.type]} en ${sq}` : sq; }, L = [];
    for (const f of fleches) L.push(f.type === 'defense' ? `${nom(f.de)} défend ${f.vers}.` : f.type === 'coup' ? `${nom(f.de)} peut aller en ${f.vers}.` : `${nom(f.de)} attaque ${f.vers}.`);
    const mots = { danger: 'case menacée', cible: 'case visée', plan: 'case du plan', idee: 'case clé' };
    for (const k of cases) L.push(`${k.sq} : ${mots[k.role] || 'case clé'}.`);
    return L;
  }
  /* enregistre la réponse ; renvoie vrai si la notion demande maintenant une réexplication (trois ratés de suite ou trois sur cinq) */
  function enregistrer(c, id, r, o = {}) {
    const reg = regDe(c); if (!reg.has(id)) return false;
    const th = store.get('ec_ouv_histo', {}), tr = store.get('ec_ouv_rev', {});
    const res = X.appliquerReponse({ histo: th[c.id] || [], rev: tr[c.id] || {} }, reg, id, r, jour(), o);
    th[c.id] = res.histo; tr[c.id] = res.rev; store.set('ec_ouv_histo', th); store.set('ec_ouv_rev', tr);
    return res.aide;
  }
  const issueDeVerdict = v => (v === 'reussite' ? 'r' : v === 'partiel' ? 'p' : 'e');

  /* une idée de la leçon : la question d'abord (échiquier sans annotation), puis l'explication et l'échiquier annoté */
  function briqueCarte(ctx, ca, P, fin, { indice = '' } = {}) {
    const { c, moi } = ctx, bd = plateauAnnote(), q = ca.q, rep = h('div', { class: 'qcm' }), fb = h('div', { class: 'qcm-fb' }), suite = h('div', { class: 'carte-nav suite' });
    const ne = h('button', { class: 'btn discret petit qcm-nsp', onclick: () => reveler('e', true, null) }, 'Je ne sais pas');
    const zone = h('div', { class: 'carte' }, indice ? h('div', { class: 'carte-n' }, indice) : null, bd.env, h('p', { class: 'qcm-q' }, q.question), rep, ne, fb, suite);
    bd.dessiner(fenDe(q.pos || ca.coups), ca.cote || moi);
    let fait = false;
    function reveler(r, inconnu, bouton_) {
      if (fait) return; fait = true; $$$(rep).forEach(b => { b.disabled = true; }); ne.hidden = true;
      if (bouton_) bouton_.classList.add(r === 'r' ? 'ok' : 'ko');
      $$$(rep).forEach(b => { if (b.dataset.bonne === '1') b.classList.add('ok'); });
      bd.dessiner(fenDe(ca.coups), ca.cote || moi, ca.cases || [], ca.fleches || []);
      fb.replaceChildren(h('p', {}, h('b', {}, r === 'r' ? 'Exact. ' : inconnu ? 'Voici l’idée. ' : 'Pas tout à fait. '), q.explication), h('h3', { class: 'carte-titre' }, ca.titre), h('p', { class: 'carte-texte' }, ca.texte));
      const aide = enregistrer(c, ca.id, r, { d: inconnu }); ctx.maj();
      if (aide) suite.append(bouton('Reprendre l’idée', () => reexpliquer(ctx, ca.id, P, fin), 'btn discret'));
      suite.append(bouton('Suivant →', () => fin(r === 'r')));
      fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    melange(q.options.map((t, i) => ({ t, i }))).forEach(o => rep.append(h('button', { class: 'qcm-opt', 'data-bonne': o.i === q.bonne ? '1' : '0', onclick: ev => reveler(o.i === q.bonne ? 'r' : 'e', false, ev.currentTarget) }, o.t)));
    P.replaceChildren(zone);
  }
  /* lecture de position : toucher la bonne case (une ou plusieurs cases sont acceptées si la position le permet) */
  function briqueLecture(ctx, q, P, fin, indice = '') {
    const { c, moi } = ctx, bd = plateauAnnote(), fb = h('div', { class: 'qcm-fb' }), suite = h('div', { class: 'carte-nav suite' }); let repondu = false;
    P.replaceChildren(h('div', { class: 'carte' }, indice ? h('div', { class: 'carte-n' }, indice) : null, bd.env, h('p', { class: 'qcm-q' }, q.question), fb, suite));
    bd.dessiner(fenDe(q.coups), q.cote || moi, [], [], nom => {
      if (repondu) return; repondu = true; const ok = nom === q.reponse || (q.acceptees || []).includes(nom);
      bd.dessiner(fenDe(q.coups), q.cote || moi, q.cases.concat(ok ? [] : [{ sq: nom, role: 'danger' }]), q.fleches);
      fb.replaceChildren(h('p', {}, h('b', {}, ok ? 'Exact. ' : 'Pas cette case. '), q.explication));
      const aide = enregistrer(c, q.id, ok ? 'r' : 'e'); ctx.maj();
      if (aide) suite.append(bouton('Reprendre l’idée', () => reexpliquer(ctx, q.id, P, fin), 'btn discret'));
      suite.append(bouton('Suivant →', () => fin(ok))); fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
  /* jugement d'un coup hors fiche : chances de gagner avant / après ; seconde vérification plus profonde si le coup est à ± 3 points du seuil d'erreur */
  async function juger(fen, m, moi) {
    let R = await D.profond(fen, m.uci); const mien = e => (moi === 'w' ? e : -e), perte = r => winPct(mien(r.rb.e)) - winPct(mien(r.ra.e));
    let p = perte(R), cl = X.classerCoup(p, m.uci === R.rb.b);
    if (X.aVerifier(p) && D.profondFort) { try { const R2 = await D.profondFort(fen, m.uci); p = perte(R2); cl = X.classerCoup(p, m.uci === R2.rb.b); R = R2; } catch {} }
    return { cl, R };
  }
  const noteDeCoup = (c, item, san) => {
    for (const li of item.lignes) { const l = c.lignes[li]; if (!l) continue; const J = sansDe(l.coups); if (J[item.ply] === san) { const n = l.notes && l.notes[item.ply + 1]; const t = typeof n === 'object' && n ? n.t : n; if (t) return t; } }
    return '';
  };
  /* table des réponses réellement rencontrées dans tes parties (calculée une fois par séance) ; mémoire des réponses déjà proposées (diversité) */
  const tableDe = (c, moi) => { try { return X.tableReponses(D.partiesPourReponses(c), moi); } catch { return {}; } };
  const lireDiv = () => store.get('ec_ouv_div', {});
  function tirerReponse(cands, cle) {
    const t = lireDiv(), san = X.tirerDiverse(cands, t[cle] || {});
    if (san) { t[cle] = X.memoriserReponse(t[cle] || {}, san); const cles = Object.keys(t); if (cles.length > 400) delete t[cles[0]]; store.set('ec_ouv_div', t); }
    return san;
  }
  async function moteurSan(fen) { try { const b = await D.meilleurCoup(fen); if (!b) return null; return new Chess(fen).move({ from: b.slice(0, 2), to: b.slice(2, 4), promotion: b[4] }).san; } catch { return null; } }
  const TITRE_VERDICT = { reussite: 'Réussi', partiel: 'Réponse partielle', echec: 'Échec' };

  /* une position de la fiche : tu joues, puis l'adversaire répond (parties réelles + fiche + moteur, sans jamais promouvoir une réponse faible) */
  function briquePosition(ctx, it, P, fin, indice = '', table = null) {
    const { c, moi } = ctx, arbre = X.arbreDeFiche(c), reel = table || tableDe(c, moi); let premier = true; // seule la première tentative sur la position d'origine compte
    function tour(fen, suite, nb) {
      const hote = h('div', {}), retour = h('div', { class: 'retour' }), actions = h('div', { class: 'actions' });
      const lg = it.lignes[0] != null ? sansDe(c.lignes[it.lignes[0]].coups).slice(0, it.ply) : [], histo = lg.concat(suite);
      P.replaceChildren(h('div', { class: 'carte-n' }, indice), hote, h('p', { class: 'ctx' }, `Tu as les ${c.co}. ${histo.length ? libelle(histo, 1) : 'Début de partie.'}`), retour, actions);
      const noeud = arbre.get(X.cleDe(fen)), attendus = nb === 0 ? it.attendus : (noeud ? [...noeud.enfants.keys()] : []);
      const pl = D.plateauJouable(hote, { fen, bas: moi, couleur: moi, onMove });
      hote.dataset.ref = attendus.map(s => { const m = new Chess(fen).move(s); return m.from + m.to + (m.promotion || ''); }).join(',');
      async function onMove(m) {
        pl.bloquer(true); const apres = new Chess(fen); apres.move({ from: m.from, to: m.to, promotion: m.promotion });
        pl.set(apres.fen(), { dernier: m, anime: true });
        const ref = attendus.includes(m.san); let cl = 'meilleur', R = null;
        if (!ref) {
          retour.className = 'retour'; retour.textContent = 'Un instant…';
          try { ({ cl, R } = await juger(fen, m, moi)); } catch { cl = 'jouable'; }
        }
        const v = X.verdict(cl, ref, undefined);
        retour.className = 'retour ' + (v === 'reussite' ? 'bon' : v === 'partiel' ? 'partiel' : 'mauvais'); retour.innerHTML = '';
        retour.append(h('b', {}, ref ? 'Réussi : coup de la fiche.' : `${TITRE_VERDICT[v]} : ${X.LIBELLES[cl].toLowerCase()}.`));
        let note = ref && nb === 0 ? noteDeCoup(c, it, m.san) : '';
        if (ref && !note) { try { const r = pourquoiMeilleur(fen, m.uci, [], 0, { camp: moi })[0]; if (r) note = r.charAt(0).toUpperCase() + r.slice(1); } catch {} }
        if (note) retour.append(h('p', {}, note));
        if (!ref) { const att = attendus[0]; if (att) retour.append(h('p', {}, `La fiche joue ${att}${nb === 0 ? ' ici' : ''}. ${nb === 0 ? noteDeCoup(c, it, att) : ''}`.trim())); if (R && (cl === 'jouable' || cl === 'erreur')) retour.append(D.noeudExplication(D.explicationDe(R, fen, m.uci, 'tu'), { sansMeilleur: true, titre: `Pourquoi ${m.san} est moins bon` })); }
        let aide = false;
        if (nb === 0) { aide = enregistrer(c, it.id, issueDeVerdict(v), { re: !premier }); premier = false; ctx.maj(); }
        actions.innerHTML = '';
        if (v !== 'echec' && nb < 2) {
          const cle = X.cleDe(apres.fen()), cands = X.reponsesAdverses(arbre, apres.fen(), reel[cle] || {}, await moteurSan(apres.fen()));
          const san = tirerReponse(cands, cle);
          if (san) {
            const cand = cands.find(x => x.san === san);
            actions.append(bouton('Continuer cette position', () => { const nf = new Chess(apres.fen()); const r = nf.move(san); tour(nf.fen(), suite.concat([m.san, r.san]), nb + 1); }));
            if (cand && cand.reel) retour.append(h('p', { class: 'discret' }, `Réponse possible : ${san}, déjà rencontrée ${cand.reel} fois dans tes parties.`));
          }
        }
        if (v === 'echec') actions.append(bouton('Réessayer', () => tour(fen, suite, nb), 'btn discret'));
        if (aide) actions.append(bouton('Reprendre l’idée', () => reexpliquer(ctx, it.id, P, fin), 'btn discret'));
        actions.append(bouton(actions.children.length ? 'Passer' : 'Suivant', () => fin(v === 'reussite'), actions.children.length ? 'btn discret' : 'btn'));
      }
    }
    tour(it.fen, [], 0);
  }

  /* exercice de transfert : une position que la fiche ne contient pas ; réussi seulement si le coup applique le principe testé */
  function briqueTransfert(ctx, t, P, fin, indice = '', premierSeulement = { v: true }) {
    const { c, moi } = ctx, fen = fenDe(t.coups), hote = h('div', {}), retour = h('div', { class: 'retour' }), actions = h('div', { class: 'actions' });
    P.replaceChildren(h('div', { class: 'carte-n' }, indice), hote, h('p', { class: 'ctx' }, t.contexte), retour, actions);
    hote.dataset.ref = t.attendus.map(s => { const m = new Chess(fen).move(s); return m.from + m.to + (m.promotion || ''); }).join(',');
    const pl = D.plateauJouable(hote, { fen, bas: moi, couleur: moi, onMove });
    async function onMove(m) {
      pl.bloquer(true); const apres = new Chess(fen); apres.move({ from: m.from, to: m.to, promotion: m.promotion });
      pl.set(apres.fen(), { dernier: m, anime: true });
      let cl = 'meilleur', R = null; const prevu = t.attendus.includes(m.san);
      if (!prevu) { retour.textContent = 'Un instant…'; try { ({ cl, R } = await juger(fen, m, moi)); } catch { cl = 'jouable'; } }
      const v = X.verdict(cl, prevu, X.objectifAtteint(fen, m.san, t.objectif));
      retour.className = 'retour ' + (v === 'reussite' ? 'bon' : v === 'partiel' ? 'partiel' : 'mauvais'); retour.innerHTML = '';
      const pourquoiPartiel = cl === 'jouable' ? 'le coup est jouable mais moins précis' : 'le coup est correct, mais il ne montre pas l’idée de cet exercice';
      retour.append(h('b', {}, v === 'partiel' ? `Réponse partielle : ${pourquoiPartiel}.` : v === 'reussite' ? 'Réussi.' : 'Échec : ce coup dégrade ta position.'), h('p', {}, t.principe));
      if (v === 'echec' && R) retour.append(D.noeudExplication(D.explicationDe(R, fen, m.uci, 'tu'), { sansMeilleur: true, titre: `Pourquoi ${m.san} est moins bon` }));
      if (v !== 'reussite') retour.append(h('p', {}, `Un coup qui applique l’idée : ${t.attendus[0]}.`));
      const aide = enregistrer(c, t.id, issueDeVerdict(v), { re: !premierSeulement.v }); premierSeulement.v = false; ctx.maj(); actions.innerHTML = '';
      if (v !== 'reussite') actions.append(bouton('Réessayer', () => briqueTransfert(ctx, t, P, fin, indice, premierSeulement), 'btn discret'));
      if (aide) actions.append(bouton('Reprendre l’idée', () => reexpliquer(ctx, t.id, P, fin), 'btn discret'));
      actions.append(bouton('Suivant', () => fin(v === 'reussite')));
    }
  }

  /* exécute une brique selon le type de l'exercice (lecture du registre) */
  function lancerItem(ctx, id, P, fin, indice, table) {
    const { c } = ctx, L = cartesDe(c), m = regDe(c).get(id);
    if (!m) return fin(true);
    if (m.kind === 'q') return briqueCarte(ctx, L.cartes.find(x => x.id === id), P, fin, { indice });
    if (m.kind === 'r') return briqueLecture(ctx, L.reconnaitre.find(x => x.id === id), P, fin, indice);
    if (m.kind === 't') return briqueTransfert(ctx, L.transferts.find(x => x.id === id), P, fin, indice, { v: true });
    return briquePosition(ctx, X.positionsAppliquer(c).find(x => x.id === id), P, fin, indice, table);
  }
  /* Réexplication après des échecs répétés sur une notion : retour à l'idée, montrée sur l'échiquier et dite autrement
     (description tirée de la position), puis une situation proche de la même notion. Elle ne donne pas la réponse de l'exercice raté. */
  function reexpliquer(ctx, id, P, fin) {
    const { c, moi } = ctx, reg = regDe(c), m = reg.get(id), L = cartesDe(c); let fen, cases = [], fleches = [], texte = '', titre = 'Reprenons l’idée';
    if (m.kind === 'q' || m.kind === 'r') {
      const s = L.cartes.find(k => k.id === id) || L.reconnaitre.find(k => k.id === id), carte = L.cartes.find(k => k.notion === m.notion) || s;
      fen = fenDe(carte.coups); cases = carte.cases || []; fleches = carte.fleches || []; texte = carte.texte; titre = 'Reprenons : ' + carte.titre;
    } else if (m.kind === 't') {
      const t = L.transferts.find(k => k.id === id); fen = fenDe(t.coups); texte = t.principe;
    } else {
      const it = X.positionsAppliquer(c).find(k => k.id === id); fen = it.fen; texte = noteDeCoup(c, it, it.attendus[0]) || `Dans cette position, la fiche conseille ${it.attendus[0]}.`;
    }
    const sib = [...reg].filter(([k, v]) => k !== id && v.notion === m.notion && v.comp === m.comp).map(([k]) => k)[0] || [...reg].filter(([k, v]) => k !== id && v.notion === m.notion).map(([k]) => k)[0];
    const bd = plateauAnnote(), mots = decrire(fen, cases, fleches);
    P.replaceChildren(h('div', { class: 'carte' }, bd.env, h('h2', { class: 'carte-titre' }, titre),
      mots.length ? h('ul', { class: 'comp-detail' }, mots.map(t => h('li', {}, t))) : null, h('p', { class: 'carte-texte' }, texte),
      h('div', { class: 'carte-nav suite' }, sib ? bouton('Essayer une situation proche', () => lancerItem(ctx, sib, P, fin, 'Situation proche', null)) : bouton('Réessayer la question', () => lancerItem(ctx, id, P, fin, 'Nouvel essai', null)), bouton('Passer', () => fin(false), 'btn discret'))));
    bd.dessiner(fen, m.kind === 'q' || m.kind === 'r' ? (L.cartes.find(k => k.id === id) || L.reconnaitre.find(k => k.id === id)).cote || moi : moi, cases, fleches);
  }
  /* enchaîne une liste d'exercices, puis affiche un bilan */
  function enchainer(ctx, ids, titre, suiteUI) {
    const P = $('.fiche-panneau', ctx.ov.in_), table = tableDe(ctx.c, ctx.moi); let k = 0, bons = 0;
    if (!ids.length) { P.replaceChildren(h('p', { class: 'ana-msg' }, 'Rien à travailler pour le moment.')); return; }
    const suivant = () => {
      if (k >= ids.length) { ctx.maj(); P.replaceChildren(h('div', { class: 'bloc-cours' }, h('h3', {}, `${bons} réussi${bons > 1 ? 's' : ''} sur ${ids.length}`), suiteUI ? suiteUI() : h('span'), bouton('Terminer', () => ctx.aller('memoriser'), 'btn discret'))); return; }
      lancerItem(ctx, ids[k], P, ok => { if (ok) bons++; k++; suivant(); }, `${titre} · ${k + 1} / ${ids.length}`, table);
    };
    suivant();
  }

  /* ----- Comprendre : une idée par carte, question d'abord ----- */
  function panComprendre(ctx) {
    const { c } = ctx, L = cartesDe(c), cartes = L.cartes, P = h('div', { class: 'panneau' });
    let k = 0; const zone = h('div', {});
    function rendre() {
      const fin = k === cartes.length - 1;
      briqueCarte(ctx, cartes[k], zone, () => { if (fin) ctx.aller('reconnaitre'); else { k++; rendre(); } }, { indice: `${k + 1} / ${cartes.length}` });
      if (k > 0) zone.firstChild.append(h('div', { class: 'carte-nav' }, bouton('← Carte précédente', () => { k--; rendre(); }, 'btn discret')));
    }
    rendre(); P.append(zone, blocMesParties(ctx)); return P;
  }
  const $$$ = el => [...el.querySelectorAll('button')];

  function blocMesParties(ctx) {
    const { c } = ctx, { ps, s } = infoOuv(c), perso = D.persoDe(c, ps), B = h('div', { class: 'bloc-cours' }, h('h3', {}, 'Mes parties'));
    if (!s.n) { B.append(h('p', { class: 'ana-msg' }, 'Tu n’as pas encore joué cette ouverture en partie rapide.')); }
    else {
      B.append(h('div', { class: 'fiche-bilan' }, h('b', {}, D.pct(s.g, s.n) + ' %'), h('span', {}, `de victoires sur ${s.n} parties`)), D.barreRes(s), D.legRes(s, true));
      const v = (perso.variantes || [])[0];
      if (v) {
        const items = X.positionsAppliquer(c), cible = items.filter(it => it.lignes.includes(v.ligne >= 0 ? v.ligne : v.proche));
        B.append(h('div', { class: 'position-freq' }, h('p', {}, h('b', {}, 'Tu rencontres souvent : '), v.lib, ` (${v.n} parties).`),
          cible.length ? h('button', { class: 'btn discret petit', onclick: () => { ctx.aller('appliquer'); enchainer(ctx, cible.slice(0, 5).map(i => i.id), 'Cette position'); } }, 'Travailler cette position') : null));
      }
    }
    B.append(h('button', { class: 'btn discret petit', style: 'margin-top:10px', onclick: () => { ctx.ov.fermer(); D.ouvrirCours(c); } }, 'Fiche complète'));
    return B;
  }

  /* ----- Reconnaître : toucher la bonne case ----- */
  function panReconnaitre(ctx) {
    const { c } = ctx, qs = cartesDe(c).reconnaitre, P = h('div', { class: 'panneau' });
    const zone = h('div', {}); let k = 0, bons = 0; const ordre = melange(qs);
    function rendre() {
      if (k >= ordre.length) { zone.replaceChildren(h('div', { class: 'carte' }, h('h2', { class: 'carte-titre' }, `${bons} bonne${bons > 1 ? 's' : ''} réponse${bons > 1 ? 's' : ''} sur ${ordre.length}`), h('div', { class: 'carte-nav' }, bouton('Recommencer', () => { k = 0; bons = 0; rendre(); }, 'btn discret'), bouton('Passer à appliquer', () => ctx.aller('appliquer'))))); return; }
      briqueLecture(ctx, ordre[k], zone, ok => { if (ok) bons++; k++; rendre(); }, `${k + 1} / ${ordre.length}`);
    }
    rendre(); P.append(zone); return P;
  }

  /* ----- Appliquer : positions de la fiche (compétence « Appliquer »), puis positions nouvelles (compétence « Généraliser ») ----- */
  function choisirParmi(c, ids, n) {
    const histo = histoDe(c.id), vus = new Set(histo.map(e => e.id)), dus = new Set(X.aReviser(revDe(c.id), jour()));
    const D1 = ids.filter(i => dus.has(i)), nouveaux = melange(ids.filter(i => !vus.has(i) && !dus.has(i))), anciens = melange(ids.filter(i => vus.has(i) && !dus.has(i)));
    return melange([...D1.slice(0, 2), ...nouveaux, ...anciens].filter((v, i, a) => a.indexOf(v) === i).slice(0, n));
  }
  function panAppliquer(ctx) {
    const { c } = ctx, P = h('div', { class: 'panneau' }), items = X.positionsAppliquer(c), trans = cartesDe(c).transferts;
    if (items.length) P.append(h('div', { class: 'bloc-cours' }, h('h3', {}, 'À toi de jouer'), h('p', {}, 'Cinq positions tirées de cette ouverture. Un coup différent de la fiche est accepté s’il est aussi bon ; un coup seulement jouable est une réponse partielle, qui ne valide rien ; une erreur est un échec. Les réponses de l’adversaire viennent de tes parties, de la fiche et de Stockfish.'),
      bouton('Commencer', () => enchainer(ctx, choisirParmi(c, items.map(i => i.id), 5), 'Séance', () => bouton('Une autre séance', () => enchainer(ctx, choisirParmi(c, items.map(i => i.id), 5), 'Séance'))))));
    if (trans.length) P.append(h('div', { class: 'bloc-cours' }, h('h3', {}, 'Même idée, autre position'), h('p', {}, 'Des positions que la fiche ne contient pas : il faut reconnaître l’idée et la réutiliser. Seul un coup qui applique l’idée compte comme réussi.'),
      bouton('Essayer', () => enchainer(ctx, choisirParmi(c, trans.map(t => t.id), 3), 'Nouvelle position'))));
    return P;
  }

  /* ----- Mémoriser : séance de révision mêlée, bilan, maîtrise ----- */
  const LIB_NOTION = { idee: 'l’idée de l’ouverture', plan: 'le plan', erreur: 'l’erreur à éviter', pieces: 'le rôle des pièces', centre: 'le centre', adaptation: 'les adaptations',
    reponse: 'une réponse imprévue de l’adversaire', ordre: 'un autre ordre de coups', echange: 'un échange', piece: 'une pièce déplacée', structure: 'une autre structure' };
  const libManque = (c, x) => (x.comp === 'choisir' ? `la ligne « ${(c.lignes[+x.notion.slice(1)] || {}).nom || x.notion} »` : LIB_NOTION[x.notion] || x.notion);
  function panMemoriser(ctx) {
    const { c } = ctx, P = h('div', { class: 'panneau' }), reg = regDe(c), rev = Object.fromEntries(Object.entries(revDe(c.id)).filter(([i]) => reg.has(i)));
    const dus = X.aReviser(rev, jour()), ids = X.selectionRevision(rev, reg, jour(), 6);
    const B = h('div', { class: 'bloc-cours premier' }, h('h3', {}, 'Révisions'));
    if (dus.length) B.append(h('p', {}, `${dus.length} point${dus.length > 1 ? 's' : ''} à revoir : idées, lecture de position, coups et positions nouvelles, mêlés.`), bouton('Réviser maintenant', () => enchainer(ctx, ids, 'Révision', dus.length > ids.length ? () => bouton('Continuer', () => enchainer(ctx, X.selectionRevision(Object.fromEntries(Object.entries(revDe(c.id)).filter(([i]) => reg.has(i))), reg, jour(), 6), 'Révision')) : null)));
    else {
      const proch = Object.values(rev).map(r => r.prochaine).sort()[0];
      B.append(h('p', { class: 'ana-msg' }, proch ? `Rien à revoir aujourd’hui. Prochaine révision : ${new Date(proch + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.` : 'Ce que tu travailles dans les autres onglets reviendra ici au bon moment.'));
    }
    P.append(B);
    const comp = compDe(c), rep = lireRep(), manque = X.fondamentalesManquantes(histoDe(c.id), regDe(c), c);
    const M = h('div', { class: 'bloc-cours' }, h('h3', {}, 'Où j’en suis'), pastilles(comp),
      h('ul', { class: 'comp-detail' }, X.COMPETENCES.map(([k, l]) => h('li', {}, `${l} : ${comp[k].total ? `${comp[k].acquises} idée${comp[k].acquises > 1 ? 's' : ''} sur ${comp[k].total} bien installée${comp[k].acquises > 1 ? 's' : ''}` : 'pas d’exercice'}`))));
    if (etatDe(rep, c.id) === 'cours') {
      if (X.prete(comp)) M.append(h('p', {}, 'Les quatre points sont solides, sur plusieurs jours, y compris les notions fondamentales. C’est toi qui décides : veux-tu considérer cette ouverture comme maîtrisée ?'),
        h('button', { class: 'btn', onclick: () => { ecrireRep(changer(lireRep(), c.id, 'maitrisee', jour())); ctx.fermer(); } }, 'Je la considère maîtrisée'));
      else {
        M.append(h('p', { class: 'ana-msg' }, 'Une ouverture se maîtrise quand chaque idée fondamentale est réussie dans plusieurs positions, à au moins trois jours d’intervalle, y compris dans des positions nouvelles.'));
        if (manque.length) M.append(h('p', {}, 'Il reste à installer :'), h('ul', { class: 'comp-detail' }, manque.map(x => h('li', {}, `${X.COMPETENCES.find(([k]) => k === x.comp)[1]} : ${libManque(c, x)}`))));
      }
    } else if (etatDe(rep, c.id) === 'maitrisee' && fragile(c)) M.append(h('p', {}, 'Plusieurs points fondamentaux ont été ratés récemment. Tu peux la remettre en apprentissage.'), h('button', { class: 'btn discret', onclick: () => { ecrireRep(changer(lireRep(), c.id, 'cours', jour())); ctx.fermer(); } }, 'Remettre en cours'));
    P.append(M);
    const lignes = c.lignes.concat((c.pieges || []).map(p => ({ nom: 'Piège : ' + p.titre, coups: p.coups, resume: p.texte, notes: {}, piege: true })));
    P.append(h('details', { class: 'plie plat' }, h('summary', {}, 'Rejouer une ligne en entier'),
      lignes.map((l, i) => h('button', { class: 'rep-ligne', onclick: () => D.entrainerLigne(ctx.ov, c, lignes, i, () => ouvrirApprendre(c, 'memoriser')) }, h('b', {}, l.nom)))));
    return P;
  }

  return { vueRepertoire, ouvrirApprendre };
}
