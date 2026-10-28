# Mes parties d'échecs

Suivi et analyse des parties chess.com (PWA). Les données viennent d'une base Supabase protégée par un code d'accès.
L'analyse tourne dans le navigateur avec Stockfish 19 (version légère, un seul fil), sans serveur.

- `docs/` : l'appli prête à servir (GitHub Pages, branche principale, dossier /docs), moteur dans `docs/engine/`
- `src/` : sources (`app.js`, `analyse.js`, `style.css`, `index.template.html`)
- Reconstruire : `npm install` puis `node build.mjs` (génère `docs/`)

## Crédits

Pièces d'échecs : jeu « standard » de Colin M.L. Burnett (Wikimedia Commons), licence CC BY-SA 3.0, via le paquet cm-chessboard. Moteur : Stockfish.js (Nathan Rugg), GPL.
