/* Leçons rédigées pour onze fiches (la Partie du fou et 1...d5 sont dans lecons.js).
   Chaque carte porte une seule idée, une notion (idee, centre, pieces, plan, erreur, adaptation), un échiquier annoté et une question.
   Les annotations géométriques et les conseils stratégiques (champ `strat`) sont vérifiés par les tests : un coup recommandé doit rester
   proche du meilleur coup selon Stockfish, un coup présenté comme moins précis doit l'être vraiment. */
const f = (de, vers, type, role) => ({ de, vers, type, role });
const z = (sq, role) => ({ sq, role });
const att = (sq, par) => ({ t: 'attaque', sq, par });
const nd = sq => ({ t: 'nonDefendu', sq });
const df = (sq, ...liste) => ({ t: 'defenseurs', sq, liste });
const legal = (de, vers) => ({ t: 'coupLegal', de, vers });
const bon = (coups, san, max = 3) => ({ t: 'bon', coups, san, max });
const mauvais = (coups, san, min = 6.75) => ({ t: 'mauvais', coups, san, min });
const egal = (coups, abs = 50) => ({ t: 'egal', coups, abs });
const R = (id, notion, coups, cote, question, reponse, explication, cases, fleches, verif, acceptees = []) => ({ id, notion, coups, cote, question, reponse, ...(acceptees.length ? { acceptees } : {}), explication, cases, fleches, verif });
const T = (id, ecart, coups, cote, contexte, attendus, principe) => ({ id, ecart, coups, cote, contexte, attendus, principe });

const E4E5_NF3_NC6_BC4 = 'e4 e5 Nf3 Nc6 Bc4';

/* ---------- Italienne : défense des deux cavaliers (Blancs) ---------- */
const DEUX_CAVALIERS = {
  cartes: [
    { id: 'dc-1', notion: 'idee', titre: 'Deux pièces vers le centre', coups: E4E5_NF3_NC6_BC4, cote: 'w',
      texte: 'Cf3 attaque le pion e5 et le fou c4 vise f7. Tu sors deux pièces vers le centre et vers le point faible de Noir, que seul son roi défend.',
      cases: [z('e5', 'cible'), z('f7', 'cible')], fleches: [f('f3', 'e5', 'visee', 'idee'), f('c4', 'f7', 'visee', 'idee')],
      verif: [att('e5', 'f3'), att('f7', 'c4'), df('f7', 'e8')], strat: [bon('e4 e5', 'Nf3')], },
    { id: 'dc-2', notion: 'pieces', titre: 'Défendre e4', coups: E4E5_NF3_NC6_BC4 + ' Nf6', cote: 'w',
      texte: 'Le cavalier f6 attaque e4, qui n’est pas défendu. d3 est la réponse la plus simple ; Cc3 et De2 défendent aussi e4.',
      cases: [z('e4', 'danger')], fleches: [f('f6', 'e4', 'visee', 'danger')], verif: [att('e4', 'f6'), nd('e4')],
      strat: [bon(E4E5_NF3_NC6_BC4 + ' Nf6', 'd3'), bon(E4E5_NF3_NC6_BC4 + ' Nf6', 'Nc3', 3), mauvais(E4E5_NF3_NC6_BC4 + ' Nf6', 'c3', 5)], },
    { id: 'dc-3', notion: 'plan', titre: 'Roque, puis finir le développement', coups: E4E5_NF3_NC6_BC4 + ' Nf6 d3 Be7 O-O O-O', cote: 'w',
      texte: 'Ton roi est à l’abri. Il reste à sortir le cavalier b1 (Cbd2) et à placer la tour sur e1 pour soutenir e4.',
      cases: [z('d2', 'plan'), z('e1', 'plan')], fleches: [f('b1', 'd2', 'coup', 'plan'), f('f1', 'e1', 'coup', 'plan')],
      verif: [legal('b1', 'd2'), legal('f1', 'e1'), { t: 'piece', sq: 'b1', p: 'n', c: 'w' }],
      strat: [bon(E4E5_NF3_NC6_BC4 + ' Nf6 d3 Be7 O-O O-O', 'Nbd2'), bon(E4E5_NF3_NC6_BC4 + ' Nf6 d3 Be7 O-O O-O', 'Re1')], },
    { id: 'dc-4', notion: 'erreur', titre: 'Cg5 demande de la préparation', coups: E4E5_NF3_NC6_BC4 + ' Nf6 Ng5', cote: 'w',
      texte: 'Cg5 attaque f7 en même temps que le fou, mais Noir répond 4...d5 puis, après 5.exd5, 5...Ca5 : tu n’as rien gagné. N’attaque pas f7 sans connaître cette réponse.',
      cases: [z('f7', 'danger')], fleches: [f('g5', 'f7', 'visee', 'danger'), f('c4', 'f7', 'visee', 'danger')], verif: [att('f7', 'g5'), att('f7', 'c4')],
      strat: [egal(E4E5_NF3_NC6_BC4 + ' Nf6 Ng5 d5 exd5 Na5', 60), mauvais(E4E5_NF3_NC6_BC4 + ' Nf6 Ng5 d5 exd5', 'Nxd5')], },
    { id: 'dc-5', notion: 'adaptation', titre: 'Si Noir joue ...h6', coups: E4E5_NF3_NC6_BC4 + ' h6', cote: 'w',
      texte: '3...h6 contrôle g5 mais ne développe aucune pièce. Tu peux en profiter pour prendre le centre tout de suite avec d4.',
      cases: [z('g5', 'danger')], fleches: [f('h6', 'g5', 'visee', 'danger'), f('d2', 'd4', 'coup', 'plan')], verif: [att('g5', 'h6'), legal('d2', 'd4')],
      strat: [bon(E4E5_NF3_NC6_BC4 + ' h6', 'd4')], }
  ],
  reconnaitre: [
    R('dc-r1', 'pieces', E4E5_NF3_NC6_BC4 + ' Nf6', 'w', 'Quel pion blanc est attaqué sans défense ? Touche sa case.', 'e4', 'Le cavalier f6 attaque e4 et rien ne le défend.', [z('e4', 'danger')], [f('f6', 'e4', 'visee', 'danger')], [att('e4', 'f6'), nd('e4')]),
    R('dc-r2', 'plan', E4E5_NF3_NC6_BC4 + ' Nf6 d3 Be7 O-O O-O', 'w', 'Où développer le cavalier b1 ? Touche une case convenable.', 'd2', 'Cbd2 prépare c3 et soutient e4 ; Cc3 est aussi un bon développement.', [z('d2', 'plan')], [f('b1', 'd2', 'coup', 'plan')], [legal('b1', 'd2')], ['c3']),
    R('dc-r3', 'erreur', E4E5_NF3_NC6_BC4 + ' Nf6 Ng5', 'w', 'Quel pion noir est attaqué deux fois ? Touche-le.', 'f7', 'Cg5 et Fc4 attaquent f7.', [z('f7', 'danger')], [f('g5', 'f7', 'visee', 'danger'), f('c4', 'f7', 'visee', 'danger')], [att('f7', 'g5'), att('f7', 'c4')])
  ],
};

