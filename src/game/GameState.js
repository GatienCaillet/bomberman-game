// Ce fichier décrit l'état du jeu et les règles de base appliquées côté
// serveur. Le serveur reste la source de vérité pour tous les clients.

// ---------------------------------------------------------------------------
// Configuration et modèles de données
// ---------------------------------------------------------------------------
//
// Configuration utilisée quand aucune valeur personnalisée n'est fournie.
// Elle est gelée pour éviter une modification accidentelle de ces valeurs
// partagées.
const DEFAULT_CONFIG = Object.freeze({
  width: 13, // largeur de la grille
  height: 11, // hauteur de la grille
  maxPlayers: 4, // nombre maximum de joueurs
  maxRounds: 3, // nombre de manches
  bombFuseMs: 2500, // durée de vie d'une bombe avant explosion
  flameDurationMs: 500, // durée de vie des flammes après explosion
  moveIntervalMs: 140, // intervalle de temps entre deux déplacements d'un joueur
  brickChance: 0.7, // probabilité qu'une case vide soit remplie par une brique
  scorePerPlace: [5, 3, 2, 1], // points attribués selon l'ordre d'arrivée dans la manche
});

// Modèle utilisé pour créer un nouveau joueur. Les propriétés regroupent sa
// position, son état de vie, ses actions récentes et ses caractéristiques.
const DEFAULT_PLAYER_STATE = Object.freeze({
  x: 0,
  y: 0,
  direction: null,
  alive: true,
  input: null,
  lastMove: 0,
  lastBombAt: 0,
  bombsPlaced: 0,
  score: 0,
  nickname: "",

  // Les statistiques évoluent pendant la partie, notamment grâce aux objets
  // et augmentations ramassés par le joueur.
  stats: Object.freeze({
    health: 1,
    maxHealth: 1,
    speed: 1,
    maxBombs: 1,
    bombRadius: 2,
    damage: 1,
    luck: 0.2,
    bombCooldown: 800,
    items: [],
    augmentations: [],
  }),
});

// Positions de départ des joueurs. Une coordonnée négative est calculée
// depuis le bord opposé de la carte (par exemple -2 signifie avant-dernière
// position utile).
const SPAWNS = [
  { x: 1, y: 1 },
  { x: -2, y: 1 },
  { x: 1, y: -2 },
  { x: -2, y: -2 },
];

// Touches et noms de direction acceptés par le jeu. Plusieurs entrées
// peuvent donc représenter le même déplacement.
const DIRECTIONS = Object.freeze({
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  z: [0, -1],
  s: [0, 1],
  q: [-1, 0],
  d: [1, 0],
});

// ---------------------------------------------------------------------------
// Utilitaires et génération de carte
// ---------------------------------------------------------------------------
//
// Copie une valeur composée uniquement de données JSON.
// Les fonctions qui modifient l'état peuvent ainsi retourner une nouvelle
// version sans modifier l'état reçu en paramètre.
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Normalise le résultat du générateur aléatoire fourni par le jeu afin de
// toujours obtenir une valeur exploitable comprise entre 0 et 1.
function randomValue(random) {
  const value = Number(random());
  return Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0;
}

// Transforme une position en clé de texte, utilisable dans un Set pour tester
// rapidement si une case est protégée.
function key(x, y) {
  return `${x},${y}`;
}

// Retourne le joueur vivant à la position donnée, ou undefined si aucun joueur n'est présent. 
// L'identifiant du joueur à ignorer peut être fourni pour éviter de
// détecter le joueur qui se déplace.
function playerAt(state, x, y, ignoredId) {
  return state.players.find(
    (player) =>
      player.alive &&
      player.id !== ignoredId &&
      player.x === x &&
      player.y === y,
  );
}

// Retourne true si la position est à l'intérieur de la carte, false sinon.
function isInside(state, x, y) {
  return x >= 0 && y >= 0 && x < state.config.width && y < state.config.height;
}

// Retourne la bombe à la position donnée, ou undefined si aucune bombe n'est présente.
function bombAt(state, x, y) {
  return state.bombs.find((bomb) => bomb.x === x && bomb.y === y);
}

