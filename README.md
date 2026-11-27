# Grenoble Bomber

- `npm start` lance le serveur sur http://localhost:3000.
- `npm test` teste `src/game/GameState.js`.

## Architecture

Deux programmes séparés qui ne se parlent que par socket.io :
le **serveur** (`src/`) applique toutes les règles, le **client** (`public/`) affiche l'état reçu et envoie les touches.

```mermaid
flowchart TB
    subgraph client["Navigateur · public/"]
        html["index.html<br/><small>page + style.css</small>"]
        main["main.js<br/><small>UI, clavier, boucle</small>"]
        render["render.js<br/><small>dessine le jeu</small>"]
        net["NetworkClient.js<br/><small>client socket.io</small>"]
        assets["assets.js<br/><small>chemins d'images</small>"]
        html --> main
        main --> render
        main --> net
        render --> assets
    end

    subgraph serveur["Serveur Node · src/"]
        index["server/index.js<br/><small>Express + socket.io</small>"]
        rooms["RoomManager.js<br/><small>salons + boucle 50 ms</small>"]
        game["game/GameState.js<br/><small>règles du jeu</small>"]
        tests["tests/<br/><small>npm test</small>"]
        index --> rooms
        rooms --> game
        tests --> game
    end

    net <-- "socket.io" --> index
```

Équipe : Tasnim ZAHOUANI, Zemiao HU, Rachel PERETTI, Gatien CAILLET, Ziyang GU.