/* ---------- Italienne : Giuoco Piano (Blancs) ---------- */
const GIU = E4E5_NF3_NC6_BC4 + ' Bc5';
const GIUOCO = {
  cartes: [
    { id: 'gi-1', notion: 'idee', titre: 'Deux fous face à face', coups: GIU, cote: 'w',
      texte: 'Les deux fous visent le point faible adverse : f7 pour toi, f2 pour Noir. Personne n’a de tactique forcée : chacun construit son centre avant d’attaquer.',
      cases: [z('f7', 'cible'), z('f2', 'danger')], fleches: [f('c4', 'f7', 'visee', 'idee'), f('c5', 'f2', 'visee', 'danger')], verif: [att('f7', 'c4'), att('f2', 'c5'), df('f2', 'e1')], },
{ id: 'gi-2', notion: 'centre', titre: 'Deux plans : d3 ou d4', coups: GIU + ' c3 Nf6', cote: 'w',
      texte: 'Le cavalier f6 attaque e4. d3 le défend calmement et ouvre le fou c1 ; d4 prend le centre tout de suite : c’est le coup principal, plus ouvert et plus exigeant. Roquer tout de suite ou sortir la dame (Db3) est moins précis.',
      cases: [z('e4', 'danger'), z('d4', 'plan')], fleches: [f('f6', 'e4', 'visee', 'danger'), f('d2', 'd3', 'coup', 'idee'), f('d2', 'd4', 'coup', 'plan')],
      verif: [att('e4', 'f6'), nd('e4'), legal('d2', 'd3'), legal('d2', 'd4')],
      strat: [bon(GIU + ' c3 Nf6', 'd3'), bon(GIU + ' c3 Nf6', 'd4'), mauvais(GIU + ' c3 Nf6', 'O-O', 3), mauvais(GIU + ' c3 Nf6', 'Qb3')] },
    { id: 'gi-3', notion: 'pieces', titre: 'h3 contre le clouage', coups: GIU + ' c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3', cote: 'w',
      texte: 'h3 contrôle g4 : le fou noir ne peut plus venir clouer ton cavalier f3 contre la dame.',
      cases: [z('g4', 'idee')], fleches: [f('h3', 'g4', 'visee', 'idee'), f('c8', 'g4', 'visee', 'danger')], verif: [att('g4', 'h3'), att('g4', 'c8')],
      strat: [bon(GIU + ' c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7', 'h3')], },
    { id: 'gi-4', notion: 'plan', titre: 'Un plan lent : le cavalier vers g3', coups: GIU + ' c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2 Re8', cote: 'w',
      texte: 'Le cavalier b1 passe par d2, puis f1, pour viser g3 ou e3. C’est un plan lent, sans tactique forcée, qui demande de la patience.',
      cases: [z('f1', 'plan')], fleches: [f('d2', 'f1', 'coup', 'plan')], verif: [legal('d2', 'f1')],
      strat: [bon(GIU + ' c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2 Re8', 'Nf1')], },
{ id: 'gi-5', notion: 'erreur', titre: 'Un pion qui semble gratuit', coups: GIU + ' c3 Nf6 d3 d6', cote: 'w',
      texte: 'Le cavalier f3 attaque e5, mais ce pion est défendu deux fois (Cc6 et d6). 6.Cxe5? dxe5 te coûte un cavalier contre un pion : compte les défenseurs avant de prendre.',
      cases: [z('e5', 'danger')], fleches: [f('f3', 'e5', 'visee', 'idee'), f('c6', 'e5', 'defense', 'danger'), f('d6', 'e5', 'defense', 'danger')],
      verif: [att('e5', 'f3'), df('e5', 'c6', 'd6'), { t: 'materiel', suite: 'Nxe5 dxe5', camp: 'b', min: 2 }],
      strat: [mauvais(GIU + ' c3 Nf6 d3 d6', 'Nxe5'), bon(GIU + ' c3 Nf6 d3 d6', 'O-O', 3)] },
    { id: 'gi-6', notion: 'adaptation', titre: 'Si Noir roque', coups: GIU + ' c3 Nf6 d3 O-O', cote: 'w',
      texte: 'Noir roque tout de suite : fais comme lui. Ton plan ne change pas : tu roques puis tu développes ton cavalier b1.',
      cases: [z('g1', 'plan')], fleches: [f('e1', 'g1', 'coup', 'plan')], verif: [legal('e1', 'g1')],
      strat: [bon(GIU + ' c3 Nf6 d3 O-O', 'O-O'), bon(GIU + ' c3 Nf6 d3 O-O', 'Nbd2')], }
  ],
  reconnaitre: [
    R('gi-r1', 'pieces', GIU, 'w', 'Quel pion blanc le fou noir c5 menace-t-il ? Touche-le.', 'f2', 'La diagonale c5-f2 est libre.', [z('f2', 'danger')], [f('c5', 'f2', 'visee', 'danger')], [att('f2', 'c5')]),
    R('gi-r2', 'plan', GIU + ' c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6', 'w', 'Sur quelle case le cavalier b1 se développe-t-il ? Touche-la.', 'd2', 'Cbd2 est le premier pas du plan lent.', [z('d2', 'plan')], [f('b1', 'd2', 'coup', 'plan')], [legal('b1', 'd2')]),
    R('gi-r3', 'erreur', GIU + ' c3 Nf6', 'w', 'Quel pion blanc est attaqué sans défense ? Touche sa case.', 'e4', 'Le cavalier f6 attaque e4.', [z('e4', 'danger')], [f('f6', 'e4', 'visee', 'danger')], [att('e4', 'f6'), nd('e4')])
  ],
};

