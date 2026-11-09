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
});

// État par défaut pour un joueur
const DEFAULT_PLAYER_STATE = Object.freeze({
    x: 0,                   // position x du joueur
    y: 0,                   // position y du joueur
    health: 1,              // points de vie du joueur
    maxHealth: 1,           // points de vie maximum du joueur
    speed: 1,               // vitesse de déplacement du joueur
    maxBombs: 1,            // nombre maximum de bombes que le joueur peut poser
    bombRadius: 2,          // rayon des bombes posées par le joueur
    damage: 1,              // puissance des bombes posées par le joueur
    luck: 0.2,              // chance du joueur de trouver un bonus rare lors du choix des augmentations ou en détruisant un mur
    items: [],              // liste des items possédés par le joueur
    augmentations: [],      // liste des augmentations possédées par le joueur
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

// Fonction utilitaire pour générer une valeur aléatoire entre 0 et 1
function randomValue(random) {
  const value = Number(random());
  return Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0;
}

// Fonction pour créer un nouvel état de jeu avec des options personnalisées
function createGameState(options = {}) {
    const config = { ...DEFAULT_CONFIG, ...DEFAULT_PLAYER_STATE, ...options };
    const players = Array.from({ length: config.maxPlayers }, (_, i) => ({
        id: i,
        ...DEFAULT_PLAYER_STATE,
    }));
    return {
        config,
        players,
    };
}

