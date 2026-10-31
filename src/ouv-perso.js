/* Analyse personnalisée d'une ouverture, à partir de TES parties.
   Tout est déterministe (comptages et pourcentages) : aucune tendance n'est inventée.
   Entrées :
   - cours   : fiche de l'ouverture (debut, co, lignes…)
   - parties : parties rapides concernées { u, co, issue ('g'|'p'|'n'), ea (elo adverse), t, … }
   - mv      : { url : "e4 e5 Nf3 …" } (30 premiers demi-coups de chaque partie)
   - ana     : { url : résumé d'analyse } ; resume.op = { of: [[ply, cls, perte, meilleurSAN, type]], e10, e15 } si la partie est analysée
   Une partie sans analyse moteur sert aux statistiques et aux coups joués, jamais aux erreurs. */

import { sansDe, libelle, cleApres } from './positions.js';
export { sansDe, libelle };

const pc = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const bil = arr => { const r = { n: arr.length, g: 0, p: 0, nul: 0 }; for (const x of arr) r[x.g.issue === 'g' ? 'g' : x.g.issue === 'p' ? 'p' : 'nul']++; return r; };
const moyenne = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const GRAVE = c => c === 'g' || c === 'e';

export function analyserOuverture(cours, parties, mv, ana) {
  const D = sansDe(cours.debut), L = D.length, moi = cours.co === 'blancs' ? 0 : 1;
  const G = parties.map(g => ({ g, m: mv[g.u] ? mv[g.u].split(' ') : null, a: ana[g.u] && ana[g.u].op ? ana[g.u] : null }));
  const AN = G.filter(x => x.a && x.m);
  const out = { n: G.length, nAna: AN.length, L, D };

  /* ---- 1. statistiques ---- */
  const b = bil(G);
  out.bilan = { ...b, nonDef: pc(b.g + b.nul, b.n), vic: pc(b.g, b.n), elo: Math.round(moyenne(G.map(x => x.g.ea).filter(e => e != null)) || 0) || null };
  const tri = G.slice().sort((x, y) => x.g.t - y.g.t);
  out.evol = [];
  for (let fin = tri.length; fin >= 5 && out.evol.length < 6; fin -= 10) { const bl = tri.slice(Math.max(0, fin - 10), fin); if (bl.length >= 5) out.evol.unshift({ n: bl.length, vic: pc(bl.filter(x => x.g.issue === 'g').length, bl.length) }); }
  const fautesDe = x => (x.a.op.of || []);
  const gravesDe = x => fautesDe(x).filter(f => GRAVE(f[1]));
  out.ouvertureFautes = null;
  if (AN.length) {
    const sev = { g: 0, e: 0, i: 0, aucune: 0 };
    for (const x of AN) { const o = fautesDe(x); const c = o.some(f => f[1] === 'g') ? 'g' : o.some(f => f[1] === 'e') ? 'e' : o.some(f => f[1] === 'i') ? 'i' : 'aucune'; sev[c]++; }
    out.ouvertureFautes = { n: AN.length, ...sev };
  }

  /* ---- 2. variantes rencontrées ---- */
  const V = new Map();
  for (const x of G) {
    if (!x.m || x.m.length <= L) continue;
    const jet = x.m.slice(L, L + 2), cle = jet.join(' ');
    const v = V.get(cle) || { cle, jet, parties: [] }; v.parties.push(x); V.set(cle, v);
  }
  const total = [...V.values()].reduce((s, v) => s + v.parties.length, 0);
  const lignesCle = cours.lignes.map(l => sansDe(l.coups).slice(L, L + 2).join(' '));
  out.variantes = [...V.values()].filter(v => v.parties.length >= 3).map(v => {
    const s = bil(v.parties), an = v.parties.filter(x => x.a && x.m);
    const gr = an.filter(x => gravesDe(x).length).length;
    const e10 = moyenne(an.map(x => x.a.op.e10).filter(e => e != null));
    const dern = v.parties.slice().sort((x, y) => y.g.t - x.g.t)[0];
    return {
      cle: v.cle, lib: libelle(v.jet, L + 1), n: s.n, g: s.g, p: s.p, nul: s.nul, vic: pc(s.g, s.n), def: pc(s.p, s.n), nonDef: pc(s.g + s.nul, s.n),
      part: pc(s.n, total), principale: s.n / total >= 0.2, nAna: an.length, graves: gr, e10: e10 == null ? null : Math.round(e10),
      probleme: s.n >= 5 && s.p / s.n >= 0.55, solide: s.n >= 5 && s.g / s.n >= 0.6,
      ligne: lignesCle.indexOf(v.cle), proche: lignesCle.findIndex(c => c.split(' ')[0] === v.jet[0]), exemple: dern.g, aperdre: s.n * (0.5 - (s.g + 0.5 * s.nul) / s.n)
    };
  }).sort((a, b2) => b2.n - a.n);
  out.autresVar = total - out.variantes.reduce((s, v) => s + v.n, 0);
  out.priorite = out.variantes.filter(v => v.aperdre > 0.25 && v.n >= 4).sort((a, b2) => b2.aperdre - a.aperdre).map(v => v.cle);

  /* priorité des lignes du cours : rencontrées dans tes parties, puis celles qui te posent problème */
  out.lignes = cours.lignes.map((l, i) => {
    const ex = out.variantes.filter(w => w.ligne === i), pr = out.variantes.filter(w => w.ligne < 0 && w.proche === i);
    const vs = ex.length ? ex : pr;
    return { i, n: vs.reduce((s, w) => s + w.n, 0), exacte: ex.length > 0, probleme: vs.some(w => w.probleme), principale: vs.some(w => w.principale), rang: Math.min(99, ...vs.map(w => out.priorite.indexOf(w.cle)).filter(k => k >= 0)) };
  });

  /* ---- 3. coups que tu joues systématiquement ---- */
  out.habituels = [];
  { let pool = G.filter(x => x.m && x.m.length > L), pref = D.slice();
    for (let pas = 0; pas < 16 && pool.length >= 8; pas++) {
      const idx = pref.length; pool = pool.filter(x => x.m.length > idx); if (pool.length < 8) break;
      const cnt = new Map(); pool.forEach(x => cnt.set(x.m[idx], (cnt.get(x.m[idx]) || 0) + 1));
      const top = [...cnt.entries()].sort((a, b2) => b2[1] - a[1]);
      if (idx % 2 === moi) out.habituels.push({ ply: idx + 1, san: top[0][0], n: top[0][1], N: pool.length, part: pc(top[0][1], pool.length), apres: pref.slice(Math.max(L, idx - 2)), alt: top.slice(1, 3).map(([san, n]) => ({ san, n })) });
      pref = pref.concat(top[0][0]); pool = pool.filter(x => x.m[idx] === top[0][0]);
    } }

  /* ---- 4. erreurs réelles (moteur) ---- */
  out.recurrentes = []; out.reponses = []; out.sortie = null; out.phases = null; out.perdues = null; out.types = null;
  if (AN.length) {
    const pos = new Map(), parOpp = new Map(), occOpp = new Map(), types = { tact: 0, strat: 0 };
    for (const x of AN) {
      const m = x.m;
      for (const f of fautesDe(x)) {
        const [ply, cls, perte, best, type] = f; if (ply > m.length) continue;
        const san = m[ply - 1], avant = m.slice(0, ply - 1);
        if (GRAVE(cls)) types[type === 'autre' ? 'strat' : 'tact']++;
        const cp = cleApres(m, ply - 1); if (cp == null) continue;
        const k = cp + '|' + san;
        const e = pos.get(k) || { avant, san, ply, parties: [], pertes: [], bests: new Map() };
        e.parties.push(x.g); e.pertes.push(perte); if (best) e.bests.set(best, (e.bests.get(best) || 0) + 1); pos.set(k, e);
        if (GRAVE(cls) && ply >= 2) { const o = m[ply - 2]; const q = parOpp.get(o) || []; q.push({ g: x.g, ply, san, best, perte }); parOpp.set(o, q); }
      }
      for (let idx = 1; idx < Math.min(30, m.length); idx++) if (idx % 2 === moi) occOpp.set(m[idx - 1], (occOpp.get(m[idx - 1]) || 0) + 1);
    }
    out.types = types;
    out.recurrentes = [...pos.values()].filter(e => e.parties.length >= 2).map(e => ({ avant: e.avant, san: e.san, ply: e.ply, n: e.parties.length, perte: Math.round(moyenne(e.pertes)), best: [...e.bests.entries()].sort((a, b2) => b2[1] - a[1]).map(z => z[0])[0] || null, parties: e.parties.slice().sort((a, b2) => b2.t - a.t) }))
      .sort((a, b2) => b2.n * b2.perte - a.n * a.perte).slice(0, 5);
    out.reponses = [...parOpp.entries()].map(([o, q]) => ({ opp: o, F: new Set(q.map(z => z.g.u)).size, T: occOpp.get(o) || 0, ex: q.sort((a, b2) => b2.perte - a.perte)[0] }))
      .filter(r => r.F >= 3 && r.T && r.F / r.T >= 0.4).sort((a, b2) => b2.F - a.F).slice(0, 3);
    const e10 = AN.map(x => x.a.op.e10).filter(e => e != null);
    if (e10.length >= 5) out.sortie = { n: e10.length, moy: Math.round(moyenne(e10)), bon: e10.filter(e => e >= 55).length, mauvais: e10.filter(e => e < 40).length };
    const ph = { o: [0, 0], m: [0, 0], f: [0, 0] }; let nph = 0;
    for (const x of AN) { const s = x.a.st && x.a.st.ph; if (!s) continue; nph++; for (const k of ['o', 'm', 'f']) ph[k][0] += s[k][1] + s[k][2]; }
    if (nph) out.phases = { n: nph, o: ph.o[0] / nph, m: ph.m[0] / nph, f: ph.f[0] / nph };
    const per = AN.filter(x => x.g.issue === 'p' && x.a.op.e10 != null);
    if (per.length >= 3) out.perdues = { n: per.length, correcte: per.filter(x => x.a.op.e10 >= 45).length, moyen: per.filter(x => x.a.op.e10 >= 30 && x.a.op.e10 < 45).length, mauvaise: per.filter(x => x.a.op.e10 < 30).length };
  }

  /* ---- 5. recommandations (chacune appuyée par tes parties) ---- */
  const R = [], insuffisant = [];
  const mine = (m, k) => k % 2 === moi;
  /* Règle de conception : une fréquence décrit un comportement, elle ne prouve pas une faute.
     Roque et dame : on affiche d'abord un constat statistique neutre (obs: true). Un « défaut » (obs: false, conseil)
     n'apparaît que si Stockfish associe le comportement à des erreurs dans les parties analysées.
     Les seuils ci-dessous sont des repères d'affichage, pas des seuils statistiques. */
  // a) roque
  { const el = G.filter(x => x.m && x.m.length >= 24);
    if (el.length >= 8) {
      const roqueEntre = (x, de, a) => { for (let k = de; k < Math.min(a, x.m.length); k++) if (mine(x.m, k) && x.m[k].startsWith('O-O')) return true; return false; };
      const aTemps = x => roqueEntre(x, 0, 20);
      const sans = el.filter(x => !aTemps(x)), avec = el.filter(aTemps);
      if (sans.length >= 3 && sans.length / el.length >= 0.25) {
        const apres = sans.filter(x => roqueEntre(x, 20, 30)).length;
        const bouge = sans.filter(x => !roqueEntre(x, 20, 30) && x.m.some((s, k) => k < 30 && mine(x.m, k) && s[0] === 'K')).length;
        const centre = sans.length - apres - bouge;
        const pa = avec.length >= 5 ? pc(avec.filter(x => x.g.issue === 'g').length, avec.length) : null, ps = sans.length >= 5 ? pc(sans.filter(x => x.g.issue === 'g').length, sans.length) : null;
        const anS = sans.filter(x => x.a), anA = avec.filter(x => x.a), grave = x => gravesDe(x).length > 0;
        const rS = anS.length ? pc(anS.filter(grave).length, anS.length) : null, rA = anA.length ? pc(anA.filter(grave).length, anA.length) : null;
        const lie = anS.length >= 8 && anA.length >= 8 && rS - rA >= 15;
        const ex = sans.slice().sort((x, y) => y.g.t - x.g.t)[0];
        let texte = `Dans ${sans.length} parties sur ${el.length} (${pc(sans.length, el.length)} %), tu n’as pas roqué avant ton 10e coup : ${apres} roquent ensuite (avant le 15e coup), ${bouge} déplacent le roi sans roquer, ${centre} ont encore le roi sur sa case de départ à la fin des coups examinés (15 premiers coups).`;
        if (pa != null && ps != null) texte += ` Résultats : ${pa} % de victoires quand tu roques avant le 10e coup (${avec.length} parties), ${ps} % sinon (${sans.length} parties). Ce constat ne montre pas que le roque en soit la cause.`;
        if (lie) texte += ` Stockfish relève une erreur ou une gaffe avant le 15e coup dans ${rS} % des ${anS.length} parties analysées sans roque avant le 10e coup, contre ${rA} % des ${anA.length} avec roque : une association observée dans ces parties, pas une preuve de cause.`;
        R.push({ id: 'roque', obs: !lie, ev: { cas: sans.length, sur: el.length, src: 'toutes' }, titre: lie ? 'Roque tardif et erreurs de début de partie' : 'Roque : ce que montrent tes parties', texte,
          ...(lie ? { conseil: 'Quand tu retardes le roque, vérifie à chaque coup si ton roi resté au centre expose une pièce ou une colonne. Un roque tardif peut rester un bon choix (structure fermée, plan d’attaque).' } : {}),
          ex: [{ g: ex.g, ply: Math.min(ex.m.length, moi ? 20 : 19), info: 'Position après ton 10e coup : tu n’as pas encore roqué.', apres: true }] });
      } else R.push({ id: 'roque-ok', ok: true, titre: 'Roque : constat', texte: `Tu as roqué avant le 10e coup dans ${avec.length} parties sur ${el.length}.` });
    } else insuffisant.push('le roque (moins de 8 parties de plus de 12 coups)');
  }
  // b) dame : on distingue prises, sorties après développement et sorties précoces sans prise
  { const el = G.filter(x => x.m && x.m.length >= 16);
    if (el.length >= 8) {
      const premiere = x => { for (let k = 0; k < 16; k++) if (mine(x.m, k) && x.m[k][0] === 'Q') return k; return -1; };
      const mineures = (x, k) => { let n = 0; for (let j = 0; j < k; j++) if (mine(x.m, j) && /^[NB]/.test(x.m[j])) n++; return n; };
      const genre = x => { const k = premiere(x); return x.m[k].includes('x') ? 'capture' : mineures(x, k) >= 2 ? 'apres' : 'precoce'; };
      const tt = el.filter(x => premiere(x) >= 0), pre = tt.filter(x => genre(x) === 'precoce');
      if (pre.length >= 3 && pre.length / el.length >= 0.05) {
        const nc = tt.filter(x => genre(x) === 'capture').length, na = tt.filter(x => genre(x) === 'apres').length;
        const reste = el.filter(x => premiere(x) < 0);
        const pp = pre.length >= 5 ? pc(pre.filter(x => x.g.issue === 'g').length, pre.length) : null, pr = reste.length >= 5 ? pc(reste.filter(x => x.g.issue === 'g').length, reste.length) : null;
        const an = pre.filter(x => x.a), surCoup = an.filter(x => gravesDe(x).some(f => f[0] === premiere(x) + 1));
        const lie = an.length >= 5 && surCoup.length >= 3 && pc(surCoup.length, an.length) >= 40;
        const ex = pre.slice().sort((x, y) => y.g.t - x.g.t)[0], k = premiere(ex);
        let texte = `Dans ${tt.length} parties sur ${el.length}, ta dame bouge avant ton 9e coup : ${nc} fois pour prendre, ${na} fois après avoir sorti au moins deux pièces, ${pre.length} fois sans prise et avec moins de deux pièces sorties.`;
        if (pp != null && pr != null) texte += ` Dans ces ${pre.length} dernières parties, ${pp} % de victoires, contre ${pr} % quand ta dame reste derrière : ce constat ne montre pas de lien de cause.`;
        if (lie) texte += ` Stockfish relève une erreur ou une gaffe sur ce coup de dame dans ${surCoup.length} des ${an.length} parties analysées.`;
        R.push({ id: 'dame', obs: !lie, ev: { cas: pre.length, sur: el.length, src: 'toutes' }, titre: lie ? 'Sorties de dame précoces et erreurs' : 'Dame : ce que montrent tes parties', texte,
          ...(lie ? { conseil: 'Avant de sortir ta dame, regarde si une pièce adverse peut l’attaquer en gagnant un temps.' } : {}),
          ex: [{ g: ex.g, ply: k + 1, san: ex.m[k], info: 'Ici ta dame sort tôt, sans prise.' }] });
      }
    } else insuffisant.push('la sortie de la dame (moins de 8 parties)');
  }
  // c) mêmes erreurs, mêmes positions
  if (AN.length >= 6) {
    out.recurrentes.slice(0, 3).forEach((r, k) => R.push({ id: 'rec' + k, ev: { cas: r.n, sur: AN.length, src: 'sf' }, titre: `Tu rejoues ${r.san} après ${libelle(r.avant.slice(-2), r.avant.length - Math.min(2, r.avant.length) + 1)}`, texte: `Après ${libelle(r.avant.slice(Math.max(0, r.avant.length - 3)), Math.max(1, r.avant.length - Math.min(3, r.avant.length) + 1))}, tu as joué ${r.san} dans ${r.n} parties (perte moyenne : ${r.perte} points de chances de gagner).` + (r.best ? ` Le moteur préférait ${r.best}.` : ''), conseil: 'Dans cette position, avant de rejouer ce coup, cherche ce que l’adversaire menace et regarde le coup du moteur.', ex: r.parties.slice(0, 2).map(g => ({ g, ply: r.ply, san: r.san, best: r.best, perte: r.perte })) }));
    out.reponses.forEach((r, k) => R.push({ id: 'rep' + k, ev: { cas: r.F, sur: r.T, src: 'sf', occ: true }, titre: `Tu réponds mal à ${r.opp}`, texte: `Quand l’adversaire joue ${r.opp}, ton coup suivant est une erreur ou une gaffe dans ${r.F} parties sur ${r.T} (${pc(r.F, r.T)} %).`, conseil: 'Avant de répondre, demande-toi ce que ce coup attaque ou prépare, puis cherche la réponse la plus simple.', ex: [{ g: r.ex.g, ply: r.ex.ply, san: r.ex.san, best: r.ex.best, perte: r.ex.perte }] }));
  } else insuffisant.push('les erreurs récurrentes (il faut au moins 6 parties analysées de cette ouverture ; tu en as ' + AN.length + ')');
  // d) fautes précoces
  if (out.ouvertureFautes && out.ouvertureFautes.n >= 8) {
    const f = out.ouvertureFautes, gr = f.g + f.e;
    if (gr / f.n >= 0.25) {
      const exs = AN.filter(x => gravesDe(x).length).sort((x, y) => y.g.t - x.g.t).slice(0, 1).map(x => { const z = gravesDe(x)[0]; return { g: x.g, ply: z[0], san: x.m[z[0] - 1], best: z[3], perte: z[2] }; });
      const t = out.types; const dom = t && t.tact + t.strat >= 3 ? (t.tact >= t.strat ? 'surtout des fautes tactiques (pièce laissée en prise, menace ou capture non vue)' : 'surtout des coups qui dégradent la position sans perte immédiate') : null;
      R.push({ id: 'precoces', ev: { cas: gr, sur: f.n, src: 'sf' }, titre: 'Des erreurs graves dès l’ouverture', texte: `Dans ${gr} parties analysées sur ${f.n} (${pc(gr, f.n)} %), tu fais une erreur ou une gaffe avant le 15e coup` + (dom ? `, ${dom}.` : '.'), conseil: 'Dans les 15 premiers coups, vérifie à chaque coup : ce que l’adversaire vient de menacer, et si la pièce que tu déplaces reste protégée.', ex: exs });
    }
  }
  // e) avantage à 10 coups : constat factuel, sans conclusion sur la cause (repère d'affichage : au moins 5 parties et 35 % de non-victoires)
  { const av = AN.filter(x => x.a.op.e10 != null && x.a.op.e10 >= 58);
    if (av.length >= 5) {
      const w = av.filter(x => x.g.issue === 'g').length, n = av.filter(x => x.g.issue === 'n').length, d = av.length - w - n;
      if (pc(av.length - w, av.length) >= 35) {
        const ex = av.filter(x => x.g.issue !== 'g').sort((x, y) => y.g.t - x.g.t)[0];
        R.push({ id: 'avantage', obs: true, ev: { cas: av.length - w, sur: av.length, src: 'sf' }, titre: 'Avantage après dix coups',
          texte: `Après dix coups, le moteur te donnait un avantage (au moins 58 % de chances de gagner) dans ${av.length} parties ; tu en as gagné ${w}, fait ${n} nulle${n > 1 ? 's' : ''} et perdu ${d}. Une évaluation à dix coups ne dit pas ce qui s’est passé ensuite.`,
          ex: ex ? [{ g: ex.g, ply: Math.min(20, ex.m.length), info: `Position après 10 coups de chaque camp : le moteur te donnait ${ex.a.op.e10} % de chances de gagner.`, apres: true }] : [] });
      }
    }
  }
  out.recos = R; out.insuffisant = insuffisant;

  /* ---- 6. synthèse (uniquement ce qui est établi) ---- */
  const fortes = [], faibles = [];
  const mieux = out.variantes.filter(v => v.solide).sort((a, b2) => b2.vic - a.vic).slice(0, 1);
  mieux.forEach(v => fortes.push({ t: `Variante ${v.lib} : ${v.vic} % de victoires sur ${v.n} parties.`, s: 'toutes' }));
  if (out.sortie && out.sortie.moy >= 52) fortes.push({ t: `Tu sors de l’ouverture avec ${out.sortie.moy} % de chances de gagner en moyenne.`, s: 'sf' });
  if (out.ouvertureFautes && out.ouvertureFautes.n >= 8 && out.ouvertureFautes.g + out.ouvertureFautes.e <= out.ouvertureFautes.n * 0.1) fortes.push({ t: 'Très peu d’erreurs graves avant le 15e coup.', s: 'sf' });
  R.filter(r => !r.ok && !r.obs).forEach(r => faibles.push(r.titre));
  const pire = out.variantes.filter(v => v.probleme).sort((a, b2) => b2.aperdre - a.aperdre)[0] || null;
  if (pire) faibles.push(`Variante ${pire.lib} : ${pire.def} % de défaites sur ${pire.n} parties.`);
  out.synth = { fortes, faibles, pire, freq: R.find(r => /^rec|^precoces/.test(r.id)) || null, prio: R.find(r => !r.ok && !r.obs) || null,
    maitrise: { lignesTravaillees: null, partiesSansGrave: out.ouvertureFautes ? `${out.ouvertureFautes.aucune + out.ouvertureFautes.i} sur ${out.ouvertureFautes.n}` : null } };
  return out;
}