/* ---------- Contre la Caro-Kann (Blancs) ---------- */
const CARO_B = 'e4 c6 d4 d5';
const CARO = {
  cartes: [
    { id: 'ca-1', notion: 'idee', titre: 'Le pion d5 attaque e4', coups: CARO_B, cote: 'w',
      texte: 'Noir prépare ...d5 avec c6 : son pion d5 attaque e4, qui n’est pas défendu. Tu as trois réponses : Cc3, e5 ou exd5.',
      cases: [z('e4', 'danger')], fleches: [f('d5', 'e4', 'visee', 'danger')], verif: [att('e4', 'd5'), nd('e4')],
      strat: [bon('e4 c6 d4', 'd5', 3), bon(CARO_B, 'e5'), bon(CARO_B, 'Nc3'), bon(CARO_B, 'exd5')], },
    { id: 'ca-2', notion: 'pieces', titre: 'Le cavalier e4 est attaqué', coups: CARO_B + ' Nc3 dxe4 Nxe4 Bf5', cote: 'w',
      texte: 'Le fou f5 attaque ton cavalier e4, qui n’est pas défendu. Cg3 le met à l’abri en attaquant le fou.',
      cases: [z('e4', 'danger')], fleches: [f('f5', 'e4', 'visee', 'danger'), f('e4', 'g3', 'coup', 'idee')], verif: [att('e4', 'f5'), nd('e4'), legal('e4', 'g3')],
      strat: [bon(CARO_B + ' Nc3 dxe4 Nxe4 Bf5', 'Ng3')], },
    { id: 'ca-3', notion: 'plan', titre: 'Chasser le fou avec h4-h5', coups: CARO_B + ' Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7', cote: 'w',
      texte: 'h5 attaque le fou g6 : il devra se retirer en h7. Tu gagnes de l’espace sur l’aile roi pendant que ton jeu reste solide.',
      cases: [z('g6', 'cible')], fleches: [f('h4', 'h5', 'coup', 'plan')], verif: [legal('h4', 'h5'), { t: 'piece', sq: 'g6', p: 'b', c: 'b' }],
      strat: [bon(CARO_B + ' Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7', 'h5')], },
    { id: 'ca-4', notion: 'erreur', titre: 'Ne laisse pas le cavalier en prise', coups: CARO_B + ' Nc3 dxe4 Nxe4 Bf5', cote: 'w',
      texte: 'Après ...Ff5, 5.Cf3?? ou 5.h4?? ne sauvent pas le cavalier e4 : ...Fxe4 gagne une pièce. Regarde toujours ce que ton coup laisse en prise.',
      cases: [z('e4', 'danger')], fleches: [f('f5', 'e4', 'visee', 'danger')], verif: [att('e4', 'f5'), nd('e4')],
      strat: [mauvais(CARO_B + ' Nc3 dxe4 Nxe4 Bf5', 'Nf3', 20), mauvais(CARO_B + ' Nc3 dxe4 Nxe4 Bf5', 'h4', 20)], },
    { id: 'ca-5', notion: 'adaptation', titre: 'Contre l’échange : développe vite', coups: CARO_B + ' exd5 cxd5 Bd3 Nc6 c3 Nf6', cote: 'w',
      texte: 'Si Noir échange, la structure est symétrique : développe vite avec Fd3, c3 puis Ff4. La diagonale c1-f4 est libre.',
      cases: [z('f4', 'plan')], fleches: [f('c1', 'f4', 'coup', 'plan')], verif: [legal('c1', 'f4')],
      strat: [bon(CARO_B + ' exd5 cxd5 Bd3 Nc6 c3 Nf6', 'Bf4')], }
  ],
  reconnaitre: [
    R('ca-r1', 'idee', CARO_B, 'w', 'Quel pion blanc est attaqué ? Touche sa case.', 'e4', 'Le pion d5 attaque e4.', [z('e4', 'danger')], [f('d5', 'e4', 'visee', 'danger')], [att('e4', 'd5'), nd('e4')]),
    R('ca-r2', 'pieces', CARO_B + ' Nc3 dxe4 Nxe4 Bf5', 'w', 'Quelle pièce blanche est attaquée sans défense ? Touche-la.', 'e4', 'Le fou f5 attaque le cavalier e4.', [z('e4', 'danger')], [f('f5', 'e4', 'visee', 'danger')], [att('e4', 'f5'), nd('e4')]),
    R('ca-r3', 'plan', CARO_B + ' Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7', 'w', 'Sur quelle case ton pion h avance-t-il pour attaquer le fou ? Touche-la.', 'h5', 'h5 attaque le fou g6.', [z('h5', 'plan')], [f('h4', 'h5', 'coup', 'plan')], [legal('h4', 'h5')])
  ],
};

/* ---------- Contre la Scandinave (Blancs) ---------- */
const SC = 'e4 d5 exd5 Qxd5 Nc3 Qa5';
const SCANDINAVE = {
  cartes: [
    { id: 'sc-1', notion: 'idee', titre: 'La dame sort trop tôt', coups: 'e4 d5 exd5 Qxd5', cote: 'w',
      texte: 'Noir a repris avec la dame, qui sort dès le deuxième coup. Cc3 l’attaque en développant une pièce : tu gagnes un temps.',
      cases: [z('d5', 'cible')], fleches: [f('b1', 'c3', 'coup', 'idee')], verif: [legal('b1', 'c3'), { t: 'piece', sq: 'd5', p: 'q', c: 'b' }],
      strat: [bon('e4 d5 exd5 Qxd5', 'Nc3'), mauvais('e4 d5 exd5 Qxd5', 'Nf3', 0.5)], },
{ id: 'sc-2', notion: 'pieces', titre: 'La dame attaque ton cavalier', coups: SC, cote: 'w',
      texte: 'La dame a5 attaque ton cavalier c3, défendu par les pions b2 et d2. Après d4, ce cavalier sera cloué contre ton roi (la case d2 est vidée), mais ce n’est pas un souci si tu continues à te développer : d4 reste le meilleur coup, Cf3 aussi.',
      cases: [z('c3', 'danger')], fleches: [f('a5', 'c3', 'visee', 'danger')],
      verif: [att('c3', 'a5'), df('c3', 'b2', 'd2'), { t: 'suite', coups: 'd4', v: { t: 'libre', cases: ['d2'] } }],
      strat: [bon(SC, 'Nf3'), bon(SC, 'd4')] },
    { id: 'sc-3', notion: 'plan', titre: 'Utilise ton avance de développement', coups: SC + ' d4 Nf6 Nf3 c6', cote: 'w',
      texte: 'Tu as sorti deux cavaliers, Noir un seul (et sa dame). Continue avec Fd3 ou Fd2 puis roque, avant que Noir n’ait rattrapé son retard.',
      cases: [z('d3', 'plan')], fleches: [f('f1', 'd3', 'coup', 'plan')], verif: [legal('f1', 'd3'), { t: 'devel', camp: 'w', n: 2 }, { t: 'devel', camp: 'b', n: 1 }],
      strat: [bon(SC + ' d4 Nf6 Nf3 c6', 'Bd3'), bon(SC + ' d4 Nf6 Nf3 c6', 'Bd2')], },
{ id: 'sc-4', notion: 'erreur', titre: 'Pas besoin de sortir la dame', coups: SC, cote: 'w',
      texte: 'Tu as de l’avance de développement : 4.Df3? sort la dame sans développer de pièce. Après 4...Cc6 elle doit encore bouger (Dd5 dans la suite proposée par Stockfish) et tu perds ton avance. Développe plutôt un cavalier.',
      cases: [z('f3', 'danger')], fleches: [f('d1', 'f3', 'coup', 'danger')], verif: [legal('d1', 'f3')],
      strat: [mauvais(SC, 'Qf3'), bon(SC, 'Nf3')] },
{ id: 'sc-5', notion: 'adaptation', titre: 'Si Noir attaque d5 avec le cavalier', coups: 'e4 d5 exd5 Nf6', cote: 'w',
      texte: '…Cf6 attaque le pion d5 que tu viens de prendre. Prends le centre avec d4 : après …Cxd5, Noir a regagné son pion, mais tu as plus d’espace et une partie un peu meilleure.',
      cases: [z('d4', 'plan')], fleches: [f('d2', 'd4', 'coup', 'plan')], verif: [legal('d2', 'd4'), att('d5', 'f6')],
      strat: [bon('e4 d5 exd5 Nf6', 'd4')] }
  ],
  reconnaitre: [
    R('sc-r1', 'idee', 'e4 d5 exd5 Qxd5 Nc3', 'w', 'Quelle pièce noire est attaquée ? Touche-la.', 'd5', 'Cc3 attaque la dame d5.', [z('d5', 'danger')], [f('c3', 'd5', 'visee', 'idee')], [att('d5', 'c3')]),
    R('sc-r2', 'pieces', SC, 'w', 'Quelle pièce blanche la dame attaque-t-elle ? Touche-la.', 'c3', 'La diagonale a5-c3 est libre.', [z('c3', 'danger')], [f('a5', 'c3', 'visee', 'danger')], [att('c3', 'a5')]),
    R('sc-r3', 'erreur', SC + ' d4', 'w', 'Quelle case, vidée par d4, ouvre la diagonale de la dame a5 vers ton roi ? Touche-la.', 'd2', 'Après d4, d2 est libre : le cavalier c3 est cloué contre le roi.', [z('d2', 'danger')], [f('a5', 'c3', 'visee', 'danger')], [att('c3', 'a5'), { t: 'libre', cases: ['d2'] }])
  ],
};

