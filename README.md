# Mes parties d'échecs

Suivi et analyse des parties chess.com (PWA). Les données viennent d'une base Supabase protégée par un code d'accès.
L'analyse tourne dans le navigateur avec Stockfish 19 (version légère, un seul fil), sans serveur.

- `docs/` : l'appli prête à servir (GitHub Pages, branche principale, dossier /docs), moteur dans `docs/engine/`
- `src/` : sources (`app.js`, `analyse.js`, `style.css`, `index.template.html`)
- Reconstruire : `npm install` puis `node build.mjs` (génère `docs/`)