/* ---- qualité des 15 premiers coups, mesurée par Stockfish (deux passes) sur les parties dont le début est analysé ---- */
const med = a => { a = a.slice().sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
export function qualiteDebut(parties, opDe) {
  const A = parties.map(g => ({ g, o: opDe(g) })).filter(x => x.o && x.o.deux && x.o.n);
  const out = { n: A.length, total: parties.length };
  if (!A.length) return out;
  const nMoi = x => (x.g.co === 'blancs' ? Math.ceil(x.o.n / 2) : Math.floor(x.o.n / 2)), nAdv = x => x.o.n - nMoi(x);
  const cnt = (L, lst) => { for (const f of lst) L[f[1]]++; };
  const moi = { coups: 0, g: 0, e: 0, i: 0 }, adv = { coups: 0, g: 0, e: 0, i: 0 };
  for (const x of A) { moi.coups += nMoi(x); adv.coups += nAdv(x); cnt(moi, x.o.of || []); cnt(adv, x.o.ofa || []); }
  const grave = lst => (lst || []).some(f => f[1] === 'g' || f[1] === 'e');
  const premiere = (get, perteDe) => { const v = []; const pertes = []; for (const x of A) { const l = get(x); const f = (l || []).find(z => z[1] === 'g' || z[1] === 'e'); if (f) { v.push(Math.ceil(f[0] / 2)); pertes.push(f[2]); } } return { n: v.length, mediane: med(v), t1: v.filter(m => m <= 5).length, t2: v.filter(m => m > 5 && m <= 10).length, t3: v.filter(m => m > 10).length, perte: pertes.length ? Math.round(pertes.reduce((s, y) => s + y, 0) / pertes.length) : null }; };
  const pos = k => { const v = A.map(x => x.o[k]).filter(e => e != null); return { n: v.length, moy: v.length ? Math.round(v.reduce((s, y) => s + y, 0) / v.length) : null, mediane: med(v) }; };
  const e10 = A.map(x => x.o.e10).filter(e => e != null);
  const tri = A.slice().sort((a, b) => a.g.t - b.g.t), evol = [];
  for (let fin = tri.length; fin >= 5 && evol.length < 6; fin -= 10) { const bl = tri.slice(Math.max(0, fin - 10), fin); if (bl.length >= 5) { const v = bl.map(x => x.o.e10).filter(e => e != null); evol.unshift({ n: bl.length, grave: Math.round(100 * bl.filter(x => grave(x.o.of)).length / bl.length), e10: v.length ? Math.round(v.reduce((s, y) => s + y, 0) / v.length) : null }); } }
  Object.assign(out, { moi, adv, partiesGraveMoi: A.filter(x => grave(x.o.of)).length, partiesGraveAdv: A.filter(x => grave(x.o.ofa)).length,
    sansFauteMoi: A.filter(x => !(x.o.of || []).length).length, premMoi: premiere(x => x.o.of), premAdv: premiere(x => x.o.ofa),
    p5: pos('e5'), p10: pos('e10'), p15: pos('e15'), bandes10: { bas: e10.filter(e => e < 40).length, milieu: e10.filter(e => e >= 40 && e <= 60).length, haut: e10.filter(e => e > 60).length, n: e10.length }, evol });
  return out;
}