/* ---------- Contre la Philidor (Blancs) ---------- */
const PH = 'e4 e5 Nf3 d6';
const PHILIDOR = {
  cartes: [
    { id: 'ph-1', notion: 'idee', titre: 'Un pion défend e5', coups: PH, cote: 'w',
      texte: 'Noir défend e5 avec le pion d6 : c’est solide, mais le fou f8 est gêné et Noir manque d’espace. Tu prends le centre avec d4.',
      cases: [z('e5', 'cible')], fleches: [f('f3', 'e5', 'visee', 'idee'), f('d6', 'e5', 'defense', 'danger')], verif: [att('e5', 'f3'), att('e5', 'd6'), { t: 'mobilite', sq: 'f8', max: 1 }],
      strat: [bon(PH, 'd4')], },
    { id: 'ph-2', notion: 'pieces', titre: 'Cc3 défend e4 en développant', coups: PH + ' d4 exd4 Nxd4 Nf6 Nc3', cote: 'w',
      texte: 'Le cavalier f6 attaque e4, mais Cc3 le défend en développant une pièce.',
      cases: [z('e4', 'idee')], fleches: [f('f6', 'e4', 'visee', 'danger'), f('c3', 'e4', 'defense', 'idee')], verif: [att('e4', 'f6'), df('e4', 'c3')],
      strat: [bon(PH + ' d4 exd4 Nxd4 Nf6', 'Nc3')], },
    { id: 'ph-3', notion: 'plan', titre: 'Si ...c5 attaque ton cavalier', coups: PH + ' d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O c5', cote: 'w',
      texte: 'Le pion c5 attaque ton cavalier d4. Retire-le : Cf5 ou Cb3 gardent ton cavalier en jeu.',
      cases: [z('d4', 'danger')], fleches: [f('c5', 'd4', 'visee', 'danger'), f('d4', 'b3', 'coup', 'idee')], verif: [att('d4', 'c5'), legal('d4', 'b3')],
      strat: [bon(PH + ' d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O c5', 'Nb3', 4), bon(PH + ' d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O c5', 'Nf5')], },
    { id: 'ph-4', notion: 'erreur', titre: 'Ne laisse pas e4 sans défense', coups: PH + ' d4 exd4 Nxd4 Nf6', cote: 'w',
      texte: 'Après ...Cf6, e4 est attaqué sans défense. 5.h3?, 5.g3? ou 5.Fe3? ne le défendent pas : Noir prend le pion.',
      cases: [z('e4', 'danger')], fleches: [f('f6', 'e4', 'visee', 'danger')], verif: [att('e4', 'f6'), nd('e4')],
      strat: [mauvais(PH + ' d4 exd4 Nxd4 Nf6', 'h3'), mauvais(PH + ' d4 exd4 Nxd4 Nf6', 'g3'), mauvais(PH + ' d4 exd4 Nxd4 Nf6', 'Be3'), bon(PH + ' d4 exd4 Nxd4 Nf6', 'Nc3')], },
    { id: 'ph-5', notion: 'adaptation', titre: 'Le piège du mat Légal (après ...Fg4)', coups: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6', cote: 'w',
      texte: 'Après ...Fg4 et ...g6?, Cxe5! : si Noir prend la dame, Fxf7+ puis Cd5 est mat. Un piège, pas une certitude : joue-le seulement si Noir tombe dedans.',
      cases: [z('e5', 'plan')], fleches: [f('f3', 'e5', 'coup', 'plan')], verif: [legal('f3', 'e5'), { t: 'mat', suite: 'Nxe5 Bxd1 Bxf7+ Ke7 Nd5' }],
      strat: [bon('e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6', 'Nxe5')], },
    { id: 'ph-6', notion: 'adaptation', titre: 'Si ...Fe7 trop tôt', coups: PH + ' d4 Nf6 Nc3 Be7', cote: 'w',
      texte: 'Noir a joué ...Fe7 sans prendre en d4 : dxe5! dxe5 Dxd8+ Fxd8 Cxe5 gagne un pion.',
      cases: [z('e5', 'cible')], fleches: [f('d4', 'e5', 'coup', 'plan')], verif: [legal('d4', 'e5'), { t: 'materiel', suite: 'dxe5 dxe5 Qxd8+ Bxd8 Nxe5', camp: 'w', min: 1 }],
      strat: [bon(PH + ' d4 Nf6 Nc3 Be7', 'dxe5'), mauvais(PH + ' d4 Nf6 Nc3 Be7', 'Bc4', 10)], }
  ],
  reconnaitre: [
    R('ph-r1', 'idee', PH, 'w', 'Quel pion noir défend e5 ? Touche-le.', 'd6', 'Le pion d6 défend e5.', [z('d6', 'idee')], [f('d6', 'e5', 'defense', 'idee')], [att('e5', 'd6')]),
    R('ph-r2', 'pieces', PH + ' d4 exd4 Nxd4 Nf6 Nc3', 'w', 'Quelle pièce blanche défend e4 ? Touche-la.', 'c3', 'Le cavalier c3 défend e4.', [z('c3', 'idee')], [f('c3', 'e4', 'defense', 'idee')], [df('e4', 'c3')]),
    R('ph-r3', 'erreur', PH + ' d4 exd4 Nxd4 Nf6', 'w', 'Quel pion blanc est attaqué sans défense ? Touche sa case.', 'e4', 'Le cavalier f6 attaque e4.', [z('e4', 'danger')], [f('f6', 'e4', 'visee', 'danger')], [att('e4', 'f6'), nd('e4')])
  ],
};

