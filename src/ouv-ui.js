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
  const noter = (id, e) => { const t = store.get('ec_ouv_histo', {}); t[id] = (t[id] || []).concat({ ...e, j: jour() }).slice(-300); store.set('ec_ouv_histo', t); };
  const revDe = id => (store.get('ec_ouv_rev', {})[id] || {});
  const planifierRev = (id, itemId, ok) => { const t = store.get('ec_ouv_rev', {}); t[id] = t[id] || {}; t[id][itemId] = X.planifier(t[id][itemId], ok, jour()); store.set('ec_ouv_rev', t); };

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
  const infoOuv = c => { const ps = D.partiesDuCours(c), s = D.stats(ps); return { ps, s, comp: X.competences(histoDe(c.id)), dus: X.aReviser(revDe(c.id), jour()).length }; };
  function prochaineAction(c, comp, dus) {
    if (dus > 0) return { label: `Réviser (${dus})`, onglet: 'memoriser' };
    if (comp.comprendre.etat !== 'solide') return { label: 'Continuer : comprendre', onglet: 'comprendre' };
    if (comp.reconnaitre.etat !== 'solide' && cartesDe(c).reconnaitre.length) return { label: 'Continuer : reconnaître', onglet: 'reconnaitre' };
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
      if (!sl.cours.length) {
        if (!tout) bloc.append(h('p', { class: 'rep-vide' }, 'Pas encore de fiche pour cet emplacement.'));
        else if (r) { const c = COURS.find(x => x.id === r.id); bloc.append(h('div', { class: 'rep-reco' }, h('p', {}, `Tu as joué ${r.n} parties avec « ${c.nom} ». Tu peux commencer par celle-ci.`),
          h('button', { class: 'btn', onclick: () => ajouter(c, rep) }, 'Travailler cette ouverture'))); }
        else bloc.append(h('p', { class: 'rep-vide' }, 'Choisis une ouverture à travailler.'));
      }
      if (sl.dispo.length && sl.cours.length < 2) {
        const liste = h('div', { class: 'rep-choix', hidden: true }, sl.dispo.map(c => h('button', { class: 'rep-ligne', onclick: () => ajouter(c, rep) }, h('b', {}, c.nom), h('small', {}, `${c.debut}${nP[c.id] ? ` · ${nP[c.id]} parties` : ''}`))));
        bloc.append(h('button', { class: 'btn discret petit', onclick: () => { liste.hidden = !liste.hidden; } }, sl.cours.length ? 'Ajouter une ouverture' : 'Voir les ouvertures disponibles'), liste);
      }
      if (sl.maitrisees.length) bloc.append(h('details', { class: 'plie plat' }, h('summary', {}, `Maîtrisées (${sl.maitrisees.length})`),
        sl.maitrisees.map(c => h('div', { class: 'rep-ligne fixe' }, h('b', {}, c.nom), h('button', { class: 'btn discret petit', onclick: () => { ecrireRep(changer(lireRep(), c.id, 'cours', jour())); vueRepertoire(); } }, 'Reprendre')))));
      v.append(bloc);
    });
    v.append(h('button', { class: 'btn discret', style: 'margin:18px 20px 0', onclick: () => { S.ouvMode = 'biblio'; D.vueOuvertures(); } }, `Bibliothèque des fiches (${COURS.length})`));
    v.append(h('details', { class: 'plie plat discret' }, h('summary', {}, 'Diagnostic'), h('div', { id: 'alerte-ouv' }, D.alerteDonnees()), h('div', { id: 'donnees-ouv', class: 'donnees-ouv' }, ...D.contenuDonnees())));
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
    function majSuivi() { suivi.replaceChildren(pastilles(X.competences(histoDe(c.id)))); }
    function aller(k) {
      onglet = k; tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.o === k));
      panneau.replaceChildren(k === 'comprendre' ? panComprendre(ctx) : k === 'reconnaitre' ? panReconnaitre(ctx) : k === 'appliquer' ? panAppliquer(ctx) : panMemoriser(ctx));
      ov.in_.parentElement.scrollTop = 0; majSuivi();
    }
    aller(onglet);
  }

  /* ----- Comprendre : une idée par carte, avec son échiquier ----- */
  function panComprendre(ctx) {
    const { c, moi } = ctx, L = cartesDe(c), cartes = L.cartes, P = h('div', { class: 'panneau' });
    let k = 0; const lues = new Set();
    const zone = h('div', { class: 'carte' });
    function rendre() {
      const ca = cartes[k], bd = plateauAnnote();
      zone.replaceChildren(h('div', { class: 'carte-n' }, `${k + 1} / ${cartes.length}`),
        bd.env, h('h2', { class: 'carte-titre' }, ca.titre), h('p', { class: 'carte-texte' }, ca.texte));
      bd.dessiner(fenDe(ca.coups), ca.cote || moi, ca.cases || [], ca.fleches || []);
      if (ca.q) {
        const rep = h('div', { class: 'qcm' }), fb = h('p', { class: 'qcm-fb' });
        melange(ca.q.options.map((t, i) => ({ t, i }))).forEach(o => rep.append(h('button', { class: 'qcm-opt', onclick: ev => {
          if (lues.has(ca.id)) return; lues.add(ca.id); const ok = o.i === ca.q.bonne;
          $$$(rep).forEach(b => { b.disabled = true; }); ev.currentTarget.classList.add(ok ? 'ok' : 'ko');
          fb.textContent = (ok ? 'Exact. ' : 'Pas tout à fait. ') + ca.q.explication; noter(c.id, { c: 'comprendre', ok, id: ca.id }); ctx.maj();
        } }, o.t)));
        zone.append(h('p', { class: 'qcm-q' }, ca.q.question), rep, fb);
      } else zone.append(h('button', { class: 'btn discret petit', onclick: ev => { if (lues.has(ca.id)) return; lues.add(ca.id); noter(c.id, { c: 'comprendre', ok: true, id: ca.id }); ev.currentTarget.textContent = 'Noté'; ctx.maj(); } }, 'Compris'));
      const fin = k === cartes.length - 1;
      zone.append(h('div', { class: 'carte-nav' },
        h('button', { class: 'btn discret', disabled: k === 0, onclick: () => { k--; rendre(); } }, '← Précédent'),
        fin ? h('button', { class: 'btn', onclick: () => ctx.aller(L.reconnaitre.length ? 'reconnaitre' : 'appliquer') }, L.reconnaitre.length ? 'Passer à reconnaître' : 'Passer à appliquer') : h('button', { class: 'btn', onclick: () => { k++; rendre(); } }, 'Suivant →')));
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
          cible.length ? h('button', { class: 'btn discret petit', onclick: () => { ctx.aller('appliquer'); lancerSerie(ctx, cible.slice(0, 5), 'Cette position'); } }, 'Travailler cette position') : null));
      }
    }
    B.append(h('button', { class: 'btn discret petit', style: 'margin-top:10px', onclick: () => { ctx.ov.fermer(); D.ouvrirCours(c); } }, 'Fiche complète'));
    return B;
  }

  /* ----- Reconnaître : toucher la bonne case ----- */
  function panReconnaitre(ctx) {
    const { c, moi } = ctx, qs = cartesDe(c).reconnaitre, P = h('div', { class: 'panneau' });
    if (!qs.length) { P.append(h('div', { class: 'bloc-cours' }, h('p', { class: 'ana-msg' }, 'Les exercices de lecture de position ne sont pas encore écrits pour cette ouverture.'), h('button', { class: 'btn', onclick: () => ctx.aller('appliquer') }, 'Passer à appliquer'))); return P; }
    const ordre = melange(qs); let k = 0, bons = 0;
    const zone = h('div', { class: 'carte' });
    function rendre() {
      if (k >= ordre.length) { zone.replaceChildren(h('h2', { class: 'carte-titre' }, `${bons} bonne${bons > 1 ? 's' : ''} réponse${bons > 1 ? 's' : ''} sur ${ordre.length}`), h('div', { class: 'carte-nav' }, h('button', { class: 'btn discret', onclick: () => { k = 0; bons = 0; rendre(); } }, 'Recommencer'), h('button', { class: 'btn', onclick: () => ctx.aller('appliquer') }, 'Passer à appliquer'))); return; }
      const q = ordre[k], bd = plateauAnnote(), fb = h('p', { class: 'qcm-fb' }); let repondu = false;
      zone.replaceChildren(h('div', { class: 'carte-n' }, `${k + 1} / ${ordre.length}`), bd.env, h('p', { class: 'qcm-q' }, q.question), fb);
      bd.dessiner(fenDe(q.coups), q.cote || moi, [], [], nom => {
        if (repondu) return; repondu = true; const ok = nom === q.reponse; if (ok) bons++;
        bd.dessiner(fenDe(q.coups), q.cote || moi, q.cases.concat(ok ? [] : [{ sq: nom, role: 'danger' }]), q.fleches);
        fb.textContent = (ok ? 'Exact. ' : 'Pas cette case. ') + q.explication; noter(c.id, { c: 'reconnaitre', ok, id: q.id }); ctx.maj();
        zone.append(h('div', { class: 'carte-nav' }, h('span'), h('button', { class: 'btn', onclick: () => { k++; rendre(); } }, 'Suivant →')));
      });
    }
    rendre(); P.append(zone); return P;
  }

  /* ----- Appliquer : jouer un coup, accepté s'il est correct même s'il diffère de la fiche ----- */
  const noteDeCoup = (c, item, san) => {
    for (const li of item.lignes) { const l = c.lignes[li]; if (!l) continue; const J = sansDe(l.coups); if (J[item.ply] === san) { const n = l.notes && l.notes[item.ply + 1]; const t = typeof n === 'object' && n ? n.t : n; if (t) return t; } }
    return '';
  };
  function choisirItems(c, n = 5) {
    const tous = X.positionsAppliquer(c), histo = histoDe(c.id), vus = new Set(histo.filter(e => e.c === 'choisir' || e.c === 'generaliser').map(e => e.id));
    const dus = new Set(X.aReviser(revDe(c.id), jour())), D1 = tous.filter(i => dus.has(i.id)), nouveaux = melange(tous.filter(i => !vus.has(i.id))), anciens = melange(tous.filter(i => vus.has(i.id) && !dus.has(i.id)));
    return melange([...D1.slice(0, 2), ...nouveaux, ...anciens].filter((v, i, a) => a.indexOf(v) === i).slice(0, n));
  }
  function panAppliquer(ctx) {
    const { c } = ctx, P = h('div', { class: 'panneau' }), items = X.positionsAppliquer(c);
    if (!items.length) { P.append(h('p', { class: 'ana-msg' }, 'Aucune position à jouer pour cette ouverture.')); return P; }
    P.append(h('div', { class: 'bloc-cours' }, h('h3', {}, 'À toi de jouer'), h('p', {}, 'Cinq positions tirées de cette ouverture. Joue le coup qui te semble bon : un coup différent de la fiche est accepté s’il reste correct.'),
      h('button', { class: 'btn', onclick: () => lancerSerie(ctx, choisirItems(c, 5), 'Séance') }, 'Commencer')));
    return P;
  }
  function lancerSerie(ctx, items, titre) {
    const P = $('.fiche-panneau', ctx.ov.in_), { c, moi } = ctx, arbre = X.arbreDeFiche(c), poids = {};
    if (!items.length) { P.replaceChildren(h('p', { class: 'ana-msg' }, 'Rien à travailler pour le moment.')); return; }
    let idx = 0, bonnes = 0;
    function item() {
      if (idx >= items.length) { P.replaceChildren(h('div', { class: 'bloc-cours' }, h('h3', {}, `${bonnes} bon${bonnes > 1 ? 's' : ''} coup${bonnes > 1 ? 's' : ''} sur ${items.length}`),
        h('button', { class: 'btn', onclick: () => lancerSerie(ctx, choisirItems(c, 5), titre) }, 'Une autre séance'), h('button', { class: 'btn discret', style: 'margin-left:8px', onclick: () => ctx.aller('memoriser') }, 'Terminer'))); ctx.maj(); return; }
      position(items[idx], items[idx].fen, [], 0, true);
    }
    /* une position : on joue, on voit le retour, puis (si le coup est correct) la suite de la variante */
    function position(it, fen, suite, nb, premier) {
      const hote = h('div', {}), retour = h('div', { class: 'retour' }), actions = h('div', { class: 'actions' });
      const lg = it.lignes[0] != null ? sansDe(c.lignes[it.lignes[0]].coups).slice(0, it.ply) : [];
      const histo = lg.concat(suite);
      P.replaceChildren(h('div', { class: 'carte-n' }, `${titre} · ${idx + 1} / ${items.length}`), hote,
        h('p', { class: 'ctx' }, `Tu as les ${c.co}. ${histo.length ? libelle(histo, 1) : 'Début de partie.'}`), retour, actions);
      const attendusLocal = nb === 0 ? it.attendus : (arbre.get(fen.split(' ').slice(0, 4).join(' ')) ? [...arbre.get(fen.split(' ').slice(0, 4).join(' ')).enfants.keys()] : []);
      const pl = D.plateauJouable(hote, { fen, bas: moi, couleur: moi, onMove });
      hote.dataset.ref = attendusLocal.map(s => { const m = new Chess(fen).move(s); return m.from + m.to + (m.promotion || ''); }).join(',');
      async function onMove(m) {
        pl.bloquer(true); const apres = new Chess(fen); apres.move({ from: m.from, to: m.to, promotion: m.promotion });
        pl.set(apres.fen(), { dernier: m, anime: true });
        const ref = attendusLocal.includes(m.san); let cl = 'meilleur', R = null;
        if (!ref) {
          retour.className = 'retour'; retour.textContent = 'Un instant…';
          try { R = await D.profond(fen, m.uci); const mien = e => (moi === 'w' ? e : -e); cl = X.classerCoup(winPct(mien(R.rb.e)) - winPct(mien(R.ra.e)), m.uci === R.rb.b); } catch { cl = 'jouable'; }
        }
        const ok = X.accepte(cl);
        retour.className = 'retour ' + (ok ? 'bon' : 'mauvais'); retour.innerHTML = '';
        retour.append(h('b', {}, ref ? 'Coup de la fiche.' : X.LIBELLES[cl] + '.'));
        let note = ref && nb === 0 ? noteDeCoup(c, it, m.san) : '';
        if (ref && !note) { try { const r = pourquoiMeilleur(fen, m.uci, [], 0, { camp: moi })[0]; if (r) note = r.charAt(0).toUpperCase() + r.slice(1); } catch {} }
        if (note) retour.append(h('p', {}, note));
        if (!ref) { const att = attendusLocal[0]; retour.append(h('p', {}, att ? `La fiche joue ${att}${nb === 0 ? ' ici' : ''}. ${noteDeCoup(c, it, att)}`.trim() : '')); if (R && (cl === 'jouable' || cl === 'erreur')) retour.append(D.noeudExplication(D.explicationDe(R, fen, m.uci, 'tu'), { sansMeilleur: true, titre: `Pourquoi ${m.san} est moins bon` })); }
        if (nb === 0) {
          const comp = X.competenceApplication(histoDe(c.id), it.id); noter(c.id, { c: comp, ok, id: it.id }); planifierRev(c.id, it.id, ok); if (ok) bonnes++; ctx.maj();
        }
        actions.innerHTML = '';
        if (ok && nb < 2) {
          const prochain = ref ? X.tirer(X.reponsesAdverses(arbre, apres.fen(), poids)) : await adversaireMoteur(apres.fen());
          if (prochain) actions.append(h('button', { class: 'btn', onclick: async () => { const nf = new Chess(apres.fen()); const r = nf.move(prochain); position(it, nf.fen(), suite.concat([m.san, r.san]), nb + 1, false); } }, 'Continuer cette position'));
        }
        if (!ok) actions.append(h('button', { class: 'btn discret', onclick: () => position(it, fen, suite, nb, false) }, 'Réessayer'));
        actions.append(h('button', { class: 'btn' + (ok && actions.children.length ? ' discret' : ''), onclick: () => { idx++; item(); } }, idx + 1 >= items.length ? 'Terminer' : 'Position suivante'));
      }
    }
    async function adversaireMoteur(fen) { try { const b = await D.meilleurCoup(fen); const g = new Chess(fen); return b ? g.move({ from: b.slice(0, 2), to: b.slice(2, 4), promotion: b[4] }).san : null; } catch { return null; } }
    item();
  }

  /* ----- Mémoriser : révisions espacées, lignes entières, maîtrise ----- */
  function panMemoriser(ctx) {
    const { c } = ctx, P = h('div', { class: 'panneau' }), rev = revDe(c.id), dus = X.aReviser(rev, jour()), items = X.positionsAppliquer(c);
    const B = h('div', { class: 'bloc-cours premier' }, h('h3', {}, 'Révisions'));
    if (dus.length) B.append(h('p', {}, `${dus.length} position${dus.length > 1 ? 's' : ''} à revoir aujourd’hui.`), h('button', { class: 'btn', onclick: () => lancerSerie(ctx, items.filter(i => dus.includes(i.id)).slice(0, 8), 'Révision') }, 'Réviser maintenant'));
    else {
      const proch = Object.values(rev).map(r => r.prochaine).sort()[0];
      B.append(h('p', { class: 'ana-msg' }, proch ? `Rien à revoir aujourd’hui. Prochaine révision : ${new Date(proch + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.` : 'Les positions que tu travailles dans « Appliquer » viendront ici pour être revues au bon moment.'));
    }
    P.append(B);
    const comp = X.competences(histoDe(c.id)), rep = lireRep();
    if (etatDe(rep, c.id) === 'cours') {
      const M = h('div', { class: 'bloc-cours' }, h('h3', {}, 'Où j’en suis'), pastilles(comp));
      if (X.prete(comp)) M.append(h('p', {}, 'Tu sembles à l’aise sur les quatre points. Tu décides : veux-tu la considérer comme maîtrisée ?'),
        h('button', { class: 'btn', onclick: () => { ecrireRep(changer(lireRep(), c.id, 'maitrisee', jour())); ctx.fermer(); } }, 'Je la considère maîtrisée'));
      else M.append(h('p', { class: 'ana-msg' }, 'Une ouverture est maîtrisée quand tu sais l’appliquer dans des positions que tu n’as pas apprises par cœur.'));
      P.append(M);
    }
    const lignes = c.lignes.concat((c.pieges || []).map(p => ({ nom: 'Piège : ' + p.titre, coups: p.coups, resume: p.texte, notes: {}, piege: true })));
    const L = h('details', { class: 'plie plat' }, h('summary', {}, 'Rejouer une ligne en entier'),
      lignes.map((l, i) => h('button', { class: 'rep-ligne', onclick: () => D.entrainerLigne(ctx.ov, c, lignes, i, () => ouvrirApprendre(c, 'memoriser')) }, h('b', {}, l.nom))));
    P.append(L); return P;
  }

  return { vueRepertoire, ouvrirApprendre };
}
