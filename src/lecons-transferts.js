/* Exercices de transfert : une position que la fiche ne contient pas, où la même idée s'applique après un écart (réponse adverse, structure,
   échange, pièce déplacée, plan).
   - `attendus` : coups qui illustrent le principe (vérifiés : ce sont de bons coups) ; ils servent à l'évaluation.
   - `objectif` : ce que le coup doit accomplir pour valider le principe (voir objectifAtteint). Un coup que Stockfish juge très bon ou
     équivalent ET qui atteint l'objectif est une réussite ; un coup correct hors objectif est une réponse partielle ; une erreur est un échec.
   Le contexte décrit la différence sans donner la réponse. */
const O = (...alts) => alts;
const pion = (...vers) => ({ t: 'pion', vers });
const prend = sq => (sq ? { t: 'prend', sq } : { t: 'prend' });
const piece = (p, vers, de) => ({ t: 'piece', p, ...(vers ? { vers } : {}), ...(de ? { de } : {}) });
const T = (id, ecart, coups, cote, contexte, attendus, objectif, principe) => ({ id, ecart, coups, cote, contexte, attendus, objectif, principe });
const IT = 'e4 e5 Nf3 Nc6 Bc4';

export const TRANSFERTS = {
  'deux-cavaliers': [
    T('dc-t1', 'reponse', IT + ' Nf6 d3 Be7 O-O d5', 'w', 'Noir ouvre le centre avec ...d5.', ['exd5'], O([prend('d5')]),
      'Quand l’adversaire ouvre le centre, reprends d’abord avec un pion : exd5. Après ...Cxd5, Te1 occupe la colonne e. Fxd5? donnerait ton fou.'),
    T('dc-t2', 'piece', IT + ' Nf6 d3 Na5', 'w', 'Le cavalier noir a quitté c6 pour attaquer ton fou.', ['Nxe5'], O([prend('e5')]),
      'Le cavalier c6 défendait e5 : en partant, il l’a laissé sans défenseur. Cxe5 est nettement le meilleur coup (les autres perdent au moins 8 points de chances de gagner) ; si Noir prend ton fou, tu reprends avec le cavalier.')
  ],
  giuoco: [
    T('gi-t1', 'structure', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nge7', 'w', 'Noir a développé son cavalier en e7 au lieu de f6.', ['O-O', 'd4'], O([{ t: 'roque' }], [pion('d4')]),
      'Le cavalier e7 n’attaque pas e4 : d3 n’est plus nécessaire. Tu peux roquer, ou prendre le centre tout de suite avec d4.'),
    T('gi-t2', 'plan', IT + ' Bc5 c3 Nf6 d3 d6 O-O a6', 'w', 'Noir joue ...a6.', ['Bb3', 'Re1', 'Nbd2'], O([piece('b', ['b3'])], [piece('r', ['e1'])], [piece('n', ['d2'])]),
      '...a6 prépare ...b5 contre ton fou. Retire-le en b3, ou continue ton plan (Te1, Cbd2) : une menace lointaine ne justifie pas de changer ta structure.')
  ],
  fou: [
    T('fou-t1', 'reponse', 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 d5', 'w', 'Noir frappe au centre avec ...d5.', ['exd5'], O([prend('d5')]),
      'Reprends d’abord avec le pion : exd5. Si Noir reprend avec le cavalier, ton fou c4 reste bien placé et tu peux roquer. Fb3 est moins précis.'),
    T('fou-t2', 'plan', 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Ng4', 'w', 'Le cavalier noir vise f2 et h2.', ['h3'], O([pion('h3')]),
      'Pose la question au cavalier avec h3 : il devra reculer ou s’échanger, et ton roque reste sûr. Les autres coups laissent au cavalier le temps de gêner ton jeu.'),
    T('fou-t3', 'piece', 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Nd4', 'w', 'Le cavalier noir vient en d4 et attaque ton cavalier f3.', ['Nxe5', 'Nxd4'], O([prend('e5')], [prend('d4')]),
      'Tu peux échanger le cavalier gênant avec Cxd4 exd4, ou profiter de e5 qu’il ne défend plus (Cxe5). Les coups de développement tranquilles perdent du terrain.')
  ],
  caro: [
    T('ca-t1', 'structure', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Ne7', 'w', 'Noir développe son cavalier en e7.', ['c3', 'O-O'], O([pion('c3')], [{ t: 'roque' }]),
      'Ton centre d4-e5 est solide et Noir n’a pas encore attaqué d4 : soutiens-le avec c3 ou mets ton roi à l’abri. Les autres développements sont moins précis (Stockfish).'),
    T('ca-t2', 'reponse', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7', 'w', 'Noir n’attaque pas d4 avec ...c5.', ['O-O', 'Nbd2', 'c3'], O([{ t: 'roque' }], [piece('n', ['d2'])], [pion('c3')]),
      'Roque ou finis ton développement : tu gardes c3 pour soutenir d4 si ...c5 arrive.')
  ],
  scandinave: [
    T('sc-t1', 'reponse', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 c6 Nf3 Bg4', 'w', 'Le fou noir cloue ton cavalier f3 contre la dame.', ['h3', 'Bd2', 'Bc4'], O([pion('h3')], [{ t: 'devel' }]),
      'Le clouage ne t’empêche pas de te développer : demande au fou ce qu’il veut (h3) ou sors tes fous (Fd2, Fc4, Fd3).'),
    T('sc-t2', 'echange', 'e4 d5 exd5 Nf6 d4 Nxd5 c4 Nb6', 'w', 'Noir recule son cavalier en b6.', ['Nf3'], O([{ t: 'devel' }]),
      'Développe une pièce (Cf3 est le plus simple) : tu gardes c4 et d4 pour ton centre sans compliquer.')
  ],
  philidor: [
    T('ph-t1', 'reponse', 'e4 e5 Nf3 d6 d4 Bg4', 'w', 'Noir cloue ton cavalier avant de développer ses autres pièces.', ['Be3', 'dxe5', 'Nc3'], O([prend('e5')], [{ t: 'devel' }]),
      'Ne te laisse pas impressionner par le clouage : prends en e5 pour clarifier le centre, ou continue ton développement (Fe3, Cc3).'),
    T('ph-t2', 'piece', 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 g6', 'w', 'Noir fianchette son fou : ...g6.', ['Qe2', 'Be3'], O([piece('q', ['e2'])], [piece('b', ['e3'])]),
      'Qe2 ou Fe3 : développe en gardant e4 défendu, sans te précipiter vers l’attaque.')
  ],
  'fr-avance': [
    T('av-t1', 'ordre', 'e4 e6 d4 d5 e5 c5 Nf3', 'b', 'Les Blancs jouent Cf3 au lieu de c3.', ['cxd4'], O([prend('d4')]),
      'Ton pion c5 peut prendre en d4 : si les Blancs reprennent, ...Cc6 attaque la pièce qui a repris. Ne laisse pas les Blancs jouer c3 pour soutenir leur centre.'),
    T('av-t2', 'echange', 'e4 e6 d4 d5 e5 c5 c3 Nc6 Bd3', 'b', 'Les Blancs jouent Fd3 au lieu de Cf3.', ['cxd4'], O([prend('d4')]),
      '...cxd4 est le meilleur coup d’après Stockfish : les autres perdent plus de 3 points de chances de gagner. Prendre en d4 reste ton idée centrale tant que la pression sur ce pion est possible.')
  ],
  'fr-echange': [
    T('ex-t1', 'reponse', 'e4 e6 d4 d5 exd5 exd5 Bd3 Bd6 Qh5', 'b', 'La dame blanche attaque ton pion d5.', ['Nf6', 'Be6', 'Nc6'], O([piece('n', ['f6', 'c6'])], [piece('b', ['e6'])]),
      'Développe sans te presser : ...Cf6 chasse la dame et défend d5, ...Fe6 défend d5 aussi, et ...Cc6 est également bon (Stockfish). La dame blanche seule ne menace rien.'),
    T('ex-t2', 'piece', 'e4 e6 d4 d5 exd5 exd5 Qe2+', 'b', 'La dame blanche donne échec.', ['Be7'], O([piece('b', ['e7'])]),
      'Pare l’échec avec une pièce qui se développe : ...Fe7. Les autres parades perdent du temps ou affaiblissent ton roi.')
  ],
  'fr-nc3': [
    T('nc-t1', 'reponse', 'e4 e6 d4 d5 Nc3 Nf6 Bd3', 'b', 'Fd3 au lieu de e5 : le centre n’est pas fermé.', ['c5'], O([pion('c5')]),
      'Attaque le centre tout de suite avec ...c5 : le Fd3 ne t’empêche pas de contester d4.'),
    T('nc-t2', 'plan', 'e4 e6 d4 d5 Nc3 Bb4 Bd2', 'b', 'Fd2 défend le cavalier c3 : le clouage ne gêne plus les Blancs.', ['dxe4', 'Bxc3'], O([prend()]),
      'Échange en e4 ou prends en c3 : tu simplifies sans te laisser enfermer.')
  ],
  'fr-nf3': [
    T('nf-t1', 'reponse', 'e4 e6 Nf3 d5 Nc3', 'b', 'Cc3 défend e4 et attaque d5.', ['d4', 'Nf6'], O([pion('d4')], [piece('n', ['f6'])]),
      'Chasse le cavalier avec ...d4 ou défends d5 en te développant avec ...Cf6.'),
    T('nf-t2', 'structure', 'e4 e6 Nf3 d5 e5 c5 b3', 'b', 'Les Blancs ne prennent pas le centre avec d4.', ['Nc6'], O([piece('n', ['c6'])]),
      'Continue à presser le centre : ...Cc6 attaque d4 avant que les Blancs ne l’occupent, et prépare ...Db6.')
  ],
  'e5-italienne': [
    T('it-t1', 'reponse', IT + ' Nf6 Nc3', 'b', 'Cc3 défend e4 par un cavalier.', ['Nxe4', 'Bc5'], O([prend('e4')], [piece('b', ['c5'])]),
      '...Cxe4 est possible ici ; ...Fc5 est aussi correct. Le plan reste de contester le centre.'),
    T('it-t2', 'reponse', IT + ' Nf6 Ng5 d5 exd5 Na5 Bb3', 'b', 'Les Blancs retirent leur fou en b3 au lieu de donner échec.', ['Nxb3', 'h6'], O([prend('b3')], [pion('h6')]),
      'Échange la pièce qui menaçait f7 (...Cxb3), ou chasse le cavalier g5 avec ...h6 : dans les deux cas tu réduis la pression sur ton roque.')
  ],
  'e5-dame': [
    T('dm-t1', 'reponse', 'e4 e5 Qh5 Nc6 Nc3', 'b', 'Cc3 au lieu de Fc4 : pas de menace de mat.', ['Nf6'], O([piece('n', ['f6'])]),
      'Attaque la dame avec ...Cf6 : tu développes une pièce en gagnant un temps.'),
    T('dm-t2', 'reponse', 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6 d3', 'b', 'Les Blancs défendent e4 avec d3.', ['Nd4'], O([piece('n', ['d4'])]),
      '...Cd4 attaque la dame f3 : tu gagnes du temps et tu centralises ton cavalier.')
  ],
  'd4-d5': [
    T('d4d5-t1', 'echange', 'd4 d5 c4 e6 Nc3 Nf6 cxd5', 'b', 'Les Blancs prennent en d5.', ['exd5', 'Nxd5'], O([prend('d5')]),
      'Reprends au centre : ...exd5 ouvre la diagonale du fou f8 et garde ton centre ; ...Cxd5 est possible aussi. Ignorer la prise perd du terrain.'),
    T('d4d5-t2', 'structure', 'd4 d5 Bg5', 'b', 'Le fou blanc sort en g5 dès le deuxième coup.', ['c5', 'Nc6', 'h6'], O([pion('c5')], [piece('n', ['c6'])], [pion('h6')]),
      'Attaque le centre avec ...c5 ou pose la question au fou (...h6) : ne laisse pas une sortie précoce te faire oublier ton plan.'),
    T('d4d5-t3', 'plan', 'd4 d5 Nf3 Nf6 Bg5', 'b', 'Le fou blanc sort en g5 et clouera ton cavalier.', ['c5', 'h6', 'Ne4'], O([pion('c5')], [pion('h6')], [piece('n', ['e4'])]),
      'Contre-attaque au centre avec ...c5, ou pose la question au fou avec ...h6 : ne laisse pas le clouage gêner ton développement.')
  ]
};
