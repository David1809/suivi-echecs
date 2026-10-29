/* Cours d'ouvertures : contenu rédigé à la main.
   Vérifications faites par le logiciel : chaque ligne est légale (chess.js) et reste équilibrée d'après Stockfish (aucun coup ne perd plus de 7 points de chances de gagner).
   Les explications sont des principes généraux d'ouverture, pas la sortie d'un moteur : elles peuvent être simplifiées.
   coups : suite SAN depuis la position de départ. notes : { numéro du demi-coup (1 = premier coup des blancs) : explication }.
   re : filtre sur le nom d'ouverture chess.com, pour retrouver tes parties. */

export const COURS = [
  /* ------------------------------------------------------------------ BLANCS */
  {
    id: 'deux-cavaliers', nom: 'Italienne : défense des deux cavaliers', co: 'blancs', debut: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6',
    re: /^(Italian-Game-Two-Knights|Italian-Game(?!-Hungarian))/,
    idee: 'Tu développes vite tes pièces vers le centre et tu vises f7, le point faible de Noir (défendu seulement par son roi). Contre 3...Nf6, Noir attaque ton pion e4 : tu le défends calmement avec d3, tu roques, puis tu prépares c3 et d4 pour t’emparer du centre.',
    objectifs: ['Sortir cavalier et fou, puis roquer en cinq ou six coups.', 'Défendre e4 sans te compliquer la vie, puis préparer c3 et d4.', 'Garder le fou c4 actif sur la diagonale a2-g8, avec la retraite b3 si on l’attaque.'],
    lignes: [
      { nom: 'Ligne solide 4.d3', coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O d6 c3 O-O Re1 a6 Bb3 Na5 Bc2 c5 Nbd2', resume: 'La plus simple à jouer : pas de théorie lourde, des plans clairs.',
        notes: {
          1: 'Tu prends une case centrale et tu libères le fou f1 et la dame.',
          2: 'Noir prend aussi le centre et prépare ...Nc6.',
          3: 'Le cavalier sort et attaque e5 : il développe une pièce ET crée une menace.',
          4: 'Noir défend e5 en développant une pièce.',
          5: 'Le fou vise f7, le point faible de Noir. Cette pression le gêne pendant tout le début de partie.',
          6: 'Noir développe et attaque ton pion e4 : c’est la défense des deux cavaliers.',
          7: { t: 'Tu défends e4 avec un pion et tu ouvres la diagonale du fou c1. Version tranquille : on ne prend aucun risque.', alt: "Tu peux aussi jouer 4.Nc3 (naturel) ou 4.Ng5 (attaque f7, mais très théorique). 4.d3 est le plus simple.", att: "Noir joue souvent ...Be7, ...Bc5 ou ...d6 pour finir son développement." },
          9: { t: 'Le roque met le roi à l’abri avant que le centre s’ouvre.', alt: "5.Nc3 est jouable, mais le roque met ton roi à l’abri avant que le centre s’ouvre.", att: "Noir roque lui aussi, ou joue ...d6." },
          11: { t: 'Ce pion prépare d4 pour prendre le centre, et laisse la case b3 au fou.', alt: "6.Nc3 est possible, mais il bloque le pion c : avec c3 tu gardes d4 en réserve.", att: "Noir joue souvent ...O-O ou ...a6." },
          13: 'La tour soutient e4 et occupe la colonne e.',
          15: 'Noir vient de jouer ...a6 pour chasser ton fou avec ...b5 : tu le retires sur b3, où il garde sa diagonale.',
          17: 'Le fou se replie sur c2 : il reste en jeu et protège e4.',
          19: 'Le dernier cavalier sort derrière d3 : toutes tes pièces sont développées.'
        } },
      { nom: 'Attaque 4.Ng5 (risquée)', coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6', resume: 'Agressive mais Noir a une bonne réponse (5...Na5). Position égale avec un jeu difficile : à éviter tant que tu ne la connais pas.',
        notes: { 7: 'Le cavalier attaque f7 en doublant avec le fou. C’est un piège contre 4...d5 5.exd5 Nxd5?, mais Noir a mieux.', 10: 'La bonne réponse de Noir : il ne reprend pas en d5 (Nxf7 serait fort), il attaque le fou à la place.' } },
      { nom: 'Gambit 4.d4', coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qa5 Nxe4 Be6', resume: 'Jeu ouvert avec des pièces actives : demande de connaître l’enchaînement.', notes: { 7: 'Tu ouvres le centre sans attendre : d4 attaque e5.', 9: 'Tu laisses un pion pour développer vite et garder l’initiative.' } },
      { nom: 'Si 3...h6 (réponse lente)', coups: 'e4 e5 Nf3 Nc6 Bc4 h6 d3 Nf6 O-O d6 c3 Be7 Re1 O-O Nbd2', resume: 'Noir perd un temps avec ...h6 : tu continues ton développement.', notes: { 6: 'Ce coup empêche Ng5 mais ne développe aucune pièce. Tu n’as pas à réagir : poursuis ton plan.' } }
    ],
    plans: [
      { t: "Plan 1 : roquer, puis c3 et d4", obj: "Prendre le centre avec les pions après avoir mis le roi à l’abri.", coups: "O-O, c3, Re1, Nbd2, puis d4.", pq: "c3 prépare d4 sans laisser Noir attaquer ton centre, et roquer d’abord évite les mauvaises surprises sur la colonne e.", cond: "e4 est bien défendu (d3 et Re1) et Noir n’a pas déjà frappé au centre avec ...d5. Si Noir prend en d4, reprends avec le pion c (cxd4) pour garder un beau centre.", ev: "Pousser d4 avant d’avoir roqué : si le centre s’ouvre, ton roi est en danger." },
      { t: "Plan 2 : garder le fou c4 actif", obj: "Conserver ta pièce la plus active sur la diagonale a2-g8.", coups: "Bb3 quand il est attaqué, éventuellement Bc2.", pq: "Un fou retiré en b3 reste en jeu et protège e4 ; l’échanger contre un cavalier donne à l’adversaire la paire de fous sans rien en échange.", cond: "Le fou est menacé par ...a6 et ...b5, ou par ...Na5.", ev: "Laisser le fou se faire échanger sans y avoir réfléchi." },
      { t: "Plan 3 : s’appuyer sur la colonne e", obj: "Mettre la pression sur le pion e de Noir quand le centre se clarifie.", coups: "Re1, puis d4 ou exd5 pour ouvrir la colonne.", pq: "Une tour sur une colonne ouverte, face à un roi encore au centre, crée des menaces.", cond: "Les pions centraux sont échangés et Noir n’a pas encore roqué.", ev: "Ouvrir la colonne alors que ton propre roi n’est pas à l’abri." }
    ],
    pieges: [{ titre: 'Le Fried Liver (si Noir reprend en d5)', coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3', cond: 'Noir doit reprendre 5...Nxd5 ; contre 5...Na5 il n’y a plus de piège, et un adversaire qui connaît la position se défend bien.', texte: 'Contre 5...Nxd5? tu sacrifies le cavalier en f7 : le roi noir est attiré au centre et attaqué par toutes tes pièces. Mais contre 5...Na5 il n’y a plus de piège.' }],
    erreurs: ['Sortir la dame trop tôt (Qh5, Qf3) : elle se fait chasser.', 'Jouer Ng5 sans connaître la réponse 5...Na5.', 'Retarder le roque : un roi resté au centre est vulnérable quand les lignes s’ouvrent.', 'Jouer d4 sans avoir roqué ni défendu e4.']
  },
  {
    id: 'giuoco', nom: 'Italienne : Giuoco Piano (3...Bc5)', co: 'blancs', debut: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5',
    re: /^(Giuoco-Piano|Italian-Game-Classical)/,
    idee: 'Les deux camps ont sorti le fou sur la diagonale a2-g8. Le « jeu tranquille » (Giuoco Piano) consiste à bâtir un centre solide avec c3 et d3, à roquer et à faire manœuvrer le cavalier b1 vers g3. Pas de tactique forcée : un plan long qui récompense la patience.',
    objectifs: ['Préparer un centre solide avec c3 puis d3 ou d4.', 'Mettre le roi à l’abri et le fou en b3, hors d’atteinte.', 'Faire passer le cavalier b1 par d2, f1 puis g3 pour attaquer sur l’aile roi.'],
    lignes: [
      { nom: 'Giuoco Pianissimo (plan lent)', coups: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 h3 h6 Nbd2 Re8 Nf1', resume: 'La ligne que je te conseille : sûre, jouée à tous les niveaux, avec un plan fixe.',
        notes: {
          5: 'Le fou pointe sur f7 et sur le centre. Noir en fait autant avec ...Bc5.',
          6: 'Noir place son fou sur la même diagonale : il vise f2.',
          7: { t: 'Ce pion prépare d4 et donne une retraite au fou (b3).', alt: "Tu peux aussi jouer d3 d’abord : le plan reste le même.", att: "Noir répond le plus souvent ...Nf6." },
          8: 'Noir développe et attaque e4.',
          9: { t: 'Tu défends e4 tranquillement : on garde la tension sans prendre de risque.', alt: "5.d4 est plus tranchant mais plus théorique (voir la variante centrale).", att: "Noir défend e5 avec ...d6." },
          10: 'Noir défend e5 et libère son fou c8.',
          11: { t: 'Tu roques : le roi est à l’abri avant d’ouvrir le centre.', alt: "Retarder le roque est risqué : le centre peut s’ouvrir d’un coup.", att: "Noir roque aussi." },
          13: 'La tour surveille la colonne e et soutient e4.',
          15: 'Le fou se retire hors de portée de ...Na5 ou ...d5 tout en gardant sa diagonale.',
          16: 'Noir met son fou à l’abri de d4 en le reculant sur a7.',
          17: 'Ce coup empêche ...Bg4, qui clouerait ton cavalier f3.',
          19: 'Le cavalier b1 sort en d2 pour ne pas gêner la dame.',
          21: 'Le cavalier se dirige vers g3 ou e3 pour viser l’aile roi.'
        } },
      { nom: 'Variante centrale 5.d4', coups: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Nce7 O-O O-O Rfe1 c6', resume: 'Plus dynamique : tu prends le centre tout de suite. Position équilibrée si Noir répond bien.', notes: { 9: 'Tu attaques le centre avec d4 : la position va s’ouvrir.', 13: 'L’échange des fous simplifie : ton cavalier d2 est bien placé après la reprise.' } },
      { nom: 'Gambit Evans 4.b4', coups: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 Qb3 Qd7 cxd4 Bb6', resume: 'Tu laisses un pion pour gagner du temps et construire un grand centre : jeu d’attaque.', notes: { 7: 'Le pion b4 est un appât : si Noir le prend, tu gagnes du temps avec c3 et d4 pour bâtir un grand centre.' } },
      { nom: 'Si 4...d6 (Noir est lent)', coups: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 d6 d4 exd4 cxd4 Bb6 Nc3 Nf6 O-O O-O', resume: 'Noir ne sort pas son cavalier : tu en profites pour occuper le centre.', notes: { 9: 'Comme Noir n’a pas développé son cavalier g8, tu peux jouer d4 sans risque.' } }
    ],
    plans: [
      { t: "Plan 1 : le plan lent (c3, d3, roque)", obj: "Construire un centre solide, puis ouvrir au bon moment.", coups: "c3, d3, O-O, Re1, h3, Nbd2.", pq: "c3 donne une retraite au fou (b3) et prépare d4 ; d3 défend e4 ; h3 empêche ...Bg4 qui clouerait ton cavalier f3.", cond: "Noir ne pousse pas ...d5 trop tôt, et tu restes patient.", ev: "Jouer d4 sans avoir roqué ni sécurisé e4." },
      { t: "Plan 2 : faire manœuvrer le cavalier b1", obj: "Amener ce cavalier vers l’aile roi.", coups: "Nbd2, puis Nf1 et Ng3 (ou Ne3).", pq: "Depuis g3 ou e3, il surveille des cases clés et participe à l’attaque.", cond: "La position est fermée, sans menace immédiate au centre.", ev: "Manœuvrer sans surveiller ...d5, qui peut ouvrir le centre contre toi." },
      { t: "Plan 3 : d4 au bon moment", obj: "Prendre de la place au centre quand tu es prêt.", coups: "d4, après c3, le roque et Nbd2 ou Re1.", pq: "Un pion en d4 soutenu par c3 gêne les fous noirs et t’offre un centre solide.", cond: "Tu as roqué et e4 est bien défendu.", ev: "Pousser d4 trop tôt, alors que ton roi est encore au centre." },
      { t: "Plan 4 : le gambit Evans (optionnel)", obj: "Jouer pour l’attaque en laissant un pion.", coups: "b4, puis c3 et d4.", pq: "Tu gagnes des temps de développement en échange d’un grand centre.", cond: "Tu connais l’enchaînement : le gambit demande de la précision.", ev: "Jouer b4 sans plan : tu serais simplement un pion en moins." }
    ],
    pieges: [],
    erreurs: ['Jouer d4 trop tôt sans avoir roqué ni sécurisé e4.', 'Oublier que ...Bg4 clouerait ton cavalier f3 : prépare h3.', 'Échanger ton fou c4 sans raison : c’est ta pièce la plus active.', 'Attaquer sans avoir développé toutes tes pièces.']
  },
  {
    id: 'fou', nom: 'Partie du fou (2.Bc4)', co: 'blancs', debut: '1.e4 e5 2.Bc4',
    re: /^Bishops-/,
    idee: 'Tu sors le fou tout de suite vers f7 et tu gardes le cavalier g1 pour plus tard. Tu peux ainsi choisir la suite selon la réponse de Noir : plan « italien » avec Nf3, ou autre. L’avantage : tu évites une partie de la théorie.',
    objectifs: ['Développer vite : fou, puis d3 et Nf3 pour un centre solide.', 'Rester flexible : tu peux encore jouer f4 si Noir ne contrôle pas e5.', 'Roquer tôt et jouer Nc3 / Nbd2 sans te précipiter.'],
    lignes: [
      { nom: '2...Nf6 3.d3', coups: 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6 Nc3 O-O', resume: 'La réponse la plus courante : tu défends e4 solidement.',
        notes: { 3: 'Le fou vise f7 sans engager le cavalier : ta structure reste flexible.', 4: 'Noir développe et attaque ton pion e4.', 5: { t: 'Tu défends e4 avec un pion : tranquille et sûr, et tu ouvres la diagonale du fou c1.', alt: "3.Nc3 est aussi possible, mais d3 est plus simple.", att: "Noir joue souvent ...c6 ou ...d5 pour prendre le centre." }, 6: 'Noir prépare ...d5 pour prendre le centre.', 7: 'Le cavalier sort : il surveille e5 et prépare le roque.', 8: 'Noir s’empare du centre.', 9: 'Le fou se retire : il évite ...d4 tout en gardant une bonne diagonale.' } },
      { nom: '2...Nf6 3.d3 Nc6 (retour à l’italienne)', coups: 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6 c3 O-O Re1', resume: 'Tu retrouves un Giuoco Pianissimo : mêmes plans.', notes: { 7: 'Tu arrives dans la structure de la partie italienne : roque, c3, Re1.' } },
      { nom: '2...Nf6 3.d3 d5', coups: 'e4 e5 Bc4 Nf6 d3 d5 exd5 Nxd5 Nf3 Nc6 O-O Be7 Re1 O-O Nbd2', resume: 'Noir prend le centre : tu échanges et tu développes calmement.', notes: { 7: 'Tu ouvres la colonne e : ton fou c4 vise d5.' } },
      { nom: '2...Bc5', coups: 'e4 e5 Bc4 Bc5 Nf3 d6 c3 Nf6 d3 O-O O-O', resume: 'Noir copie : tu retrouves la structure du Giuoco.', notes: { 5: 'Tu développes le cavalier vers f3 en visant e5.' } },
      { nom: '2...Nc6 3.Nf3', coups: 'e4 e5 Bc4 Nc6 Nf3 Nf6 d3 Bc5 O-O d6 c3', resume: 'Retour à la partie italienne.', notes: { 5: 'Tu es revenu à la partie italienne.' } }
    ],
    plans: [
      { t: "Plan 1 : d3, Nf3, roque", obj: "Bâtir une position solide, sans théorie lourde.", coups: "d3, Nf3, O-O, puis c3.", pq: "d3 défend e4 et libère le fou c1 ; Nf3 attaque e5 ; le roque met ton roi à l’abri. Ensuite tu choisis la suite selon la réponse de Noir.", cond: "Noir ne menace rien de précis au centre.", ev: "Attendre trop longtemps : sans contrôle du centre, Noir joue ...d5 gratuitement." },
      { t: "Plan 2 : f4 si Noir est passif", obj: "Attaquer e5 et ouvrir la colonne f vers f7.", coups: "Nc3, puis f4.", pq: "Le fou c4 vise déjà f7 ; f4 ajoute une deuxième menace sur ce point faible.", cond: "Noir n’a ni défendu e5 ni attaqué e4, et ton roi est en sécurité.", ev: "Jouer f4 sans réfléchir à ...Qh4+ : f4 affaiblit la diagonale de ton roi." },
      { t: "Plan 3 : répondre à ...d5", obj: "Ne pas laisser Noir prendre le centre.", coups: "exd5, puis Nf3 et O-O.", pq: "Après ...d5, ton fou c4 et ton pion e4 sont attaqués : échanger sur d5 règle les deux problèmes.", cond: "Noir a joué ...d5 alors que tu n’es pas encore engagé ailleurs.", ev: "Oublier que le pion d5 attaque ton fou c4." }
    ],
    pieges: [],
    erreurs: ['Sortir la dame trop tôt : elle se fait chasser.', 'Oublier de défendre e4 après ...Nf6.', 'Jouer f4 sans avoir roqué : l’aile roi s’affaiblit.', 'Laisser le fou c4 être attaqué sans avoir prévu sa retraite.']
  },
  {
    id: 'caro', nom: 'Contre la Caro-Kann (1...c6)', co: 'blancs', debut: '1.e4 c6 2.d4 d5',
    re: /^Caro-Kann/,
    idee: 'Noir prépare ...d5 avec un pion c6 : il veut un centre solide et sortir le fou c8 avant de fermer sa position. Tu as trois bonnes réponses : 3.Nc3 (classique), 3.e5 (avance) et 3.exd5 (échange). L’important est de développer vite et de garder ton centre.',
    objectifs: ['Prendre le centre avec d4 et développer vite.', 'Contre ...Bf5, ne pas te laisser embêter : trouve un plan clair.', 'Roquer et garder une structure solide.'],
    lignes: [
      { nom: '3.Nc3 dxe4 4.Nxe4 Bf5 (classique)', coups: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6', resume: 'La ligne la plus courante : tu gagnes de l’espace et tu chasses le fou.',
        notes: { 5: 'Tu défends e4 en développant : le plus naturel.', 6: 'Noir prend en e4 : il abandonne le centre pour sortir son fou.', 7: 'Tu récupères le pion avec le cavalier, qui est bien centralisé.', 8: 'Le fou sort avant ...e6 : le plan de Noir.', 9: 'Le cavalier attaque le fou f5 : il doit se retirer.', 11: 'Ton pion h attaque le fou g6 : tu gagnes de l’espace sur l’aile roi.', 13: 'Tu développes le cavalier et protèges ton aile roi.', 15: 'Le pion attaque le fou : il va devoir échanger ou se retirer.', 17: 'Tu échanges le fou noir actif, ta position reste plus ouverte.' } },
      { nom: '3.e5 (avance)', coups: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7 c3', resume: 'Tu gagnes de l’espace et tu gardes une chaîne de pions solide.',
        notes: { 5: 'Tu avances le pion : il gagne de l’espace et enferme le fou c8 (s’il ne sort pas).', 6: 'Noir sort son fou avant de fermer sa structure avec ...e6.', 7: 'Tu développes le cavalier et défends d4.', 8: 'Noir ferme sa structure : le fou f5 est dehors.', 10: 'Noir attaque ta chaîne de pions à sa base (d4).', 11: 'Le fou défend d4 et se place bien.', 13: 'Tu roques : le roi est en sécurité.', 15: 'Ce pion renforce d4 et ta chaîne.' } },
      { nom: '3.exd5 cxd5 (échange)', coups: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6 Bxd6 Qxd6', resume: 'Une position simple : tu as une avance de développement.', notes: { 5: 'Tu échanges le pion central : la structure devient symétrique.', 7: 'Le fou se place sur sa meilleure diagonale, visant h7.', 11: 'Tu développes ton fou avant d’enfermer ton pion e.' } }
    ],
    plans: ['Développer vite : cavalier, fou, roque.', 'Garder la chaîne d4-e5 si tu joues l’avance, avec c3 pour la renforcer.', 'Contre ...Bf5, chasser le fou avec Ng3 puis h4.', 'Éviter de compliquer : une position saine suffit contre ce défenseur solide.'],
    pieges: [],
    erreurs: ['Oublier de défendre d4 quand ...c5 arrive.', 'Avancer h4 sans avoir développé tes pièces.', 'Laisser le fou f5 noir tranquille quand tu peux le chasser.', 'Échanger ton fou blanc sans raison : c’est ta pièce utile.']
  },
  {
    id: 'scandinave', nom: 'Contre la Scandinave (1...d5)', co: 'blancs', debut: '1.e4 d5 2.exd5',
    re: /^Scandinavian/,
    idee: 'Noir attaque ton pion e4 dès le premier coup. Tu prends en d5 : si la dame reprend, tu gagnes du temps en l’attaquant avec Nc3, puis tu prends le centre avec d4. La dame noire est sortie tôt : tu développes plus vite.',
    objectifs: ['Gagner du temps sur la dame noire avec Nc3.', 'Établir un centre fort avec d4 et développer toutes tes pièces.', 'Roquer et profiter de ton avance de développement.'],
    lignes: [
      { nom: '2...Qxd5 3.Nc3 Qa5', coups: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6', resume: 'La ligne la plus courante : tu développes avec tempo.',
        notes: { 3: 'Tu prends le pion : Noir doit reprendre.', 4: 'La dame noire sort tôt.', 5: 'Tu attaques la dame en développant une pièce : un coup qui fait deux choses.', 6: 'La dame se met à l’abri sur a5 et cloue ton cavalier c3 contre ton roi (diagonale a5-e1).', 7: 'Tu prends le centre avec d4 : ta structure est solide.', 8: 'Noir développe et surveille d5 et e4.', 9: 'Le cavalier surveille e5 et soutient d4.', 10: 'Noir prépare ...Bf5.', 11: 'Le fou vise f7 et le centre.', 12: 'Noir sort son fou avant de jouer ...e6.', 13: 'Ce fou se place entre la dame et ton roi : ton cavalier c3 n’est plus cloué.' } },
      { nom: '2...Nf6', coups: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O c4 Nb6 Nc3', resume: 'Noir ne reprend pas avec la dame : tu construis un centre fort.', notes: { 5: 'Tu prends le centre avec d4 : Noir ne peut pas l’attaquer facilement.', 11: 'Tu roques et le centre est à toi.' } },
      { nom: '3...Qd6', coups: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Nc6 Bg2', resume: 'La dame se place en d6 : tu développes avec g3 et Bg2.', notes: { 7: 'Tu prends le centre : la dame noire est un peu gênée.' } }
    ],
    plans: ['Développer vite : Nc3, Nf3, fou, roque.', 'Prendre le centre avec d4 (et c4 si possible).', 'Surveiller les menaces de la dame noire sur a5 et sur la colonne e.', 'Utiliser ton avance de développement pour attaquer avant que Noir ne rattrape.'],
    pieges: [],
    erreurs: ['Laisser la dame noire attaquer tes pions sans réagir.', 'Jouer Bd2 trop tôt sans Nf3 : tu perds un temps.', 'Oublier de prendre le centre avec d4 : tu laisses Noir respirer.', 'Roquer côté dame sans plan clair : roque petit, c’est plus simple.']
  },
  {
    id: 'philidor', nom: 'Contre la Philidor (2...d6)', co: 'blancs', debut: '1.e4 e5 2.Nf3 d6',
    re: /^Philidor/,
    idee: 'Noir défend e5 avec un pion, ce qui est solide mais passif. Tu prends le centre avec d4 et tu gardes plus d’espace et un meilleur développement. Ton seul danger : te laisser enfermer.',
    objectifs: ['Ouvrir le centre avec d4 et profiter de ton espace.', 'Développer rapidement : Nc3, fou, roque.', 'Rester vigilant face aux contre-attaques de Noir.'],
    lignes: [
      { nom: '3.d4', coups: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O c5 Nb3 Nc6', resume: 'La ligne classique : tu prends le centre et tu gardes un petit avantage d’espace.',
        notes: { 5: 'Tu prends le centre : le pion e5 noir est attaqué.', 6: 'Noir échange pour ne pas perdre un pion.', 7: 'Tu reprends avec le cavalier, qui occupe le centre.', 8: 'Noir attaque e4 en développant.', 9: 'Tu défends e4 en développant.', 10: 'Noir prépare le roque.', 11: 'Le fou défend e4 et prépare le roque.', 13: 'Tu roques : ton roi est en sûreté.' } },
      { nom: '3.d4 Nf6 4.Nc3', coups: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Qe2 c6 a4', resume: 'Noir défend avec Nf6 d’abord : plan solide, avec Bc4 et Qe2.', notes: { 5: 'Tu poses ton pion en d4 pour tenir le centre.', 11: 'Tu roques et gardes le contrôle du centre.' } }
    ],
    plans: ['Prendre le centre avec d4, puis développer Nc3, Be2/Bc4 et roquer.', 'Surveiller f7 avec le fou c4 : Noir doit le défendre.', 'Ne pas avancer trop de pions avant d’avoir roqué.', 'Contre un joueur passif, garde l’initiative.'],
    pieges: [{ titre: 'Le mat Légal', coups: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#', cond: 'Noir doit jouer ...Bg4 puis ...g6? et prendre ta dame. S’il ne le fait pas, tu n’as rien de spécial.', texte: 'Si Noir cloue ton cavalier f3 avec ...Bg4 et joue ...g6?, tu sacrifies la dame : Nxe5, puis Bxf7+ et Nd5 mate avec les pièces légères.' }],
    erreurs: ['Reprendre avec la dame en d4 : elle se fait chasser.', 'Oublier que e4 est attaqué après ...Nf6.', 'Avancer f4 trop tôt sans avoir roqué.', 'Échanger les cavaliers sans raison : ils sont utiles au centre.']
  },
  /* ------------------------------------------------------------------ NOIRS */
  {
    id: 'fr-avance', nom: 'Française : variante d’avance (3.e5)', co: 'noirs', debut: '1.e4 e6 2.d4 d5 3.e5',
    re: /^French-Defense-(Advance|Paulsen|Horwitz)/,
    idee: 'Après 3.e5, les blancs ont gagné de l’espace, mais leur chaîne de pions d4-e5 a une cible : sa base, d4. Ton plan est d’attaquer d4 avec ...c5, ...Nc6 et ...Qb6, tout en faisant sortir ton fou c8 (ta pièce « problème »).',
    objectifs: ['Attaquer la base de la chaîne de pions (d4) avec ...c5, ...Nc6 et ...Qb6.', 'Faire sortir le fou c8 (par d7 ou a6).', 'Préparer ...f6 pour casser le pion e5 quand c’est le moment.'],
    lignes: [
      { nom: '4.c3 Nc6 5.Nf3 Qb6', coups: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5 Be2 Bd7', resume: 'La ligne principale : tu mets la pression sur d4.',
        notes: { 2: 'Tu prépares ...d5 pour contester le centre.', 4: 'Tu prends ta part du centre et attaques e4.', 5: 'Les blancs avancent : ils gagnent de l’espace mais créent une chaîne dont d4 est la base.', 6: { t: 'Tu attaques la base d4 : c’est le plan principal de la Française.', alt: "Attendre avec ...Nc6 est possible, mais ...c5 est le coup de principe : il attaque tout de suite la base de la chaîne.", att: "Les blancs défendent d4 avec c3 (ou Nf3)." }, 7: 'Les blancs défendent d4 avec c3.', 8: 'Une deuxième pièce attaque d4 : la pression monte.', 9: 'Les blancs défendent d4 avec le cavalier.', 10: { t: 'La dame attaque d4 une troisième fois et vise b2.', alt: "...Bd7 ou ...cxd4 sont aussi possibles ; ...Qb6 ajoute une pression immédiate sur d4 et b2.", att: "Les blancs défendent b2 avec a3 ou changent de plan." }, 11: 'Les blancs défendent b2 avec a3.', 12: 'Tu gagnes de l’espace et tu fixes la structure : ...b5 devient ton plan.', 14: 'Le cavalier va vers a5 : il vise b3 et c4.', 16: 'Ton fou c8, la pièce difficile de la Française, sort enfin.' } },
      { nom: '4.dxc5 (prise immédiate)', coups: 'e4 e6 d4 d5 e5 c5 dxc5 Bxc5 Nf3 Ne7 Bd3 Nbc6 O-O Qc7', resume: 'Les blancs prennent en c5 : tu reprends et tu développes vite.', notes: { 7: 'Tu récupères le pion avec le fou, qui devient actif sur la diagonale g1-a7.' } }
    ],
    plans: [
      { t: "Plan 1 : attaquer la base d4", obj: "Faire céder le pion d4, base de la chaîne blanche.", coups: "...c5, ...Nc6, ...Qb6, puis ...cxd4 au bon moment.", pq: "Si d4 tombe ou s’échange, le pion e5 perd son soutien et les blancs perdent leur avantage d’espace.", cond: "Tes autres pièces sont développées avant d’échanger en d4.", ev: "Attaquer d4 sans développer le reste, surtout le fou c8." },
      { t: "Plan 2 : libérer le fou c8", obj: "Sortir ta pièce la plus gênée.", coups: "...Bd7, ou ...b6 puis ...Ba6.", pq: "Le fou c8 est bloqué derrière e6 : tant qu’il est enfermé, tu joues avec une pièce de moins.", cond: "Les pions c5 et b6 ouvrent une diagonale.", ev: "Le laisser enfermé toute la partie." },
      { t: "Plan 3 : casser e5 avec ...f6", obj: "Ouvrir le jeu pour rendre tes pièces actives.", coups: "...f6, parfois avec ...Nh6 puis ...Nf5.", pq: "Échanger le pion e5 réduit l’espace blanc et ouvre la colonne f.", cond: "Ton roi est à l’abri et tes pièces sont développées.", ev: "Jouer ...f6 trop tôt : il affaiblit la diagonale de ton roi." }
    ],
    pieges: [],
    erreurs: ['Jouer ...Qb6 trop tôt sans penser à b2.', 'Laisser le fou c8 enfermé toute la partie.', 'Laisser les blancs jouer f4 puis Nf3 sans les perturber.', 'Échanger les cavaliers à l’aveugle : ils sont tes pièces de contre-jeu.']
  },
  {
    id: 'fr-echange', nom: 'Française : variante d’échange (3.exd5)', co: 'noirs', debut: '1.e4 e6 2.d4 d5 3.exd5 exd5',
    re: /^French-Defense-Exchange/,
    idee: 'Les blancs simplifient en échangeant le pion central. La structure devient symétrique et la position est égale. Pour gagner, tu dois mieux jouer les pièces : développe activement, trouve les bonnes cases et profite des erreurs de l’adversaire.',
    objectifs: ['Développer naturellement : ...Nf6, ...Bd6, ...O-O.', 'Placer tes pièces activement et prendre de la place au centre.', 'Utiliser les colonnes ouvertes et le jeu de cavaliers pour créer des menaces.'],
    lignes: [
      { nom: '4.Nf3 Nf6 5.Bd3', coups: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4 Nbd2 Nbd7 c3 c6', resume: 'La structure classique : symétrie et développement naturel.',
        notes: { 5: 'Les blancs échangent : le centre devient symétrique.', 6: 'Tu reprends avec le pion e : ton pion d5 tient bien le centre.', 8: { t: 'Tu développes le cavalier et défends d5.', alt: "...Bd6 d’abord est possible, mais ...Nf6 protège d5 tout de suite.", att: "Les blancs sortent leur fou en d3 ou e2." }, 10: 'Le fou se place sur sa meilleure diagonale, face au roque blanc.', 12: 'Tu roques : roi à l’abri, tour prête.', 14: { t: 'Tu cloues le cavalier f3 qui défend d4 : pression sur le centre.', alt: "...Bg4 n’est pas obligatoire : tu peux aussi développer d’abord ton cavalier b8.", att: "Les blancs défendent leur cavalier avec Nbd2 ou h3." }, 16: 'Tu développes le dernier cavalier et défends tes pièces.', 18: 'Tu consolides d5 et prépares ...Qc7.' } },
      { nom: '4.Bd3 (sans Nf3)', coups: 'e4 e6 d4 d5 exd5 exd5 Bd3 Nc6 c3 Bd6 Nf3 Nge7 O-O O-O', resume: 'Noir place ses pièces calmement.', notes: { 8: 'Tu défends d5 et prépares ...Bd6.' } },
      { nom: '4.c4', coups: 'e4 e6 d4 d5 exd5 exd5 c4 Nf6 Nc3 Be7 cxd5 Nxd5 Nf3 Nc6', resume: 'Les blancs veulent un jeu plus ouvert : reste solide.', notes: { 7: 'Les blancs attaquent ton pion d5 : tu développes en le défendant.' } }
    ],
    plans: [
      { t: "Plan 1 : développement actif", obj: "Sortir toutes tes pièces sur de bonnes cases.", coups: "...Nf6, ...Bd6, ...O-O, ...Bg4, ...Nbd7 ou ...Nc6.", pq: "La structure est symétrique : celui qui est le mieux développé prend l’initiative.", cond: "Les blancs jouent lentement.", ev: "Rester passif et laisser les blancs choisir le jeu." },
      { t: "Plan 2 : clouer le cavalier avec ...Bg4", obj: "Augmenter la pression sur le centre.", coups: "...Bg4, avant ou après le roque.", pq: "Le cavalier f3 défend d4 : le clouer rend le centre blanc plus fragile.", cond: "Ton cavalier b8 a une case de développement (c6 ou d7).", ev: "Échanger sur f3 sans raison précise." },
      { t: "Plan 3 : jouer sur les colonnes ouvertes", obj: "Mettre tes tours en jeu.", coups: "...Re8, ...Qd7 ou ...Qe7, ...Rae8.", pq: "La colonne e est ouverte : une tour dessus crée des menaces sur e1/e2.", cond: "Ton roi est à l’abri et tes pièces mineures sont sorties.", ev: "Mettre les tours sur des colonnes fermées." }
    ],
    pieges: [],
    erreurs: ['Jouer trop passivement et laisser les blancs prendre l’initiative.', 'Oublier ...Bg4 : c’est le coup typique de cette structure.', 'Échanger toutes les pièces : la partie nulle ne te fait pas progresser.', 'Rater l’occasion de gagner un pion quand les blancs font une imprécision.']
  },
  {
    id: 'fr-nc3', nom: 'Française : variante 3.Nc3 (Steinitz, classique, Winawer)', co: 'noirs', debut: '1.e4 e6 2.d4 d5 3.Nc3',
    re: /^French-Defense-(Normal|Steinitz|Classical|Winawer|Rubinstein|Burn)/,
    idee: 'Avec 3.Nc3, les blancs défendent e4 en développant une pièce. Tu as deux grands choix : 3...Nf6 (le plus classique) ou 3...Bb4 (Winawer, plus tactique). Dans tous les cas, ton plan est d’attaquer d4 avec ...c5 et de contrer l’avance e5.',
    objectifs: ['Choisir 3...Nf6 pour jouer solide, ou 3...Bb4 pour un jeu plus riche.', 'Contrer l’avance e5 avec ...Nfd7 puis ...c5.', 'Attaquer la base de la chaîne (d4) et, plus tard, casser e5 avec ...f6.'],
    lignes: [
      { nom: '3...Nf6 4.e5 (Steinitz)', coups: 'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 cxd4 Nxd4 Bc5 Qd2 O-O O-O-O a6', resume: 'La ligne principale : e5 gagne de l’espace, tu contre-attaques avec ...c5.',
        notes: { 5: 'Les blancs développent et défendent e4.', 6: 'Tu développes et attaques e4.', 7: 'Les blancs poussent e5 : ils gagnent de l’espace et attaquent ton cavalier.', 8: { t: 'Ton cavalier se replie : il attaque e5 et libère f6 pour un futur ...f6.', alt: "Le cavalier doit bouger. ...Nfd7 est le coup principal : il garde un œil sur e5 et libère la case f6.", att: "Les blancs soutiennent e5 avec f4, ou échangent." }, 9: 'Les blancs soutiennent e5 avec f4 : solide, mais ils s’engagent.', 10: { t: 'Tu attaques d4, le centre de la chaîne : ton contre-jeu principal.', alt: "Un coup plus passif comme ...Be7 est possible, mais ...c5 attaque d4 tout de suite.", att: "Les blancs défendent d4 avec Nf3." }, 11: 'Il défend d4 en développant.', 12: 'Tu mets une deuxième pièce sur d4.', 14: 'Tu ouvres la position : tes pièces vont gagner de l’espace.', 16: 'Le fou c5 attaque d4 et vise g1.' } },
      { nom: '3...Nf6 4.Bg5 (classique)', coups: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5', resume: 'Les blancs clouent le cavalier : tu échanges les fous et tu attaques d4.', notes: { 7: 'Le fou cloue ton cavalier f6 : tu le défends avec ...Be7.', 16: 'Tu joues ...c5 pour attaquer la base de la chaîne.' } },
      { nom: '3...Bb4 (Winawer)', coups: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7', resume: 'Plus tactique : tu échanges ton fou contre un cavalier et tu cibles les pions blancs doublés.', notes: { 6: 'Tu cloues le cavalier c3 : il défend e4.', 12: 'Après l’échange, tu vises les pions c3 et c2. Les blancs ont la paire de fous, tu as des cibles : jeu inégal et riche.' } }
    ],
    plans: [
      { t: "Plan 1 : contre-attaquer avec ...c5", obj: "Attaquer la chaîne de pions blancs à sa base (d4).", coups: "...Nfd7 contre e5, puis ...c5 et ...Nc6.", pq: "La chaîne e5-d4 a un seul point faible, d4 : l’attaquer te donne du jeu.", cond: "Tu as développé au moins une pièce avant de lancer ...c5.", ev: "Jouer ...c5 sans développer : les blancs ouvrent alors le jeu contre ton roi." },
      { t: "Plan 2 : casser e5 avec ...f6", obj: "Réduire l’espace des blancs et ouvrir la colonne f.", coups: "...f6, après ...Nfd7 et ...Nc6.", pq: "Quand e5 s’échange, les blancs n’ont plus d’avantage d’espace et tes pièces respirent.", cond: "Tes pièces sont développées et ton roi est en sécurité.", ev: "Jouer ...f6 trop tôt, qui laisse ton roi exposé." },
      { t: "Plan 3 : la Winawer (3...Bb4)", obj: "Doubler les pions blancs et viser leurs faiblesses.", coups: "...Bb4, ...Bxc3+, ...Ne7, ...Qc7.", pq: "Après bxc3, les pions c3 et c2 sont des cibles et tu fixes la structure.", cond: "Tu connais les idées : les blancs ont la paire de fous et peuvent attaquer avec Qg4.", ev: "Se lancer dans la Winawer sans préparation : les lignes sont très tactiques." }
    ],
    pieges: [],
    erreurs: ['Oublier de défendre d5 après Nc3 : tu perds un pion.', 'Jouer ...c5 sans développer tes pièces.', 'Laisser les blancs gagner trop d’espace sans réagir.', 'Jouer la Winawer sans connaître la ligne : elle est très tactique.']
  },
  {
    id: 'fr-nf3', nom: 'Française : 2.Nf3, 2.Bc4 et 2.d3 (sorties de l’adversaire)', co: 'noirs', debut: '1.e4 e6 2.Nf3 d5',
    re: /^(French-Defense-Knight|French-Defense-Queens|French-Defense-Kings|French-Defense$)/,
    idee: 'Après 1.e4 e6, beaucoup d’adversaires jouent 2.Nf3, 2.Bc4 ou 2.d3 au lieu de 2.d4. Ton plan reste le même : tu joues ...d5 tout de suite et tu obtiens facilement une bonne position, car les blancs n’ont pas pris le centre.',
    objectifs: ['Jouer ...d5 tout de suite pour prendre le centre.', 'Développer calmement : ...Nf6, ...Bd6, ...O-O.', 'Profiter du fait que les blancs n’ont pas pris le centre.'],
    lignes: [
      { nom: '2.Nf3 d5 3.exd5', coups: 'e4 e6 Nf3 d5 exd5 exd5 d4 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4', resume: 'Tu retrouves la structure de l’échange : même plan.', notes: { 4: 'Tu contestes le centre tout de suite.', 6: 'Tu reprends avec le pion : la structure est symétrique.' } },
      { nom: '2.Nf3 d5 3.e5', coups: 'e4 e6 Nf3 d5 e5 c5 d4 Nc6 c3 Qb6 Be2 Bd7', resume: 'Tu retrouves la variante d’avance.', notes: { 6: 'Les blancs avancent : tu attaques la base de la chaîne avec ...c5.' } },
      { nom: '2.Bc4 d5', coups: 'e4 e6 Bc4 d5 exd5 exd5 Bb3 Nf6 Nf3 Bd6 O-O O-O', resume: 'Le fou se retire : tu as un beau centre et un développement facile.', notes: { 4: 'Tu prends le centre : le fou blanc est attaqué.', 7: 'Le fou se retire sur b3 : tu as gagné un temps.' } },
      { nom: '2.d3', coups: 'e4 e6 d3 d5 Nd2 Nf6 Ngf3 Be7 g3 O-O Bg2 c5', resume: 'Système d’attaque indienne : tu prends le centre et tu développes.', notes: { 4: 'Les blancs défendent e4 sans pousser d4. Tu prends tout l’espace.' } }
    ],
    plans: ['Prendre le centre avec ...d5 puis développer vite.', 'Si les blancs échangent, jouer comme dans la variante d’échange.', 'Utiliser ...c5 pour attaquer le centre blanc.', 'Roquer côté roi et placer les tours au centre.'],
    pieges: [],
    erreurs: ['Jouer trop passivement après 2.Nf3 : joue ...d5 tout de suite.', 'Laisser les blancs s’installer en e5 sans réagir.', 'Oublier de roquer : tu risques de te faire attaquer au centre.', 'Échanger sans nécessité des pièces actives.']
  },
  {
    id: 'e5-italienne', nom: 'Réponse à l’Italienne (…e5, …Nc6, …Nf6)', co: 'noirs', debut: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6',
    re: /^(Italian-Game|Giuoco)/,
    idee: 'Contre l’Italienne, tu développes naturellement : ...e5, ...Nc6, ...Nf6. Après 3.Bc4 Nf6, tu attaques le pion e4 et tu montres que tu ne laisses pas les blancs maîtriser le centre. Le point critique est 4.Ng5 : tu dois répondre 4...d5 5.exd5 Na5 (et non 5...Nxd5??).',
    objectifs: ['Développer cavaliers et fous, roquer court.', 'Répondre 4...d5 5.exd5 Na5 si les blancs jouent 4.Ng5.', 'Contester le centre avec ...d6 ou ...d5 au bon moment.'],
    lignes: [
      { nom: '4.d3 Be7', coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O c3 d6 Re1 a6 Bb3 Be6', resume: 'La ligne solide : tu développes sans risque.',
        notes: { 2: 'Tu prends le centre.', 4: 'Tu défends e5 en développant.', 6: 'Tu attaques e4 et tu développes.', 8: 'Le fou protège le roi et prépare le roque.', 9: 'Les blancs roquent.', 10: 'Tu roques aussi : le roi est en sécurité.', 12: 'Tu libères le fou c8 et soutiens e5.', 14: 'Ce pion empêche Bb5 et prépare de chasser le fou blanc.', 16: 'Ton fou est actif sur e6 : il fait face au fou blanc.' } },
      { nom: '4.Ng5 d5 5.exd5 Na5', coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4', resume: 'À connaître absolument : évite 5...Nxd5 et le Fried Liver.', notes: { 8: 'Tu contre-attaques au centre.', 10: 'La bonne réponse : le cavalier évite Nxf7 et attaque le fou.' } },
      { nom: '4.d4 exd4', coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qa5 Nxe4 Be6', resume: 'Jeu ouvert : tu as gagné un pion mais tu dois défendre avec précision.', notes: { 8: 'Tu prends le pion du centre.', 10: 'Tu prends aussi e4 : attention aux tactiques sur la colonne e.' } },
      { nom: '3...Bc5 (Giuoco)', coups: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7', resume: 'Tu retrouves le Giuoco Pianissimo.', notes: { 6: 'Tu mets ton fou sur la même diagonale que le blanc.' } }
    ],
    plans: ['Développer vite : Nf6, Be7 ou Bc5, O-O, d6.', 'Contester le centre avec ...d5 quand tu es prêt.', 'Contre Ng5, répondre ...d5 et ...Na5, jamais ...Nxd5.', 'Placer tes tours au centre et jouer ...a6, ...Ba7 pour garder ton fou.'],
    pieges: [{ titre: 'Le Fried Liver (à éviter)', coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3', texte: 'Si tu reprends en d5 avec le cavalier après 4.Ng5, les blancs sacrifient en f7 et ton roi se retrouve attaqué au centre.' }],
    erreurs: ['Reprendre en d5 avec le cavalier après Ng5.', 'Jouer ...Nxe4 trop vite sans vérifier les clouages sur la colonne e.', 'Ne pas roquer à temps : un roi central est vulnérable.', 'Oublier ...d6 : le pion e5 reste faible.']
  },
  {
    id: 'e5-dame', nom: 'Contre la dame précoce (2.Qh5)', co: 'noirs', debut: '1.e4 e5 2.Qh5',
    re: /^(Kings-Pawn-Opening|Parham|Wayward|Kings-Pawn-Game)/,
    idee: 'Les blancs sortent leur dame très tôt pour menacer e5 et f7. Si tu défends bien, la dame devient une cible et tu gagnes du temps en l’attaquant. Deux réponses sont possibles : 2...Nc6 (solide) et 2...Nf6 (que tu joues, ça marche aussi, mais la suite est plus tactique).',
    objectifs: ['Défendre e5 en développant (...Nc6).', 'Chasser la dame avec ...g6 et ...Nf6.', 'Profiter du temps que les blancs perdent avec leur dame.'],
    lignes: [
      { nom: '2...Nc6 3.Bc4 g6 4.Qf3 Nf6', coups: 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6 Ne2 Bg7 d3 d6', resume: 'La défense la plus simple : tu défends e5 et tu chasses la dame.',
        notes: { 3: 'La dame sort : elle menace e5 et prépare Bc4 pour viser f7.', 4: 'Tu défends e5 en développant une pièce.', 5: 'Le fou et la dame visent f7 ensemble : menace de mat.', 6: 'Ce coup chasse la dame et parade la menace.', 7: 'La dame se replie et garde un œil sur f7.', 8: 'Tu défends f7 et attaques e4 en développant.', 10: 'Ton fou arrive sur la grande diagonale.' } },
      { nom: '2...Nf6 3.Qxe5+ Be7', coups: 'e4 e5 Qh5 Nf6 Qxe5+ Be7 Nf3 O-O', resume: 'Tu laisses un pion pour développer vite : le jeu est équilibré, mais la dame blanche est exposée.', notes: { 4: 'Tu attaques la dame et tu développes. Le pion e5 est à prendre, mais ça te donne un développement rapide.', 6: 'Tu bloques l’échec et prépares le roque : tes pièces vont se développer avec tempo contre la dame.' } }
    ],
    plans: ['Défendre e5 avec ...Nc6.', 'Chasser la dame avec ...g6 et ...Nf6.', 'Développer tes pièces sans te précipiter.', 'Placer ton fou sur g7 après ...g6.'],
    pieges: [{ titre: 'Le mat du berger (si tu joues …Nf6 trop tôt)', coups: 'e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#', texte: 'Après 3.Bc4, jouer 3...Nf6?? permet 4.Qxf7# (mat du berger). C’est la menace que ...g6 ou ...Qe7 doit empêcher.' }],
    erreurs: ['Jouer ...Nf6?? après 3.Bc4 : mat du berger.', 'Défendre e5 par ...Qe7 : tu bloques ton fou et perds du temps.', 'Ne pas voir la menace sur f7.', 'Sortir ta dame à ton tour : elle se fait chasser.']
  }
];