/* ---------- Française : variante d'avance (Noirs) ---------- */
const AV = 'e4 e6 d4 d5 e5';
const FR_AVANCE = {
  cartes: [
    { id: 'av-1', notion: 'idee', titre: 'La base de la chaîne : d4', coups: AV + ' c5', cote: 'b',
      texte: 'Les Blancs ont gagné de l’espace, mais leur chaîne d4-e5 a une base : d4. Ton pion c5 l’attaque tout de suite.',
      cases: [z('d4', 'cible')], fleches: [f('c5', 'd4', 'visee', 'plan')], verif: [att('d4', 'c5'), att('e5', 'd4')],
      strat: [bon(AV, 'c5')], },
{ id: 'av-2', notion: 'pieces', titre: 'Qui attaque d4 ?', coups: AV + ' c5 c3 Nc6 Nf3', cote: 'b',
      texte: 'Deux attaquants visent d4 : le pion c5 et le cavalier c6. La dame en b6 ne le vise pas (le pion c5 est sur sa diagonale) : elle attaque b2 et appuiera la pression sur d4 dès que ...cxd4 aura libéré la diagonale.',
      cases: [z('d4', 'cible')], fleches: [f('c5', 'd4', 'visee', 'plan'), f('c6', 'd4', 'visee', 'plan'), f('d8', 'b6', 'coup', 'idee')],
      verif: [att('d4', 'c5'), att('d4', 'c6'), legal('d8', 'b6'), { t: 'suite', coups: 'Qb6', v: { t: 'nonAttaque', sq: 'd4', par: 'b6' } }, { t: 'suite', coups: 'Qb6', v: { t: 'attaque', sq: 'b2', par: 'b6' } }],
      strat: [bon(AV + ' c5 c3 Nc6 Nf3', 'Qb6')] },
    { id: 'av-3', notion: 'plan', titre: 'Libère ton fou c8', coups: AV + ' c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5 Be2', cote: 'b',
      texte: 'Après ...c4, la structure est fixée. Ton fou c8 est ta pièce la plus gênée : il ne peut aller qu’en d7. Sors-le, puis pense à ...f6 pour attaquer e5.',
      cases: [z('d7', 'plan')], fleches: [f('c8', 'd7', 'coup', 'plan')], verif: [legal('c8', 'd7'), { t: 'mobilite', sq: 'c8', max: 1 }],
      strat: [bon(AV + ' c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5 Be2', 'Bd7')], },
{ id: 'av-4', notion: 'erreur', titre: 'Compte avant de prendre', coups: AV + ' c5 c3 Nc6 Nf3', cote: 'b',
      texte: 'd4 est défendu trois fois (c3, Cf3, Dd1) et attaqué deux fois seulement : après …Cxd4 cxd4 cxd4 Cxd4, Noir a donné un cavalier et un pion pour deux pions. Avant de prendre, compte les attaquants et les défenseurs.',
      cases: [z('d4', 'danger')], fleches: [f('c5', 'd4', 'visee', 'plan'), f('c6', 'd4', 'visee', 'plan')],
      verif: [att('d4', 'c5'), att('d4', 'c6'), df('d4', 'c3', 'd1', 'f3'), { t: 'materiel', suite: 'Nxd4 cxd4 cxd4 Nxd4', camp: 'w', min: 2 }],
      strat: [mauvais(AV + ' c5 c3 Nc6 Nf3', 'Nxd4', 20), bon(AV + ' c5 c3 Nc6 Nf3', 'Bd7')] },
    { id: 'av-5', notion: 'adaptation', titre: 'Si Blanc prend en c5', coups: AV + ' c5 dxc5', cote: 'b',
      texte: 'Les Blancs prennent en c5 : reprends avec le fou, qui se développe en visant f2.',
      cases: [z('c5', 'plan')], fleches: [f('f8', 'c5', 'coup', 'plan')], verif: [legal('f8', 'c5')],
      strat: [bon(AV + ' c5 dxc5', 'Bxc5')], }
  ],
  reconnaitre: [
    R('av-r1', 'idee', AV, 'b', 'Quel pion blanc soutient e5 ? Touche-le.', 'd4', 'Le pion d4 défend e5 : c’est la base de la chaîne.', [z('d4', 'cible')], [f('d4', 'e5', 'defense', 'idee')], [att('e5', 'd4')]),
    R('av-r2', 'pieces', AV + ' c5 c3 Nc6 Nf3', 'b', 'Quel pion blanc est attaqué à la fois par c5 et par Cc6 ? Touche-le.', 'd4', 'c5 et Cc6 attaquent d4.', [z('d4', 'cible')], [f('c5', 'd4', 'visee', 'plan'), f('c6', 'd4', 'visee', 'plan')], [att('d4', 'c5'), att('d4', 'c6')]),
    R('av-r3', 'plan', AV + ' c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5 Be2', 'b', 'Quelle pièce noire est la plus gênée ? Touche-la.', 'c8', 'Le fou c8 n’a qu’un coup possible.', [z('c8', 'plan')], [f('c8', 'd7', 'coup', 'plan')], [legal('c8', 'd7'), { t: 'mobilite', sq: 'c8', max: 1 }])
  ],
};

/* ---------- Française : variante d'échange (Noirs) ---------- */
const EX = 'e4 e6 d4 d5 exd5 exd5';
const EXLIGNE = EX + ' Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5';
const FR_ECHANGE = {
  cartes: [
{ id: 'ex-1', notion: 'idee', titre: 'La colonne e est ouverte', coups: EX, cote: 'b',
      texte: 'Les Blancs ont échangé les pions au centre : la structure est symétrique et la colonne e est ouverte pour les deux camps. La partie se décidera sur le développement des pièces et la sécurité du roi.',
      cases: [z('e1', 'idee'), z('e8', 'idee')], fleches: [], verif: [{ t: 'libre', cases: ['e2', 'e3', 'e4', 'e5', 'e6', 'e7'] }] },
    { id: 'ex-2', notion: 'pieces', titre: 'Cloue le cavalier avec ...Fg4', coups: EXLIGNE + ' Bg4', cote: 'b',
      texte: 'Le fou g4 attaque le cavalier f3, qui défend d4 : il est cloué devant la dame. Cela augmente la pression sur le centre blanc.',
      cases: [z('f3', 'cible')], fleches: [f('g4', 'f3', 'visee', 'idee')], verif: [att('f3', 'g4'), { t: 'piece', sq: 'd1', p: 'q', c: 'w' }],
      strat: [bon(EXLIGNE, 'Bg4')], },
    { id: 'ex-3', notion: 'plan', titre: 'Le dernier cavalier : ...Cbd7', coups: EXLIGNE + ' Bg4 Nbd2', cote: 'b',
      texte: 'Sors ton dernier cavalier en d7 : tes pièces sont toutes en jeu et tu défends tes cases.',
      cases: [z('d7', 'plan')], fleches: [f('b8', 'd7', 'coup', 'plan')], verif: [legal('b8', 'd7')],
      strat: [bon(EXLIGNE + ' Bg4 Nbd2', 'Nbd7')], },
    { id: 'ex-4', notion: 'erreur', titre: 'Ne pousse pas un pion sans défense', coups: EX + ' Nf3 Nf6 Bd3', cote: 'b',
      texte: '...b5? semble gagner de l’espace, mais le pion est attaqué par le fou d3 et personne ne le défend : Fxb5+ gagne un pion.',
      cases: [z('b5', 'danger')], fleches: [f('d3', 'b5', 'visee', 'danger')], verif: [att('b5', 'd3'), { t: 'libre', cases: ['c4', 'b5'] }],
      strat: [mauvais(EX + ' Nf3 Nf6 Bd3', 'b5'), bon(EX + ' Nf3 Nf6 Bd3', 'Bd6')], },
{ id: 'ex-5', notion: 'adaptation', titre: 'Si Cc3 attaque d5', coups: EX + ' Nc3', cote: 'b',
      texte: 'Cc3 attaque d5, que seule ta dame défend. Développe en le défendant davantage : ...Cf6 sort une pièce, ajoute un défenseur et prépare le roque.',
      cases: [z('d5', 'danger')], fleches: [f('c3', 'd5', 'visee', 'danger'), f('g8', 'f6', 'coup', 'idee')], verif: [att('d5', 'c3'), df('d5', 'd8'), legal('g8', 'f6')],
      strat: [bon(EX + ' Nc3', 'Nf6')] }
  ],
  reconnaitre: [
    R('ex-r1', 'pieces', EXLIGNE, 'b', 'Quel cavalier noir est attaqué par le fou g5 ? Touche-le.', 'f6', 'Fg5 attaque Cf6.', [z('f6', 'danger')], [f('g5', 'f6', 'visee', 'danger')], [att('f6', 'g5')]),
    R('ex-r2', 'plan', EXLIGNE + ' Bg4', 'b', 'Quelle pièce blanche ton fou g4 attaque-t-il ? Touche-la.', 'f3', 'Le fou g4 attaque le cavalier f3.', [z('f3', 'cible')], [f('g4', 'f3', 'visee', 'idee')], [att('f3', 'g4')]),
    R('ex-r3', 'erreur', EX + ' Nf3 Nf6 Bd3', 'b', 'Quelle pièce blanche attaquerait ton pion s’il allait en b5 ? Touche-la.', 'd3', 'Le fou d3 vise b5.', [z('d3', 'danger')], [f('d3', 'b5', 'visee', 'danger')], [att('b5', 'd3')])
  ],
};