// Retourne la bombe à la position donnée, ou undefined si aucune bombe n'est présente.
function isWalkable(state, x, y, playerId) {
  return (
    isInside(state, x, y) &&
    state.map[y][x] === null &&
    !bombAt(state, x, y) &&
    !playerAt(state, x, y, playerId)
  );
}

// Construit une carte en quatre étapes : création des murs, calcul des points
// de départ, protection des cases voisines, puis ajout aléatoire des briques.
function createMap(config, random) {
  // Une case contient "wall", "brick" ou null lorsqu'elle est libre.
  const map = Array.from({ length: config.height }, (_, y) =>
    Array.from({ length: config.width }, (_, x) => {
      if (
        x === 0 ||
        y === 0 ||
        x === config.width - 1 ||
        y === config.height - 1
      )
        return "wall";
      if (x % 2 === 0 && y % 2 === 0) return "wall";
      return null;
    }),
  );

  // Convertit les coordonnées éventuellement négatives en coordonnées
  // adaptées aux dimensions réelles de la carte.
  const spawns = SPAWNS.map((spawn) => ({
    x: spawn.x < 0 ? config.width + spawn.x : spawn.x,
    y: spawn.y < 0 ? config.height + spawn.y : spawn.y,
  }));

  // Chaque zone de départ conserve trois cases libres pour permettre au
  // joueur de sortir sans être immédiatement bloqué par une brique.
  const safe = new Set(
    spawns.flatMap(({ x, y }) =>
      [
        [x, y],
        [x + (x < config.width / 2 ? 1 : -1), y],
        [x, y + (y < config.height / 2 ? 1 : -1)],
      ].map(([sx, sy]) => key(sx, sy)),
    ),
  );

  // Les bords et les murs intérieurs ont déjà été placés ; seules les cases
  // libres qui ne sont pas protégées peuvent recevoir une brique.
  for (let y = 1; y < config.height - 1; y += 1) {
    for (let x = 1; x < config.width - 1; x += 1) {
      if (
        map[y][x] === null &&
        !safe.has(key(x, y)) &&
        randomValue(random) < config.brickChance
      )
        map[y][x] = "brick";
    }
  }

  return { map, spawns };
}

// ---------------------------------------------------------------------------
// Création et gestion des joueurs
// ---------------------------------------------------------------------------

// Crée l'état initial complet d'une partie. Les options sont utiles pour
// fournir une configuration, une carte, des spawns ou un hasard contrôlé
// (notamment dans les tests).
function createGameState(options = {}) {
  // Les options remplacent uniquement les valeurs qu'elles précisent.
  const config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
  const random = options.random || Math.random;
  const generated = createMap(config, random);
  return {
    config,
    // Les données fournies par l'appelant sont copiées pour éviter qu'une
    // modification ultérieure ne change l'état de cette partie.
    map: options.map ? clone(options.map) : generated.map,
    spawns: options.spawns ? clone(options.spawns) : generated.spawns,
    // Ces tableaux seront remplis au fil de la partie.
    players: [],
    bombs: [],
    flames: [],
    pickups: [],
    deathOrder: [],
    // Temps écoulé depuis le début de la partie, en millisecondes.
    time: 0,
    round: 1,
    maxRounds: config.maxRounds,
    roundsWon: 0,
    // La partie commence dans le lobby et passe à "playing" quand elle est
    // suffisamment remplie.
    phase: "lobby",
    winner: null,
    scoreboard: [],
  };
}

// Ajoute un joueur et retourne un nouvel état, sans modifier l'ancien.
// Une demande invalide ou une partie pleine retourne l'état original.
function joinPlayer(state, details = {}) {
  const id = String(details.id);

  if (
    !id ||
    state.players.some((player) => player.id === id) ||
    state.players.length >= state.config.maxPlayers
  )
    return state;
  // La copie protège l'état précédent, ce qui facilite la synchronisation
  // serveur/client et rend les changements plus prévisibles.
  const next = clone(state);
  const position = next.spawns[next.players.length];
  next.players.push({
    // Chaque joueur reçoit ses propres valeurs et ne partage pas les
    // statistiques du modèle avec les autres joueurs.
    ...clone(DEFAULT_PLAYER_STATE),
    id: String(details.id),
    nickname: String(details.nickname || `Player ${next.players.length + 1}`),
    ...position,
    stats: clone(DEFAULT_PLAYER_STATE.stats),
  });
  // Lorsque le nombre maximal de joueurs est atteint, la partie démarre.
  if (next.players.length === next.config.maxPlayers) next.phase = "playing";
  return next;
}

