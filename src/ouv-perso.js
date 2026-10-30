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
  // a) roque tardif
  { const el = G.filter(x => x.m && x.m.length >= 24);
    if (el.length >= 8) {
      const roq = x => { for (let k = 0; k < 20; k++) if (mine(x.m, k) && x.m[k].startsWith('O-O')) return true; return false; };
      const sans = el.filter(x => !roq(x)), avec = el.filter(roq);
      if (sans.length / el.length >= 0.25 && sans.length >= 3) {
        const pa = avec.length >= 5 ? pc(avec.filter(x => x.g.issue === 'g').length, avec.length) : null, ps = sans.length >= 5 ? pc(sans.filter(x => x.g.issue === 'g').length, sans.length) : null;
        const ex = sans.slice().sort((x, y) => y.g.t - x.g.t)[0];
        R.push({ id: 'roque', titre: 'Tu roques trop tard', texte: `Dans ${sans.length} parties sur ${el.length} (${pc(sans.length, el.length)} %), ton roi est encore au centre après dix coups.` + (pa != null && ps != null && Math.abs(pa - ps) >= 10 ? ` Tu gagnes ${pa} % de tes parties quand tu roques avant le 10e coup, contre ${ps} % sinon.` : ''), conseil: 'Vise le roque avant ton 8e ou 9e coup : développe cavalier et fou, puis roque, avant de lancer une attaque.', ex: [{ g: ex.g, ply: Math.min(ex.m.length, moi ? 20 : 19), info: 'Position après ton 10e coup : ton roi est toujours au centre.', apres: true }] });
      } else if (el.length >= 8) R.push({ id: 'roque-ok', ok: true, titre: 'Tu roques à temps', texte: `Tu as roqué avant le 10e coup dans ${el.length - sans.length} parties sur ${el.length}.` });
    } else insuffisant.push('le roque (moins de 8 parties de plus de 12 coups)');
  }
  // b) dame sortie tôt
  { const el = G.filter(x => x.m && x.m.length >= 16);
    if (el.length >= 8) {
      const tot = x => { for (let k = 0; k < 16; k++) if (mine(x.m, k) && x.m[k][0] === 'Q') return k; return -1; };
      const tt = el.filter(x => tot(x) >= 0);
      if (tt.length >= 3 && tt.length / el.length >= 0.2) {
        const ex = tt.slice().sort((x, y) => y.g.t - x.g.t)[0], k = tot(ex);
        const pa = pc(tt.filter(x => x.g.issue === 'g').length, tt.length), reste = el.filter(x => tot(x) < 0), pr = reste.length >= 5 ? pc(reste.filter(x => x.g.issue === 'g').length, reste.length) : null;
        R.push({ id: 'dame', titre: 'Tu sors ta dame trop tôt', texte: `Dans ${tt.length} parties sur ${el.length}, ta dame bouge avant ton 9e coup.` + (pr != null && Math.abs(pa - pr) >= 10 ? ` Tu gagnes ${pa} % de ces parties, contre ${pr} % quand elle reste derrière.` : ''), conseil: 'Tant que tes cavaliers et tes fous ne sont pas sortis, la dame reste à la maison : l’adversaire gagne des tempos en l’attaquant.', ex: [{ g: ex.g, ply: k + 1, san: ex.m[k], info: 'Ici ta dame sort tôt.' }] });
      }
    } else insuffisant.push('la sortie de la dame (moins de 8 parties)');
  }
  // c) mêmes erreurs, mêmes positions
  if (AN.length >= 6) {
    out.recurrentes.slice(0, 3).forEach((r, k) => R.push({ id: 'rec' + k, titre: `Tu rejoues ${r.san} après ${libelle(r.avant.slice(-2), r.avant.length - Math.min(2, r.avant.length) + 1)}`, texte: `Après ${libelle(r.avant.slice(Math.max(0, r.avant.length - 3)), Math.max(1, r.avant.length - Math.min(3, r.avant.length) + 1))}, tu as joué ${r.san} dans ${r.n} parties (perte moyenne : ${r.perte} points de chances de gagner).` + (r.best ? ` Le moteur préférait ${r.best}.` : ''), conseil: 'Dans cette position, avant de rejouer ce coup, cherche ce que l’adversaire menace et regarde le coup du moteur.', ex: r.parties.slice(0, 2).map(g => ({ g, ply: r.ply, san: r.san, best: r.best, perte: r.perte })) }));
    out.reponses.forEach((r, k) => R.push({ id: 'rep' + k, titre: `Tu réponds mal à ${r.opp}`, texte: `Quand l’adversaire joue ${r.opp}, ton coup suivant est une erreur ou une gaffe dans ${r.F} parties sur ${r.T} (${pc(r.F, r.T)} %).`, conseil: 'Avant de répondre, demande-toi ce que ce coup attaque ou prépare, puis cherche la réponse la plus simple.', ex: [{ g: r.ex.g, ply: r.ex.ply, san: r.ex.san, best: r.ex.best, perte: r.ex.perte }] }));
  } else insuffisant.push('les erreurs récurrentes (il faut au moins 6 parties analysées de cette ouverture ; tu en as ' + AN.length + ')');
  // d) fautes précoces
  if (out.ouvertureFautes && out.ouvertureFautes.n >= 8) {
    const f = out.ouvertureFautes, gr = f.g + f.e;
    if (gr / f.n >= 0.25) {
      const exs = AN.filter(x => gravesDe(x).length).sort((x, y) => y.g.t - x.g.t).slice(0, 1).map(x => { const z = gravesDe(x)[0]; return { g: x.g, ply: z[0], san: x.m[z[0] - 1], best: z[3], perte: z[2] }; });
      const t = out.types; const dom = t && t.tact + t.strat >= 3 ? (t.tact >= t.strat ? 'surtout des fautes tactiques (pièce laissée en prise, menace ou capture non vue)' : 'surtout des coups qui dégradent la position sans perte immédiate') : null;
      R.push({ id: 'precoces', titre: 'Des erreurs graves dès l’ouverture', texte: `Dans ${gr} parties analysées sur ${f.n} (${pc(gr, f.n)} %), tu fais une erreur ou une gaffe avant le 15e coup` + (dom ? `, ${dom}.` : '.'), conseil: 'Dans les 15 premiers coups, vérifie à chaque coup : ce que l’adversaire vient de menacer, et si la pièce que tu déplaces reste protégée.', ex: exs });
    }
  }
  // e) avantage non converti
  { const av = AN.filter(x => x.a.op.e10 != null && x.a.op.e10 >= 58);
    if (av.length >= 5) {
      const rate = pc(av.filter(x => x.g.issue !== 'g').length, av.length);
      if (rate >= 35) { const ex = av.filter(x => x.g.issue !== 'g').sort((x, y) => y.g.t - x.g.t)[0]; R.push({ id: 'avantage', titre: 'Tu sors de l’ouverture avec avantage, mais tu ne le convertis pas', texte: `Sur ${av.length} parties où le moteur te donnait un avantage après 10 coups, tu n’en as gagné que ${av.length - Math.round(rate * av.length / 100)}. L’ouverture n’est donc pas le problème : c’est la suite.`, conseil: 'Avec un avantage, échange les pièces, garde le roi à l’abri et évite les coups risqués.', ex: ex ? [{ g: ex.g, ply: Math.min(20, ex.m.length), info: `Position après 10 coups de chaque camp : le moteur te donnait ${ex.a.op.e10} % de chances de gagner.`, apres: true }] : [] }); }
    }
  }
  out.recos = R; out.insuffisant = insuffisant;

  /* ---- 6. synthèse (uniquement ce qui est établi) ---- */
  const fortes = [], faibles = [];
  const mieux = out.variantes.filter(v => v.solide).sort((a, b2) => b2.vic - a.vic).slice(0, 1);
  mieux.forEach(v => fortes.push({ t: `Variante ${v.lib} : ${v.vic} % de victoires sur ${v.n} parties.`, s: 'toutes' }));
  if (out.sortie && out.sortie.moy >= 52) fortes.push({ t: `Tu sors de l’ouverture avec ${out.sortie.moy} % de chances de gagner en moyenne.`, s: 'sf' });
  if (R.some(r => r.id === 'roque-ok')) fortes.push({ t: 'Tu roques à temps.', s: 'toutes' });
  if (out.ouvertureFautes && out.ouvertureFautes.n >= 8 && out.ouvertureFautes.g + out.ouvertureFautes.e <= out.ouvertureFautes.n * 0.1) fortes.push({ t: 'Très peu d’erreurs graves avant le 15e coup.', s: 'sf' });
  R.filter(r => !r.ok).forEach(r => faibles.push(r.titre));
  const pire = out.variantes.filter(v => v.probleme).sort((a, b2) => b2.aperdre - a.aperdre)[0] || null;
  if (pire) faibles.push(`Variante ${pire.lib} : ${pire.def} % de défaites sur ${pire.n} parties.`);
  out.synth = { fortes, faibles, pire, freq: R.find(r => /^rec|^precoces/.test(r.id)) || null, prio: R.find(r => !r.ok) || null,
    maitrise: { lignesTravaillees: null, partiesSansGrave: out.ouvertureFautes ? `${out.ouvertureFautes.aucune + out.ouvertureFautes.i} sur ${out.ouvertureFautes.n}` : null } };
  return out;
}
