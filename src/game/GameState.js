// Server side authority rules for the game state

// Configuration par défaut pour le game state
const DEFAULT_CONFIG = Object.freeze({
    width: 13,              // largeur de la grille
    height: 11,             // hauteur de la grille
    maxPlayers: 4,          // nombre maximum de joueurs
    rounds: 10,             // nombre de manches    
    bombFuseMs: 2500,       // durée de vie d'une bombe avant explosion
    flameDurationMs: 500,   // durée de vie des flammes après explosion
    moveIntervalMs: 140,    // intervalle de temps entre deux déplacements d'un joueur
    brickChance: 0.7,       // probabilité qu'une case vide soit remplie par une brique
});

// État par défaut pour un joueur
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
  nickname: '',

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

// Points de spawn par défaut
const SPAWNS = [
    { x: 1, y: 1 },
    { x: -2, y: 1 },
    { x: 1, y: -2 },
    { x: -2, y: -2 },
];

// Directions de déplacement possibles
const DIRECTIONS = Object.freeze({
    up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    z: [0, -1], s: [0, 1], q: [-1, 0], d: [1, 0],
});

// Fonction utilitaire pour cloner un objet ou un tableau
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Fonction utilitaire pour générer une valeur aléatoire entre 0 et 1
function randomValue(random) {
  const value = Number(random());
  return Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0;
}

// Fonction utilitaire pour générer une clé unique pour une position (x, y)
function key(x, y) {
  return `${x},${y}`;
}

// Fonction pour créer une carte de jeu avec des murs et des briques aléatoires
function createMap(config, random) {
  const map = Array.from({ length: config.height }, (_, y) =>
    Array.from({ length: config.width }, (_, x) => {
      if (x === 0 || y === 0 || x === config.width - 1 || y === config.height - 1) return 'wall';
      if (x % 2 === 0 && y % 2 === 0) return 'wall';
      return null;
    }));

  const spawns = SPAWNS.map(spawn => ({
    x: spawn.x < 0 ? config.width + spawn.x : spawn.x,
    y: spawn.y < 0 ? config.height + spawn.y : spawn.y,
  }));

  const safe = new Set(spawns.flatMap(({ x, y }) =>
    [[x, y], [x + (x < config.width / 2 ? 1 : -1), y],
      [x, y + (y < config.height / 2 ? 1 : -1)]].map(([sx, sy]) => key(sx, sy))));

  for (let y = 1; y < config.height - 1; y += 1) {
    for (let x = 1; x < config.width - 1; x += 1) {
      if (map[y][x] === null && !safe.has(key(x, y))
        && randomValue(random) < config.brickChance) map[y][x] = 'brick';
    }
  }

  return { map, spawns };
}

// Fonction pour créer un nouvel état de jeu avec des options personnalisées
function createGameState(options = {}) {
    const config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
    const random = options.random || Math.random;
    const generated = createMap(config, random);
    return {
        config,
        map: options.map ? clone(options.map) : generated.map,
        spawns: options.spawns ? clone(options.spawns) : generated.spawns,
        players: [],
        bombs: [],
        flames: [],
        deathOrder: [],
        time: 0,
        round: 1,
        phase: 'lobby',
        winner: null,
        scoreboard: [],
    };
}

// Fonction pour ajouter un joueur à l'état de jeu
function joinPlayer(state, details = {}) {
  if (!details.id || state.players.some(player => player.id === details.id)
    || state.players.length >= state.config.maxPlayers) return state;
  const next = clone(state);
  const position = next.spawns[next.players.length];
  next.players.push({
    ...clone(DEFAULT_PLAYER_STATE),
    id: String(details.id),
    nickname: String(details.nickname || `Player ${next.players.length + 1}`),
    ...position,
    stats: clone(DEFAULT_PLAYER_STATE.stats),
  });
  if (next.players.length === next.config.maxPlayers) next.phase = 'playing';
  return next;
}

module.exports = {
  DEFAULT_CONFIG,
  DEFAULT_PLAYER_STATE,
  DIRECTIONS,
  createGameState,
  joinPlayer,
};
