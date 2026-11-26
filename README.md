# Grenoble Bomber

- `npm start` lance le serveur sur http://localhost:3000.
- `npm test` teste `src/game/GameState.js`.

```
src/
  game/GameState.js       règles du jeu (pures, testées)
  server/index.js         serveur Express + Socket.io
  server/RoomManager.js   salons et boucle de jeu
  client/                 page du jeu servie au navigateur
    index.html, style.css
    main.js               affichage canvas
    assets.js             chemins des images
    NetworkClient.js      échanges avec le serveur
public/ressources/        images et sons
tests/gamestate/          tests de GameState
```

Équipe : Tasnim ZAHOUANI, Zemiao HU, Rachel PERETTI, Gatien CAILLET, Ziyang GU.