/* ---------- Française : 3.Cc3 (Noirs) ---------- */
const NC = 'e4 e6 d4 d5 Nc3';
const FR_NC3 = {
  cartes: [
    { id: 'nc-1', notion: 'idee', titre: 'd5 est attaqué deux fois', coups: NC, cote: 'b',
      texte: 'Cc3 défend e4 et attaque d5 avec le pion e4. Réagis avec ...Cf6, le plus simple, ou échange avec ...dxe4.',
      cases: [z('d5', 'danger')], fleches: [f('c3', 'd5', 'visee', 'danger'), f('e4', 'd5', 'visee', 'danger')], verif: [att('d5', 'c3'), att('d5', 'e4'), df('e4', 'c3')],
      strat: [bon(NC, 'Nf6'), bon(NC, 'dxe4')], },
    { id: 'nc-2', notion: 'pieces', titre: 'Le cavalier d7 contre e5', coups: NC + ' Nf6 e5 Nfd7 f4', cote: 'b',
      texte: 'Le cavalier d7 attaque e5 : il libère aussi la case f6. Pense ensuite à attaquer la base de la chaîne avec ...c5.',
      cases: [z('e5', 'cible')], fleches: [f('d7', 'e5', 'visee', 'idee'), f('c7', 'c5', 'coup', 'plan')], verif: [att('e5', 'd7'), legal('c7', 'c5')],
      strat: [bon(NC + ' Nf6 e5 Nfd7 f4', 'c5')], },
    { id: 'nc-3', notion: 'plan', titre: 'Attaque d4 avec deux pièces', coups: NC + ' Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3', cote: 'b',
      texte: 'Le pion c5 et le cavalier c6 attaquent d4, défendu par Fe3, Cf3 et la dame. Échange en d4 pour ouvrir la position et libérer ton jeu.',
      cases: [z('d4', 'cible')], fleches: [f('c5', 'd4', 'visee', 'plan'), f('c6', 'd4', 'visee', 'plan')], verif: [att('d4', 'c5'), att('d4', 'c6'), df('d4', 'd1', 'e3', 'f3')],
      strat: [bon(NC + ' Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3', 'cxd4')], },
{ id: 'nc-4', notion: 'erreur', titre: 'Défends avant d’attaquer', coups: NC, cote: 'b',
      texte: 'd5 est bien défendu (pion e6 et dame d8) : le problème de 3...c5? est ailleurs. Après 4.exd5 exd5 5.Fb5+ Cc6 6.dxc5, les Blancs ont gagné un pion. 3...De7? n’est pas mieux : la dame bloque ton fou f8 et laisse la pression en e4 et d5. Joue d’abord ...Cf6 ou ...dxe4.',
      cases: [z('d5', 'idee')], fleches: [f('c3', 'd5', 'visee', 'danger'), f('e4', 'd5', 'visee', 'danger'), f('e6', 'd5', 'defense', 'idee')],
      verif: [att('d5', 'c3'), att('d5', 'e4'), df('d5', 'd8', 'e6'), { t: 'materiel', suite: 'c5 exd5 exd5 Bb5+ Nc6 dxc5', camp: 'w', min: 1 }, { t: 'suite', coups: 'Qe7', v: { t: 'mobilite', sq: 'f8', max: 0 } }],
      strat: [mauvais(NC, 'c5', 5), mauvais(NC, 'Qe7'), bon(NC, 'Nf6'), bon(NC, 'dxe4', 3)] },
    { id: 'nc-5', notion: 'adaptation', titre: 'Winawer : ...c5 après e5', coups: NC + ' Bb4 e5', cote: 'b',
      texte: 'Dans la Winawer, le fou b4 cloue le cavalier c3 contre le roi. Après 4.e5, ...c5 attaque d4 tout en gardant le clouage.',
      cases: [z('c3', 'cible')], fleches: [f('b4', 'c3', 'visee', 'idee'), f('c7', 'c5', 'coup', 'plan')], verif: [att('c3', 'b4'), legal('c7', 'c5'), { t: 'libre', cases: ['d2'] }],
      strat: [bon(NC + ' Bb4 e5', 'c5')], }
  ],
  reconnaitre: [
    R('nc-r1', 'idee', NC, 'b', 'Quel pion noir est attaqué deux fois ? Touche sa case.', 'd5', 'e4 et Cc3 attaquent d5.', [z('d5', 'danger')], [f('c3', 'd5', 'visee', 'danger'), f('e4', 'd5', 'visee', 'danger')], [att('d5', 'c3'), att('d5', 'e4')]),
    R('nc-r2', 'pieces', NC + ' Nf6 e5 Nfd7 f4', 'b', 'Quel pion blanc ton cavalier d7 attaque-t-il ? Touche-le.', 'e5', 'Cd7 attaque e5.', [z('e5', 'cible')], [f('d7', 'e5', 'visee', 'idee')], [att('e5', 'd7')]),
    R('nc-r3', 'adaptation', NC + ' Bb4 e5', 'b', 'Quelle pièce blanche est clouée par le fou b4 ? Touche-la.', 'c3', 'Le cavalier c3 est cloué contre le roi.', [z('c3', 'cible')], [f('b4', 'c3', 'visee', 'idee')], [att('c3', 'b4'), { t: 'libre', cases: ['d2'] }])
  ],
};

