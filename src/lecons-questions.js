/* Questions des cartes « Comprendre ». Elles sont posées AVANT l'explication : l'échiquier est montré sans annotation, le texte de la carte
   n'apparaît qu'après la réponse. Quatre propositions plausibles ; la bonne est toujours en première position dans ce fichier et le jeu
   les mélange à l'affichage.
   `san` (facultatif) aligne chaque proposition sur un coup ; le test Stockfish vérifie alors que la bonne proposition est un bon coup et,
   en mode « meilleur », que les trois autres perdent au moins 3 points de chances de gagner (aucune ambiguïté possible).
   En mode « erreur », la première proposition est une erreur et les trois autres sont de bons coups. Mode « neutre » : seule la bonne proposition est vérifiée.
   `pos` (facultatif) : position montrée avec la question quand la carte contient déjà le coup attendu. */
const Q = (question, options, explication, san = null, mode = 'meilleur', pos = null) => ({ question, options, bonne: 0, explication, ...(san ? { san, mode } : {}), ...(pos ? { pos } : {}) });

export const QUESTIONS = {
  /* ----- Italienne : défense des deux cavaliers ----- */
  'dc-1': Q('Quel pion noir le fou c4 prend-il pour cible ?', ['f7, le pion devant le roi', 'e5, le pion central', 'd7, le pion devant la dame', 'g7, le pion devant la tour'], 'La diagonale c4-f7 est libre, et seul le roi e8 défend f7.'),
  'dc-2': Q('Quel coup règle simplement la menace de ...Cf6 sur e4 ?', ['d3, qui défend le pion e4', 'h3, qui contrôle la case g4', 'a3, qui prépare la poussée b4', 'b3, qui libère le fou c1'], 'd3 défend e4. Les autres coups ne s’en occupent pas : Noir prend le pion.', ['d3', 'h3', 'a3', 'b3']),
  'dc-3': Q('Quel coup poursuit le plan tranquille (d3, roque, développement) ?', ['Cbd2, qui finit le développement', 'g4, qui lance une attaque sur l’aile roi', 'h4, qui avance sur l’aile roi', 'b4, qui avance sur l’aile dame'], 'Cbd2 finit le développement et prépare Te1 pour soutenir e4 ; les poussées de pions d’aile ne servent à rien tant que le centre n’est pas réglé.', ['Nbd2', 'g4', 'h4', 'b4']),
  'dc-4': Q('Après 4.Cg5, que joue Noir pour se défendre au mieux ?', ['4...d5, qui attaque le fou c4', '4...Cxe4, qui prend un pion', '4...Fe7, qui se développe', '4...h6, qui chasse le cavalier'], '4...d5 contre-attaque au centre ; après 5.exd5, on répond 5...Ca5 et non 5...Cxd5.', ['d5', 'Nxe4', 'Be7', 'h6']),
  'dc-5': Q('Face à 3...h6, quel coup profite du retard de développement de Noir ?', ['d4, qui prend le centre', 'Cg5, qui attaque f7', 'h3, qui imite Noir', 'a4, qui gagne de l’espace'], '3...h6 ne développe rien : tu peux prendre le centre tout de suite.', ['d4', 'Ng5', 'h3', 'a4']),

  /* ----- Italienne : Giuoco Piano ----- */
  'gi-1': Q('Quel pion blanc le fou noir c5 attaque-t-il ?', ['f2, le pion devant le roi', 'g2, le pion devant le fou', 'b2, le pion devant le cavalier', 'e4, le pion central'], 'La diagonale c5-f2 est libre, et f2 n’est défendu que par le roi.'),
  'gi-2': Q('Quel coup défend e4 sans compliquer la position ?', ['d3, qui défend e4 calmement', 'Db3, qui vise f7 tout de suite', 'O-O, qui roque en laissant e4', 'h3, qui contrôle la case g4'], 'd3 défend e4 et ouvre le fou c1 ; d4 est l’autre bon plan, plus ouvert. Roquer tout de suite ou sortir la dame perd du temps.', ['d3', 'Qb3', 'O-O', 'h3']),
  'gi-3': Q('Quelle menace le coup h3 supprime-t-il ?', ['Le clouage du cavalier f3 par ...Fg4', 'L’échange des fous par ...Fe6', 'La poussée ...d5 au centre', 'Le coup ...b5 contre le fou'], 'h3 contrôle g4 : le fou noir ne peut plus venir clouer le cavalier f3 contre la dame.'),
  'gi-4': Q('Où va le cavalier d2 dans ce plan lent ?', ['En f1, puis g3 ou e3', 'En c4, case avancée', 'En b1, retour au départ', 'Nulle part : il défend e4'], 'Cf1 prépare Cg3 ou Ce3 : le cavalier rejoint l’aile roi sans bloquer les autres pièces.', ['Nf1', 'Nc4', 'Nb1', 'Kh1'], 'neutre'),
  'gi-5': Q('Que se passe-t-il après 6.Cxe5 dxe5 ?', ['Les Blancs ont perdu un cavalier pour un pion', 'Les Blancs ont gagné un pion', 'Les Blancs attaquent la dame noire', 'Les deux camps sont à égalité'], 'e5 est défendu deux fois (Cc6 et d6) : prendre dessus coûte un cavalier contre un pion.'),
  'gi-6': Q('Noir a déjà roqué : quel coup suit le même plan ?', ['O-O, qui met ton roi à l’abri', 'Db3, qui vise f7 tout de suite', 'g3, qui prépare Fh3', 'd4, qui ouvre le centre'], 'Mets ton roi à l’abri comme Noir, puis développe le cavalier b1. Les autres coups perdent du temps ou ouvrent le jeu trop tôt.', ['O-O', 'Qb3', 'g3', 'd4']),

  /* ----- Partie du fou ----- */
  'fou-1': Q('Pourquoi 2.Fc4 gêne-t-il Noir ?', ['Il vise f7, que seul le roi défend', 'Il menace de prendre en e5', 'Il attaque le cavalier g8', 'Il empêche le roque noir'], 'La diagonale c4-f7 est libre, et seul le roi e8 défend f7.'),
  'fou-2': Q('Comment garder le pion e4 attaqué par le cavalier ?', ['d3, qui le défend', 'f4, qui le soutient', 'h3, qui prépare g4', 'a3, qui prépare b4'], 'e4 est attaqué sans défense : d3, Cc3 ou De2 le défendent. f4 ne le défend pas et affaiblit ton roi.', ['d3', 'f4', 'h3', 'a3']),
  'fou-3': Q('Quelle pièce le coup 3.d3 libère-t-il ?', ['Le fou c1', 'Le fou c4', 'Le cavalier g1', 'La tour a1'], 'Le pion quitte d2 : la diagonale du fou c1 vers h6 est ouverte.'),
  'fou-4': Q('Comment sauver le fou c4 en gardant sa diagonale ?', ['Fb3, sur la même diagonale', 'Fb5, devant le pion c6', 'Fa6, devant le pion b7', 'Fxd5, en prenant le pion'], 'b5 et a6 sont attaquées par les pions c6 et b7 ; Fxd5 perd le fou contre un pion. Fb3 est sûr et garde la diagonale.', ['Bb3', 'Bb5', 'Ba6', 'Bxd5']),
  'fou-5': Q('Quel coup de pion c3 prépare-t-il pour prendre le centre ?', ['d4, avec le pion d3', 'b4, avec le pion b2', 'f4, avec le pion f2', 'g4, avec le pion g2'], 'c3 soutient d4 : le pion d3 peut avancer au centre. Ce n’est pas urgent : Fb3 et Cbd2 sont aussi précis.'),
  'fou-6': Q('Pourquoi 3.f4? est-il une erreur ?', ['Il ne défend pas e4 et affaiblit le roi', 'Il laisse le pion f4 sans aucune défense possible', 'Il bloque le fou c1 sur sa diagonale', 'Il expose la dame à ...Cf6'], 'Le pion f4 ne défend pas e4 (Noir le prend ou contre-attaque en d5) et il ouvre la diagonale e1-h4.'),

  /* ----- Contre la Caro-Kann ----- */
  'ca-1': Q('Que menace le pion d5 de Noir ?', ['De prendre le pion e4', 'De prendre le pion d4', 'D’avancer en d4', 'De prendre en c4'], 'Le pion d5 attaque e4, qui n’est pas défendu.'),
  'ca-2': Q('Que doit faire le cavalier e4 attaqué par le fou f5 ?', ['Aller en g3 et attaquer le fou', 'Rester en e4 : rien ne l’attaque', 'Prendre en f6 avec échec', 'Aller en d6 avec échec'], 'Le cavalier n’est pas défendu : Cg3 le sauve et attaque f5.'),
  'ca-3': Q('Quel coup de pion fait reculer le fou g6 ?', ['h5, qui l’attaque', 'g4, qui le menace de loin', 'c4, qui ouvre la colonne', 'd5, qui avance au centre'], 'h4-h5 attaque le fou g6 : il devra se retirer en h7.'),
  'ca-4': Q('Quelle pièce reste en prise après 5.Cf3 ou 5.h4 ?', ['Le cavalier e4', 'Le fou c1', 'La dame d1', 'Le pion d4'], 'Le fou f5 attaque e4 : sans défense, le cavalier est perdu (...Fxe4).'),
  'ca-5': Q('Après l’échange en d5, quelle pièce reste à développer côté dame ?', ['Le fou c1, vers f4', 'Le cavalier b1, vers a3', 'La tour h1, vers e1', 'La dame d1, vers b3'], 'La diagonale c1-f4 est libre : le fou c1 sort avant que c3 la ferme.'),

  /* ----- Contre la Scandinave ----- */
  'sc-1': Q('Quel coup développe une pièce en attaquant la dame ?', ['Cc3', 'Cf3', 'Fb5+', 'd4'], 'Cc3 attaque la dame d5 en développant un cavalier : tu gagnes un temps.'),
  'sc-2': Q('Après ...Da5, quel coup prend le centre ?', ['d4, qui prend le centre', 'Df3, qui sort aussitôt la dame', 'Fb5+, qui donne un échec', 'Fd3, qui sort le fou'], 'd4 est le meilleur coup : le cavalier sera cloué contre ton roi, mais tu continues à te développer.', ['d4', 'Qf3', 'Bb5+', 'Bd3']),
  'sc-3': Q('Quel est ton atout dans cette position ?', ['Une avance de développement', 'Un pion de plus', 'La paire de fous', 'Un roi déjà à l’abri'], 'Tu as sorti deux cavaliers ; Noir un seul (et sa dame). Continue avant qu’il ne rattrape son retard.'),
  'sc-4': Q('Que vaut 4.Df3 ?', ['Une erreur : elle gaspille ton avance', 'Un bon coup : il gagne du temps précieux', 'Un coup forcé contre la menace ...Dxc3', 'Un coup égal aux autres'], 'Df3 sort la dame sans développer : après ...Cc6 elle doit encore bouger (Dd5) et tu perds ton avance.', ['Qf3', 'Nf3', 'Bc4', 'a3'], 'erreur'),
  'sc-5': Q('Contre 2...Cf6, quel coup prend le centre ?', ['d4, avec le pion d', 'h3, avec le pion h', 'a3, avec le pion a', 'g3, avec le pion g'], 'd4 occupe le centre : après ...Cxd5 Noir a regagné son pion, mais tu as plus d’espace.', ['d4', 'h3', 'a3', 'g3']),

  /* ----- Contre la Philidor ----- */
  'ph-1': Q('Que fait le pion d6 pour Noir ?', ['Il défend e5 mais gêne son fou f8', 'Il attaque le cavalier f3', 'Il prépare le grand roque', 'Il ouvre la diagonale de la dame'], 'Le pion d6 défend e5, mais enferme le fou f8 : Noir manque d’espace.'),
  'ph-2': Q('Quel coup défend e4 en développant une pièce ?', ['Cc3', 'Fe3', 'Cb5', 'h3'], 'Cc3 défend e4 en développant. Fe3 et h3 ne le défendent pas.', ['Nc3', 'Be3', 'Nb5', 'h3'], 'neutre', 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6'),
  'ph-3': Q('Que faire quand ...c5 attaque ton cavalier d4 ?', ['Le retirer, par exemple en b3', 'L’abandonner contre un pion', 'Pousser f4 pour le soutenir', 'Échanger les dames en d2'], 'Un cavalier attaqué par un pion doit bouger : Cb3 ou Cf5 le gardent en jeu.'),
  'ph-4': Q('Pourquoi 5.h3 ou 5.g3 sont-ils des erreurs ?', ['Ils laissent e4 sans défense', 'Ils exposent le roi blanc', 'Ils bloquent la dame', 'Ils perdent le cavalier d4'], 'Le cavalier f6 attaque e4 : ni h3 ni g3 ne le défendent, Noir prend le pion.'),
  'ph-5': Q('Quel coup surprenant lance le piège du mat Légal ?', ['Cxe5, qui offre la dame', 'Fxf7+, qui sacrifie le fou', 'Cd5, qui menace c7', 'h3, qui attaque le fou g4'], 'Cxe5! : si ...Fxd1, Fxf7+ Re7 Cd5 est mat. Un piège qui ne marche que si Noir tombe dedans.'),
  'ph-6': Q('Quel coup gagne un pion ici ?', ['dxe5, suivi de l’échange des dames', 'Fc4, qui vise f7', 'h3, en attendant', 'Fe2, qui se développe'], 'dxe5 dxe5 Dxd8+ Fxd8 Cxe5 : le pion e5 tombe, car Noir ne peut pas le défendre.'),

  /* ----- Française : variante d'avance ----- */
  'av-1': Q('Quelle est la base de la chaîne de pions blancs ?', ['Le pion d4', 'Le pion e5', 'Le pion c2', 'Le pion f2'], 'Le pion d4 soutient e5 : en l’attaquant, tu menaces toute la chaîne.'),
  'av-2': Q('Combien de pièces ou pions noirs attaquent d4 ?', ['Deux : le pion c5 et Cc6', 'Trois, avec la dame en b6', 'Un seul : le pion c5', 'Aucun : d4 est protégé'], 'Deux : c5 et Cc6. La dame en b6 ne vise pas d4 (le pion c5 gêne sa diagonale) : elle attaque b2.'),
  'av-3': Q('Quelle pièce noire est la plus gênée par sa propre structure ?', ['Le fou c8', 'Le fou f8', 'Le cavalier g8', 'La tour h8'], 'Les pions b7 et e6 bloquent le fou c8, qui n’a presque aucune case.'),
  'av-4': Q('Que se passe-t-il après ...Cxd4 ?', ['Noir perd du matériel : d4 est trop défendu', 'Noir gagne un pion proprement et sans risque', 'Noir attaque la dame blanche en passant', 'Noir ouvre la colonne c sans aucun risque'], 'd4 est défendu trois fois et attaqué deux : ...Cxd4 cxd4 cxd4 Cxd4 coûte un cavalier et un pion pour deux pions.'),
  'av-5': Q('Que joue Noir après 4.dxc5 ?', ['...Fxc5, qui reprend et se développe', '...f6, qui attaque e5', '...Dd7, qui se développe', '...Ch6, qui vise f5'], '...Fxc5 reprend le pion et sort le fou vers f2.', ['Bxc5', 'f6', 'Qd7', 'Nh6']),

  /* ----- Française : variante d'échange ----- */
  'ex-1': Q('Quelle caractéristique a cette structure ?', ['Elle est symétrique, colonne e ouverte', 'Elle est fermée, sans colonne ouverte', 'Elle donne un pion de plus aux Blancs', 'Elle bloque les deux fous noirs'], 'Plus aucun pion e : les tours pourront s’y placer, des deux côtés.'),
  'ex-2': Q('Quel coup cloue le cavalier f3 contre la dame ?', ['...Fg4', '...Fe6', '...Fd7', '...Fa6'], 'Fg4 attaque Cf3, qui défend d4 et se trouve devant la dame : il est cloué.', null, 'meilleur', 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5'),
  'ex-3': Q('Quelle pièce noire reste à développer ?', ['Le cavalier b8', 'Le fou c8', 'Le cavalier f6', 'Le fou d6'], 'Cb8 n’a pas bougé : ...Cbd7 achève le développement.'),
  'ex-4': Q('Pourquoi ...b5 est-il une erreur ?', ['Fd3 attaque b5, qui n’est pas défendu', 'Le pion b5 enferme la dame et le fou c8', 'Il affaiblit le roque noir', 'Il ouvre la colonne b aux tours'], 'La diagonale d3-b5 est libre : Fxb5+ gagne le pion avec échec.'),
  'ex-5': Q('Quel coup défend d5 en développant une pièce ?', ['...Cf6', '...a6', '...h6', '...Dh4'], 'Cc3 attaque d5, que seule la dame défend : ...Cf6 ajoute un défenseur et prépare le roque.', ['Nf6', 'a6', 'h6', 'Qh4'], 'neutre'),

  /* ----- Française : 3.Cc3 ----- */
  'nc-1': Q('Quel coup répond simplement à la tension sur d5 ?', ['...Cf6, qui défend d5', '...De7, qui défend e6', '...c5, qui attaque d4', '...b6, qui prépare Fb7'], '...Cf6 défend d5 en développant ; ...dxe4 est l’autre bon choix. Les autres coups laissent d5 sous pression.', ['Nf6', 'Qe7', 'c5', 'b6']),
  'nc-2': Q('Quelle rupture attaque la base de la chaîne blanche ?', ['...c5, contre d4', '...f6, contre e5', '...b5, contre c3', '...h6, contre g5'], '...c5 attaque d4, la base de la chaîne d4-e5 : sans d4, e5 tombe.'),
  'nc-3': Q('Quel est le but de ...cxd4 ici ?', ['Ouvrir le jeu et libérer tes pièces', 'Gagner un pion de plus', 'Doubler les pions blancs ensuite', 'Préparer un mat rapide sur h7 avec la dame'], 'Échanger en d4 supprime la base de la chaîne blanche et libère tes pièces.'),
  'nc-4': Q('Que vaut 3...c5 ?', ['Une erreur : 4.exd5 exd5 5.Fb5+ puis dxc5', 'Un bon coup : il attaque d4 tout de suite', 'Un coup d’attente sans conséquence', 'Un gambit correct pour un pion'], 'd5 est bien défendu (e6 et Dd8) ; le problème est ailleurs : après 4.exd5 exd5 5.Fb5+ Cc6 6.dxc5 les Blancs ont gagné un pion.', ['c5', 'Nf6', 'dxe4', 'Be7'], 'erreur'),
  'nc-5': Q('Quel coup contre-attaque d4 en gardant le clouage ?', ['...c5', '...Fxc3+', '...Ce7', '...Dd7'], 'Dans la Winawer, ...c5 attaque la base de la chaîne et garde le cavalier c3 cloué.'),

  /* ----- Française : 2.Cf3 ----- */
  'nf-1': Q('Quel coup attaque le pion e4 tout de suite ?', ['...d5', '...c5', '...b6', '...a6'], 'Les Blancs n’ont pas pris le centre : ...d5 attaque e4.', null, 'meilleur', 'e4 e6 Nf3'),
  'nf-2': Q('Quelle variante retrouves-tu après 3.exd5 exd5 4.d4 ?', ['La variante d’échange', 'La variante d’avance', 'La variante Winawer', 'La variante Tarrasch (3.Cd2)'], 'La position est identique à celle de la variante d’échange, par un autre ordre de coups.'),
  'nf-3': Q('Quelle pièce renforce la pression sur le centre blanc ?', ['La dame, en b6', 'Le fou, en e7', 'La tour, en b8', 'Le roi, en e7'], '...Db6 attaque b2 et appuiera la pression sur d4 dès que ...cxd4 aura libéré la diagonale.'),
  'nf-4': Q('Pourquoi 2...e5 est-il une faute ?', ['Le pion e5 est attaqué sans défense', 'Il bloque le fou f8 et la dame', 'Il laisse le roi en échec sur la colonne e', 'Il perd la dame aussitôt'], 'Cf3 attaque e5 : aucune pièce noire ne le défend.'),
  'nf-5': Q('Après 3.d3, quel coup garde un jeu simple ?', ['...dxe4, qui change la structure', '...h5, qui attaque l’aile roi', '...b5, qui gagne de l’espace', '...a5, qui bloque l’aile dame'], 'Les Blancs défendent e4 sans prendre le centre : ...dxe4 ou ...c5 te laissent un jeu simple.', ['dxe4', 'h5', 'b5', 'a5']),

  /* ----- Réponse à l'Italienne ----- */
  'it-1': Q('Que fait 3...Cf6 pour Noir ?', ['Il attaque e4 et conteste le centre', 'Il défend seulement e5', 'Il prépare le grand roque', 'Il attaque le fou c4'], '3...Cf6 attaque e4 : tu développes sans passivité.'),
  'it-2': Q('Quel développement du fou est cohérent après 4.d3 ?', ['...Fe7 ou ...Fc5', '...Fa3, qui sacrifie le fou', '...h5, qui attaque l’aile roi', '...g5, qui avance les pions'], 'Les deux premiers coups du fou f8 préparent le roque ; les poussées de pions d’aile ne règlent pas le centre.', ['Be7', 'Ba3', 'h5', 'g5']),
  'it-3': Q('Quel coup met ton roi à l’abri ?', ['...O-O', '...Tg8', '...Rd7', '...Rf8'], 'Tes pièces sont sorties : roque. Ton roi quitte le centre.'),
  'it-4': Q('Quelle reprise évite le Fried Liver après 5.exd5 ?', ['...Ca5, qui chasse le fou', '...Cxd5, qui reprend le pion', '...Cb4, qui menace c2', '...Fd6, qui développe'], '...Cxd5? rouvre la diagonale c4-f7 : Cxf7. ...Ca5 chasse le fou et neutralise l’attaque.', ['Na5', 'Nxd5', 'Nb4', 'Bd6']),
  'it-5': Q('Que joues-tu contre 4.d4 ?', ['...exd4, qui prend le pion', '...Fe7, qui se développe', '...d6, qui défend e5', '...h6, qui prépare ...Cxe4'], '...exd4 prend le pion central ; après 5.O-O Cxe4 6.Te1 d5, la position reste équilibrée.', ['exd4', 'Be7', 'd6', 'h6']),

  /* ----- Contre la dame précoce ----- */
  'dm-1': Q('Quels pions noirs la dame h5 attaque-t-elle ?', ['e5, f7 et h7', 'e5 et f7 seulement', 'f7 et g7 seulement', 'e5 et g7'], 'La dame h5 vise e5, f7 (diagonale h5-f7) et h7 (colonne h).'),
  'dm-2': Q('Que fait ...Cc6 pour Noir ?', ['Il défend e5 en développant', 'Il attaque la dame par le côté', 'Il menace ...Cb4 contre le fou', 'Il bloque le fou f8 en e7'], 'Cc6 défend e5 et développe une pièce : la dame blanche devient une cible.'),
  'dm-3': Q('Quel est le plan de développement de Noir ?', ['...Fg7, ...d6 puis roque', '...h5, puis ...g5', '...Db6 pour attaquer f2', '...a5, puis ...a4'], 'Après ...g6 et ...Cf6, ...Fg7 et ...d6 terminent un développement simple.'),
  'dm-4': Q('Que se passe-t-il après 3...Cf6 ?', ['4.Dxf7 est mat', '4.Dxf7+ et Noir se défend', '4.Fxf7+ gagne la dame', 'Rien : f7 est défendu'], 'La dame et le fou visent f7 : 4.Dxf7 est échec et mat.'),
  'dm-5': Q('Pourquoi 2...Cf6 est-il jouable ?', ['Après Dxe5+ Fe7, la dame est exposée', 'Parce que Noir menace un mat rapide en deux coups', 'Parce que la dame blanche ne peut pas prendre e5', 'Parce que le pion e5 est défendu par la dame'], '2...Cf6 attaque la dame ; après 3.Dxe5+ Fe7, Stockfish juge la position équilibrée. 3...De7? serait plus faible.'),

  /* ----- 1...d5 ----- */
  'd4d5-1': Q('Quelles cases le pion d5 contrôle-t-il ?', ['c4 et e4', 'c6 et e6', 'd4 et d6', 'b4 et f4'], 'Un pion noir attaque les deux cases diagonales devant lui : c4 et e4.'),
  'd4d5-2': Q('Quel coup défend d5 et ouvre la diagonale du fou f8 ?', ['...e6', '...c6', '...Cf6', '...dxc4'], '...e6 défend d5 et libère le fou f8 ; ...c6 le défend aussi, sans ouvrir le fou.', null, 'meilleur', 'd4 d5 c4'),
  'd4d5-3': Q('Que faire face au clouage du cavalier f6 par le fou g5 ?', ['...Fe7, qui défend et prépare le roque', '...g6, qui prépare le fianchetto du fou f8', '...a6, qui gagne du temps', '...h5, qui attaque le fou'], '...Fe7 défend le cavalier f6 ; il ne reste plus qu’à roquer.', ['Be7', 'g6', 'a6', 'h5']),
  'd4d5-4': Q('Quel est le but de ...c5 ?', ['Attaquer le centre blanc', 'Défendre le pion d5', 'Préparer le roque', 'Gagner le fou d3'], 'Le pion c5 attaque d4 : tu contestes le centre au lieu de rester passif.'),
  'd4d5-5': Q('Que propose le fou d6 contre le fou f4 ?', ['L’échange des fous', 'La prise du pion h2', 'L’attaque de la dame', 'Le roque immédiat'], 'La diagonale d6-f4 est libre : le fou d6 attaque f4 ; h2 est protégé par la présence du fou f4.'),
  'd4d5-6': Q('Après 2.c4, quel coup est une erreur ?', ['2...f5, qui ignore l’attaque', '2...e6, qui défend d5', '2...c6, qui défend d5', '2...dxc4, qui prend le pion en c4'], '2.c4 attaque d5 : tu peux le défendre (...e6, ...c6) ou le prendre (...dxc4). 2...f5? ignore la menace.', ['f5', 'e6', 'c6', 'dxc4'], 'erreur')
};
