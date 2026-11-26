# Grenoble Bomber

Jeu multijoueur inspiré de Bomberman (jusqu'à 4 joueurs), développé en Node.js, Express, Socket.io et MongoDB.

## Prérequis

- **Node.js** (v20+ recommandé, ES Modules activés)
- **MongoDB Community Server** installé et lancé en arrière-plan *(optionnel pour tester uniquement le front-end : le serveur démarre même si MongoDB est éteint)*

## Installation et lancement

```bash
npm install
node src/server.js
#Avec MongoDB Atlas (.env)
node --env-file=.env src/server.js
```
Le serveur est accessible sur http://localhost:3000. (API des scores : http://localhost:3000/api/scores).

### Tests automatisés
Les tests utilisent le lanceur intégré de Node (node --test) et s'exécutent automatiquement via GitHub Actions à chaque Pull Request :

```bash
npm test
```

### Équipe : 
Pôle 1 (UI/UX & Assets) Ziyang GU,
Pôle 2 (Rendu Canvas & Contrôles) Zemiao HU,
Pôle 3 (Moteur de jeu & Tests) Gatien CAILLET,
Pôle 4 (Base de données & API) Tasnim ZAHOUANI,
Pôle 5 (Serveur & Socket.io) Rachel PERETTI