/* ---------- Française : 2.Cf3 (Noirs) ---------- */
const NF = 'e4 e6 Nf3 d5';
const FR_NF3 = {
  cartes: [
    { id: 'nf-1', notion: 'idee', titre: 'Joue ...d5 tout de suite', coups: NF, cote: 'b',
      texte: 'Les Blancs n’ont pas pris le centre avec d4 : ...d5 attaque e4 immédiatement. Ils doivent le défendre, l’avancer ou l’échanger.',
      cases: [z('e4', 'danger')], fleches: [f('d5', 'e4', 'visee', 'danger')], verif: [att('e4', 'd5'), nd('e4')],
      strat: [bon('e4 e6 Nf3', 'd5')], },
    { id: 'nf-2', notion: 'pieces', titre: 'Tu retrouves la variante d’échange', coups: 'e4 e6 Nf3 d5 exd5 exd5 d4', cote: 'b',
      texte: 'Après 3.exd5 exd5 4.d4, tu arrives exactement dans la variante d’échange, par un autre ordre de coups : développe ...Fd6, roque, ...Fg4.',
      cases: [z('f6', 'idee')], fleches: [f('f8', 'd6', 'coup', 'plan')], verif: [{ t: 'transpose', coups: 'e4 e6 d4 d5 exd5 exd5 Nf3' }, legal('f8', 'd6')],
      strat: [bon('e4 e6 Nf3 d5 exd5 exd5 d4', 'Nf6')], },
    { id: 'nf-3', notion: 'plan', titre: 'Contre e5 : retrouve l’avance', coups: 'e4 e6 Nf3 d5 e5 c5 d4 Nc6 c3', cote: 'b',
      texte: 'Si les Blancs jouent 3.e5, tu retrouves la variante d’avance. Attaque d4 avec ...c5, ...Cc6 puis ...Db6.',
      cases: [z('d4', 'cible')], fleches: [f('c5', 'd4', 'visee', 'plan'), f('c6', 'd4', 'visee', 'plan'), f('d8', 'b6', 'coup', 'idee')], verif: [att('d4', 'c5'), att('d4', 'c6'), legal('d8', 'b6'), { t: 'transpose', coups: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3' }],
      strat: [bon('e4 e6 Nf3 d5 e5 c5 d4 Nc6 c3', 'Qb6')], },
    { id: 'nf-4', notion: 'erreur', titre: 'Ne laisse pas e5 sans défense', coups: 'e4 e6 Nf3 e5', cote: 'b',
      texte: '2...e5? n’a pas de soutien : le cavalier f3 attaque e5 qui n’est défendu par rien. Joue ...d5 tout de suite.',
      cases: [z('e5', 'danger')], fleches: [f('f3', 'e5', 'visee', 'danger')], verif: [att('e5', 'f3'), nd('e5')],
      strat: [mauvais('e4 e6 Nf3', 'e5'), bon('e4 e6 Nf3', 'd5')], },
    { id: 'nf-5', notion: 'adaptation', titre: 'Contre d3 : prends ta part du centre', coups: 'e4 e6 Nf3 d5 d3', cote: 'b',
      texte: 'Les Blancs défendent e4 avec d3 sans prendre le centre. ...dxe4 ou ...c5 te laissent un jeu simple.',
      cases: [z('e4', 'cible')], fleches: [f('d5', 'e4', 'visee', 'idee')], verif: [att('e4', 'd5')],
      strat: [bon('e4 e6 Nf3 d5 d3', 'dxe4'), bon('e4 e6 Nf3 d5 d3', 'c5')], }
  ],
  reconnaitre: [
    R('nf-r1', 'idee', NF, 'b', 'Quel pion blanc est attaqué ? Touche sa case.', 'e4', 'Le pion d5 attaque e4.', [z('e4', 'danger')], [f('d5', 'e4', 'visee', 'danger')], [att('e4', 'd5'), nd('e4')]),
    R('nf-r2', 'plan', 'e4 e6 Nf3 d5 e5 c5 d4 Nc6 c3', 'b', 'Quel pion blanc est attaqué à la fois par c5 et par Cc6 ? Touche-le.', 'd4', 'Ils attaquent d4.', [z('d4', 'cible')], [f('c5', 'd4', 'visee', 'plan'), f('c6', 'd4', 'visee', 'plan')], [att('d4', 'c5'), att('d4', 'c6')]),
    R('nf-r3', 'erreur', 'e4 e6 Nf3 e5', 'b', 'Quel pion noir est attaqué sans défense ? Touche sa case.', 'e5', 'Cf3 attaque e5.', [z('e5', 'danger')], [f('f3', 'e5', 'visee', 'danger')], [att('e5', 'f3'), nd('e5')])
  ],
};

/* ---------- Réponse à l'Italienne (Noirs) ---------- */
const IT = E4E5_NF3_NC6_BC4;
const E5_ITALIENNE = {
  cartes: [
    { id: 'it-1', notion: 'idee', titre: '3...Cf6 attaque e4', coups: IT + ' Nf6', cote: 'b',
      texte: 'Avec 3...Cf6 tu attaques e4 et tu contestes le centre. Tu développes sans passivité ; ton plan : fou, roque, puis ...d6 ou ...d5.',
      cases: [z('e4', 'cible')], fleches: [f('f6', 'e4', 'visee', 'idee')], verif: [att('e4', 'f6'), nd('e4')],
      strat: [bon(IT, 'Nf6')], },
    { id: 'it-2', notion: 'pieces', titre: 'Fe7 ou Fc5 après d3', coups: IT + ' Nf6 d3', cote: 'b',
      texte: 'Après 4.d3, sors ton fou : ...Fe7 est solide, ...Fc5 est actif (c’est un Giuoco). Les deux préparent le roque.',
      cases: [z('e7', 'plan'), z('c5', 'plan')], fleches: [f('f8', 'e7', 'coup', 'plan'), f('f8', 'c5', 'coup', 'plan')], verif: [legal('f8', 'e7'), legal('f8', 'c5')],
      strat: [bon(IT + ' Nf6 d3', 'Be7'), bon(IT + ' Nf6 d3', 'Bc5')], },
    { id: 'it-3', notion: 'plan', titre: 'Mets ton roi à l’abri', coups: IT + ' Nf6 d3 Be7 O-O', cote: 'b',
      texte: 'Tes pièces sont sorties : roque. Ton roi quitte le centre et la tour sort de son coin.',
      cases: [z('g8', 'plan')], fleches: [f('e8', 'g8', 'coup', 'plan')], verif: [legal('e8', 'g8')],
      strat: [bon(IT + ' Nf6 d3 Be7 O-O', 'O-O')], },
    { id: 'it-4', notion: 'erreur', titre: 'Après Cg5 : jamais ...Cxd5', coups: IT + ' Nf6 Ng5 d5 exd5', cote: 'b',
      texte: 'Cg5 vise f7. Après 5.exd5, le pion d5 bloque le fou c4 ; si tu reprends 5...Cxd5?, la diagonale se rouvre et Cxf7 (Fried Liver) te met en grande difficulté. Réponds 5...Ca5, qui chasse le fou.',
      cases: [z('f7', 'danger')], fleches: [f('g5', 'f7', 'visee', 'danger')], verif: [att('f7', 'g5')],
      strat: [bon(IT + ' Nf6 Ng5 d5 exd5', 'Na5'), mauvais(IT + ' Nf6 Ng5 d5 exd5', 'Nxd5')], },
{ id: 'it-5', notion: 'adaptation', titre: 'Si Blanc joue d4', coups: IT + ' Nf6 d4', cote: 'b',
      texte: 'Si les Blancs jouent 4.d4, prends : ...exd4. Tu gagnes un pion, mais les Blancs obtiennent du jeu en se développant vite (5.O-O Cxe4 6.Te1 d5) : Stockfish juge la position équilibrée.',
      cases: [z('d4', 'cible')], fleches: [f('e5', 'd4', 'coup', 'plan')], verif: [legal('e5', 'd4'), { t: 'materiel', suite: 'exd4', camp: 'b', min: 1 }],
      strat: [bon(IT + ' Nf6 d4', 'exd4')] }
  ],
  reconnaitre: [
    R('it-r1', 'idee', IT + ' Nf6', 'b', 'Quel pion blanc ton cavalier f6 attaque-t-il ? Touche-le.', 'e4', 'Cf6 attaque e4.', [z('e4', 'cible')], [f('f6', 'e4', 'visee', 'idee')], [att('e4', 'f6')]),
    R('it-r2', 'erreur', IT + ' Nf6 Ng5', 'b', 'Quel pion noir est attaqué deux fois ? Touche-le.', 'f7', 'Cg5 et Fc4 attaquent f7.', [z('f7', 'danger')], [f('g5', 'f7', 'visee', 'danger'), f('c4', 'f7', 'visee', 'danger')], [att('f7', 'g5'), att('f7', 'c4')]),
    R('it-r3', 'plan', IT + ' Nf6 d3 Be7 O-O', 'b', 'Sur quelle case ton roi va-t-il en roquant ? Touche-la.', 'g8', 'Le petit roque envoie le roi en g8.', [z('g8', 'plan')], [f('e8', 'g8', 'coup', 'plan')], [legal('e8', 'g8')])
  ],
};

/* ---------- Contre la dame précoce (Noirs) ---------- */
const DM = 'e4 e5 Qh5';
const E5_DAME = {
  cartes: [
{ id: 'dm-1', notion: 'idee', titre: 'La dame attaque e5', coups: DM, cote: 'b',
      texte: 'La dame blanche attaque e5, f7 et h7. Défends e5 en développant une pièce avec ...Cc6 : la dame sortie trop tôt devient une cible.',
      cases: [z('e5', 'danger'), z('f7', 'danger'), z('h7', 'danger')], fleches: [f('h5', 'e5', 'visee', 'danger'), f('h5', 'f7', 'visee', 'danger'), f('h5', 'h7', 'visee', 'danger')],
      verif: [att('e5', 'h5'), att('f7', 'h5'), att('h7', 'h5')], strat: [bon(DM, 'Nc6')] },
    { id: 'dm-2', notion: 'pieces', titre: 'Cc6 défend e5', coups: DM + ' Nc6', cote: 'b',
      texte: 'Le cavalier c6 défend e5 et se développe en même temps. Tu pourras ensuite attaquer la dame avec ...g6 ou ...Cf6.',
      cases: [z('e5', 'idee')], fleches: [f('c6', 'e5', 'defense', 'idee')], verif: [att('e5', 'c6')], },
    { id: 'dm-3', notion: 'plan', titre: 'Chasser la dame, sans te presser', coups: DM + ' Nc6 Bc4 g6 Qf3 Nf6', cote: 'b',
      texte: 'Après ...g6 la dame recule ; ...Cf6 attaque e4 et masque la colonne f. Ensuite ...Fg7 et ...d6 : un développement simple.',
      cases: [z('e4', 'cible')], fleches: [f('f6', 'e4', 'visee', 'idee')], verif: [att('e4', 'f6')],
      strat: [bon(DM + ' Nc6 Bc4 g6 Qf3', 'Nf6')], },
    { id: 'dm-4', notion: 'erreur', titre: 'Pas de ...Cf6 sous la menace de mat', coups: DM + ' Nc6 Bc4', cote: 'b',
      texte: 'La dame et le fou visent f7 : 3...Cf6?? permet Dxf7#, le mat du berger. Joue ...g6 pour chasser la dame, ou ...De7 pour défendre f7.',
      cases: [z('f7', 'danger')], fleches: [f('h5', 'f7', 'visee', 'danger'), f('c4', 'f7', 'visee', 'danger')], verif: [att('f7', 'h5'), att('f7', 'c4'), { t: 'mat', suite: 'Nf6 Qxf7' }],
      strat: [mauvais(DM + ' Nc6 Bc4', 'Nf6', 20), bon(DM + ' Nc6 Bc4', 'g6')], },
    { id: 'dm-5', notion: 'adaptation', titre: '2...Cf6 est jouable', coups: DM + ' Nf6 Qxe5+', cote: 'b',
      texte: '2...Cf6 attaque la dame, qui prend e5 avec échec. Réponds ...Fe7 : tu as laissé un pion, mais la dame blanche est exposée et Stockfish juge la position équilibrée. 3...De7? est plus faible : après l’échange des dames tu es simplement un pion de moins.',
      cases: [z('e7', 'plan')], fleches: [f('f8', 'e7', 'coup', 'plan')], verif: [legal('f8', 'e7')],
      strat: [bon(DM + ' Nf6 Qxe5+', 'Be7'), egal(DM + ' Nf6 Qxe5+ Be7', 60), mauvais(DM + ' Nf6 Qxe5+', 'Qe7')], }
  ],
  reconnaitre: [
    R('dm-r1', 'erreur', DM + ' Nc6 Bc4', 'b', 'Quel pion noir est visé à la fois par la dame et le fou ? Touche-le.', 'f7', 'Dh5 et Fc4 attaquent f7.', [z('f7', 'danger')], [f('h5', 'f7', 'visee', 'danger'), f('c4', 'f7', 'visee', 'danger')], [att('f7', 'h5'), att('f7', 'c4')]),
    R('dm-r2', 'pieces', DM + ' Nc6', 'b', 'Quel cavalier noir défend e5 ? Touche-le.', 'c6', 'Cc6 défend e5.', [z('c6', 'idee')], [f('c6', 'e5', 'defense', 'idee')], [att('e5', 'c6')]),
    R('dm-r3', 'plan', DM + ' Nc6 Bc4 g6 Qf3 Nf6', 'b', 'Quel pion blanc ton cavalier f6 attaque-t-il ? Touche-le.', 'e4', 'Cf6 attaque e4.', [z('e4', 'cible')], [f('f6', 'e4', 'visee', 'idee')], [att('e4', 'f6')])
  ],
};

export const LECONS_PLUS = {
  'deux-cavaliers': DEUX_CAVALIERS, giuoco: GIUOCO, caro: CARO, scandinave: SCANDINAVE, philidor: PHILIDOR,
  'fr-avance': FR_AVANCE, 'fr-echange': FR_ECHANGE, 'fr-nc3': FR_NC3, 'fr-nf3': FR_NF3, 'e5-italienne': E5_ITALIENNE, 'e5-dame': E5_DAME
};