// Met à jour l'entrée d'un joueur et retourne un nouvel état. Si le joueur
// n'existe pas, l'état original est retourné.
function setPlayerInput(state, playerId, input = {}) {
  if (!state.players.some((player) => player.id === playerId)) return state;

  const next = clone(state);
  const player = next.players.find((item) => item.id === playerId);
  player.input =
    typeof input === "string" ? { direction: input } : { ...input };

  return next;
}

// ---------------------------------------------------------------------------
// Actions de jeu
// ---------------------------------------------------------------------------

// Déplace les joueurs selon leur entrée et retourne un nouvel état. Les joueurs
// ne peuvent pas se déplacer plus vite que l'intervalle défini dans la
// configuration.
function movePlayers(state) {
  const next = clone(state);

  for (const player of next.players) {
    if (
      !player.alive ||
      !player.input ||
      next.time - player.lastMove < next.config.moveIntervalMs
    )
      continue;
    const direction = DIRECTIONS[player.input.direction || player.input.key];

    if (!direction) continue;

    const [dx, dy] = direction;

    if (isWalkable(next, player.x + dx, player.y + dy, player.id)) {
      player.x += dx;
      player.y += dy;
    }

    player.lastMove = next.time;
  }

  return next;
}

// Place une bombe si le joueur est autorisé à le faire et retourne un nouvel état.
function placeBomb(state, playerId) {
  const next = clone(state);
  const player = next.players.find((item) => item.id === playerId);

  if (
    !player ||
    !player.alive ||
    next.phase !== "playing" ||
    bombAt(next, player.x, player.y) ||
    next.bombs.filter((bomb) => bomb.ownerId === playerId).length >=
      player.stats.maxBombs ||
    next.time - (player.lastBombAt || -Infinity) < player.stats.bombCooldown
  )
    return state;
  next.bombs.push({
    id: `${playerId}:${next.time}:${next.bombs.length}`,
    ownerId: playerId,
    x: player.x,
    y: player.y,
    explodeAt: next.time + next.config.bombFuseMs,
    radius: player.stats.bombRadius,
    damage: player.stats.damage,
  });

  player.lastBombAt = next.time;
  player.bombsPlaced += 1;

  return next;
}

// Déclenche l'explosion d'une bombe et de toutes les bombes en chaîne, puis
// applique les dégâts aux joueurs touchés. Les briques détruites peuvent
// générer des objets selon la chance du joueur qui a placé la bombe.
function explodeBomb(state, bomb, random) {
  const next = state;
  const pending = [bomb];
  const exploded = new Set();

  while (pending.length) {
    const current = pending.shift();

    if (exploded.has(current.id)) continue;

    exploded.add(current.id);
    next.bombs = next.bombs.filter(item => item.id !== current.id);
    const cells = [[current.x, current.y]];

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let distance = 1; distance <= current.radius; distance += 1) {
        const x = current.x + dx * distance;
        const y = current.y + dy * distance;

        if (!isInside(next, x, y) || next.map[y][x] === 'wall') break;

        cells.push([x, y]);
        const chained = bombAt(next, x, y);

        if (chained) pending.push(chained);

        if (next.map[y][x] === "brick") {
          next.map[y][x] = null;

          if (randomValue(random) < 0.35 + (current.luck || 0)) {
            const types = Object.keys(UPGRADES);
            next.pickups.push({
              x,
              y,
              type: types[Math.floor(randomValue(random) * types.length)],
            });
          }
          break;
        }
      }
    }
    for (const [x, y] of cells) {
      next.flames.push({ x, y, expiresAt: next.time + next.config.flameDurationMs });

      for (const player of next.players) {
        if (player.alive && player.x === x && player.y === y) {
          player.stats.health -= current.damage;

          if (player.stats.health <= 0) {
            player.alive = false;
            player.deaths = (player.deaths || 0) + 1;
            next.deathOrder.push(player.id);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Progression des manches et boucle de simulation
// ---------------------------------------------------------------------------

// Termine la manche en cours et retourne un nouvel état. Si la partie est
// terminée, le nouvel état contient le classement final.
function finishRound(state) {
  const alive = state.players.filter((player) => player.alive);

  if (
    alive.length > 1 ||
    state.players.filter((player) => player.alive || player.deaths).length <= 1
  )
    return state;

  const next = clone(state);
  const winner = alive[0] || next.players.find((player) => player.alive);

  if (winner) {
    winner.score += 5;
    next.roundsWon += 1;
    next.winner = winner.id;
  }
  [...next.deathOrder].reverse().forEach((playerId, index) => {
    const player = next.players.find((item) => item.id === playerId);
    if (player) player.score += Math.max(1, 3 - index);
  });

  if (next.round >= next.maxRounds) {
    next.phase = "game_over";
    next.scoreboard = next.players
      .slice()
      .sort((a, b) => b.score - a.score)
      .map(({ id, nickname, score }) => ({ id, nickname, score }));
  } else {
    next.phase = "round_over";
  }

  return next;
}

// Met à jour l'état du jeu en fonction du temps écoulé et retourne un nouvel état.
function tick(state, elapsedMs = 0, options = {}) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return state;

  let next = clone(state);
  next.time += elapsedMs;

  if (next.phase !== "playing") return next;

  next = movePlayers(next);
  const random = options.random || Math.random;

  for (const bomb of next.bombs.slice()) {
    if (bomb.explodeAt <= next.time) explodeBomb(next, bomb, random);
  }

  next.flames = next.flames.filter((flame) => flame.expiresAt > next.time);

  for (const player of next.players) {
    const pickup = next.pickups.find(
      (item) => item.x === player.x && item.y === player.y,
    );
    if (player.alive && pickup) {
      const upgrade = UPGRADES[pickup.type];
      player.stats[upgrade.stat] = Math.max(
        0,
        player.stats[upgrade.stat] + upgrade.amount,
      );
      if (upgrade.stat === "maxHealth") player.stats.health += upgrade.amount;
      next.pickups = next.pickups.filter((item) => item !== pickup);
    }
  }

  return finishRound(next);
}

// Applique l'augmentation choisie par le joueur et retourne un nouvel état.
// Chaque joueur peut choisir une augmentation entre deux manches qu'il gardera pour tout les prochains rounds.
function chooseUpgrade(state, playerId, type) {
  const upgrade = UPGRADES[type];

  if (!upgrade || state.phase !== "round_over") return state;

  const next = clone(state);
  const player = next.players.find((item) => item.id === playerId);

  if (!player || player.upgradeChosen) return state;

  player.stats[upgrade.stat] = Math.max(
    0,
    player.stats[upgrade.stat] + upgrade.amount,
  );
  player.upgradeChosen = true;

  if (next.players.every((item) => !item.alive || item.upgradeChosen)) {
    next.round += 1;
    next.phase = "playing";
    next.winner = null;
    next.bombs = [];
    next.flames = [];
    next.pickups = [];
    next.deathOrder = [];

    next.players.forEach((item, index) => {
      const spawn = next.spawns[index];
      Object.assign(item, spawn, {
        alive: true,
        upgradeChosen: false,
        lastMove: next.time,
      });
      item.stats.health = item.stats.maxHealth;
    });
  }

  return next;
}

// Applique une action reçue par le serveur et retourne un nouvel état. Les
// actions sont envoyées par les clients et peuvent être invalides ou malveillantes.
function applyAction(state, action = {}) {
  switch (action.type) {
    case "join":
      return joinPlayer(state, action.player || action);
    case "input":
      return setPlayerInput(state, action.playerId, action.input);
    case "place_bomb":
      return placeBomb(state, action.playerId);
    case "tick":
      return tick(state, action.deltaMs, action);
    case "choose_upgrade":
      return chooseUpgrade(state, action.playerId, action.upgrade);
    case "start":
      return state.players.length
        ? { ...clone(state), phase: "playing" }
        : state;
    default:
      return state;
  }
}
