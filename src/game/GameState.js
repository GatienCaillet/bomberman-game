'use strict';

/**
 * GameState : les règles du jeu Bomberman (Pôle 3, logique côté serveur).
 *
 * Utilisation par le serveur temps réel (Pôle 5) :
 *
 *   let state = createGame({ seed: Date.now(), config: { totalRounds: 5 } });
 *   state = addPlayer(state, { id: socket.id, name: 'Alice' });
 *   state = startGame(state);
 *   // à chaque message d'un client :
 *   state = setInput(state, playerId, { direction: 'up', bomb: true });
 *   // à intervalle régulier (ex. toutes les 50 ms) :
 *   state = tick(state, 50);
 *   broadcast(state);
 *   state = clearEvents(state);
 *   // entre deux manches, quand un joueur choisit son augment :
 *   state = chooseAugment(state, playerId, 'pyromaniac');
 *
 */

// ===========================================================================
// Constantes et configuration
// ===========================================================================

// Ce que contient une case de la grille, du point de vue des règles.
// Le dessin (bâtiment, arbre, cône...) est décrit à part dans state.objects.
const TILE = Object.freeze({
  EMPTY: 'empty', // rue praticable
  WALL: 'wall', // bord de carte, bâtiment ou végétation : indestructible
  OBSTACLE: 'obstacle', // cône ou poubelle : détruit par les explosions
});

// Une partie passe par ces phases :
// lobby -> playing -> augment -> playing -> augment -> ... -> gameOver
const PHASE = Object.freeze({
  LOBBY: 'lobby', // les joueurs rejoignent la partie
  PLAYING: 'playing', // une manche est en cours
  AUGMENT: 'augment', // entre deux manches, chaque joueur choisit un augment
  GAME_OVER: 'gameOver', // toutes les manches sont jouées, le meilleur score gagne
});

const DIRECTIONS = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1 }),
  down: Object.freeze({ dx: 0, dy: 1 }),
  left: Object.freeze({ dx: -1, dy: 0 }),
  right: Object.freeze({ dx: 1, dy: 0 }),
});

// Toutes les durées sont en millisecondes.
const DEFAULT_CONFIG = Object.freeze({
  width: 17, // largeur de la carte, bords compris (même format que l'aperçu du Pôle 2)
  height: 11, // hauteur de la carte, bords compris
  minPlayers: 2,
  maxPlayers: 4,
  totalRounds: 3, // nombre de manches de la partie, choisi à la création
  victoryBonus: 1, // point en plus pour le dernier survivant d'une manche
  roundDurationMs: 180000, // au-delà, la manche est déclarée nulle
  bombFuseMs: 2500, // délai avant qu'une bombe explose
  flameDurationMs: 500, // durée pendant laquelle les flammes restent dangereuses
  baseMoveDelayMs: 200, // délai entre deux pas à la vitesse 1
  minMoveDelayMs: 80, // limite la vitesse maximale
  invincibilityMs: 1000, // protection après avoir perdu un coeur
  obstacleDensity: 0.5, // part des rues libres remplies de cônes et poubelles
  powerUpDropChance: 0.3, // probabilité qu'un obstacle détruit libère un bonus
  augmentChoices: 3, // nombre d'augments proposés entre deux manches
});

// Statistiques d'un joueur sans aucun bonus ni augment.
const BASE_STATS = Object.freeze({
  maxHearts: 2, // coeurs au début de chaque manche
  speed: 1, // multiplicateur de vitesse de déplacement
  maxBombs: 1, // nombre de bombes posées en même temps
  bombRange: 2, // portée des flammes, en cases
  fuseMultiplier: 1, // multiplie la durée de la mèche
  piercing: false, // les flammes traversent les obstacles
});

// Limites appliquées après les augments, pour que les malus restent jouables.
const MIN_HEARTS = 1;
const MIN_SPEED = 0.4;

// ---------------------------------------------------------------------------
// Éléments de décor (fichiers dans public/ressources/)
// ---------------------------------------------------------------------------

// Bâtiments : « columns × rows » est leur emprise au sol, en cases.
// Le nom du fichier est « numero-lignesxcolonnes.png ».
const BUILDINGS = Object.freeze({
  house1: { columns: 1, rows: 1, sprite: 'batiments/logements/01-1x1.png' },
  row2: { columns: 2, rows: 1, sprite: 'batiments/logements/02-1x2.png' },
  row3: { columns: 3, rows: 1, sprite: 'batiments/logements/03-1x3.png' },
  house2: { columns: 1, rows: 2, sprite: 'batiments/logements/04-2x1.png' },
  row2Tall: { columns: 2, rows: 2, sprite: 'batiments/logements/05-2x2.png' },
});

// Commerces : variantes d'un bâtiment de même emprise, avec la devanture
// déjà dessinée. Chaque commerce est placé au plus une fois par carte.
const SHOPS = Object.freeze([
  { id: 'market', building: 'row2', sprite: 'batiments/commerces/01-1x2.png' },
  { id: 'fruit', building: 'row2', sprite: 'batiments/commerces/02-1x2.png' },
  { id: 'fashion', building: 'row2Tall', sprite: 'batiments/commerces/03-2x2.png' },
  { id: 'bakery', building: 'house1', sprite: 'batiments/commerces/04-1x1.png' },
  { id: 'cafe', building: 'row3', sprite: 'batiments/commerces/05-1x3.png' },
  { id: 'books', building: 'house2', sprite: 'batiments/commerces/06-2x1.png' },
  { id: 'pharmacy', building: 'row2Tall', sprite: 'batiments/commerces/07-2x2.png' },
  { id: 'flowers', building: 'house1', sprite: 'batiments/commerces/08-1x1.png' },
]);

const VEGETATION = Object.freeze({
  tree: { sprite: 'obstacles/vegetation/02-arbre.png' },
  shrub: { sprite: 'obstacles/vegetation/01-buisson.png' },
});

const DESTRUCTIBLES = Object.freeze({
  cone: { sprite: 'obstacles/destructibles/03-cone.png' },
  bin: { sprite: 'obstacles/destructibles/04-poubelle.png' },
});

// Éléments fixes placés sur chaque carte, dans cet ordre : d'abord un
// bâtiment de chaque format, puis des doublons, puis la végétation.
const FIXED_OBJECTS_TO_PLACE = Object.freeze([
  'row2Tall', 'row3', 'row2', 'house2', 'house1',
  'row2Tall', 'row2', 'house2', 'house1', 'house1',
  'tree', 'tree', 'tree', 'shrub', 'shrub', 'shrub',
]);

// ---------------------------------------------------------------------------
// Bonus et augments
// ---------------------------------------------------------------------------

function withStats(player, changes) {
  return { ...player, stats: { ...player.stats, ...changes } };
}

// Bonus ramassés sur la carte. Ils ne durent que pendant la manche en cours.
// apply(joueur) retourne le joueur modifié.
const POWER_UPS = Object.freeze({
  bombUp: { name: 'Bombe +1', apply: (p) => withStats(p, { maxBombs: p.stats.maxBombs + 1 }) },
  fireUp: { name: 'Flamme +1', apply: (p) => withStats(p, { bombRange: p.stats.bombRange + 1 }) },
  speedUp: { name: 'Vitesse +', apply: (p) => withStats(p, { speed: p.stats.speed + 0.2 }) },
  heart: { name: 'Coeur', apply: (p) => ({ ...p, hearts: Math.min(p.hearts + 1, p.stats.maxHearts) }) },
});

// Augments (variante du jeu) : entre deux manches, chaque joueur choisit un
// augment parmi plusieurs tirés au hasard. Un augment est conservé jusqu'à
// la fin de la partie. Les effets sont des additions (ou une multiplication
// sur une seule statistique) : l'ordre dans lequel on les applique ne change
// donc rien. « stackable: false » : un joueur ne peut le prendre qu'une fois.
const AUGMENTS = Object.freeze({
  vitality: {
    tier: 1,
    name: 'Vitalité',
    description: '+1 coeur',
    stackable: true,
    apply: (s) => ({ ...s, maxHearts: s.maxHearts + 1 }),
  },
  pyromaniac: {
    tier: 1,
    name: 'Pyromane',
    description: '+1 portée des flammes',
    stackable: true,
    apply: (s) => ({ ...s, bombRange: s.bombRange + 1 }),
  },
  stockpile: {
    tier: 1,
    name: 'Réserve',
    description: '+1 bombe posée en même temps',
    stackable: true,
    apply: (s) => ({ ...s, maxBombs: s.maxBombs + 1 }),
  },
  sprinter: {
    tier: 2,
    name: 'Sprinter',
    description: '+25 % de vitesse',
    stackable: true,
    apply: (s) => ({ ...s, speed: s.speed + 0.25 }),
  },
  shortFuse: {
    tier: 2,
    name: 'Mèche courte',
    description: 'Les bombes explosent 30 % plus tôt',
    stackable: false,
    apply: (s) => ({ ...s, fuseMultiplier: s.fuseMultiplier * 0.7 }),
  },
  colossus: {
    tier: 2,
    name: 'Colosse',
    description: '+2 coeurs, mais -20 % de vitesse',
    stackable: false,
    apply: (s) => ({ ...s, maxHearts: s.maxHearts + 2, speed: s.speed - 0.2 }),
  },
  heavyArsenal: {
    tier: 2,
    name: 'Arsenal lourd',
    description: '+2 bombes, mais -20 % de vitesse',
    stackable: false,
    apply: (s) => ({ ...s, maxBombs: s.maxBombs + 2, speed: s.speed - 0.2 }),
  },
  glassCannon: {
    tier: 3,
    name: 'Canon de verre',
    description: '+2 portée et +1 bombe, mais -1 coeur',
    stackable: false,
    apply: (s) => ({ ...s, bombRange: s.bombRange + 2, maxBombs: s.maxBombs + 1, maxHearts: s.maxHearts - 1 }),
  },
  piercingFlames: {
    tier: 3,
    name: 'Flammes perforantes',
    description: 'Les flammes traversent les obstacles',
    stackable: false,
    apply: (s) => ({ ...s, piercing: true }),
  },
  bigBang: {
    tier: 3,
    name: 'Big Bang',
    description: '+3 portée, mais une mèche 50 % plus longue',
    stackable: false,
    apply: (s) => ({ ...s, bombRange: s.bombRange + 3, fuseMultiplier: s.fuseMultiplier * 1.5 }),
  },
});

// ===========================================================================
// Utilitaires internes
// ===========================================================================

function clone(state) {
  return structuredClone(state);
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function getNeighbors({ x, y }) {
  return Object.values(DIRECTIONS).map(({ dx, dy }) => ({ x: x + dx, y: y + dy }));
}

// Générateur pseudo-aléatoire « mulberry32 ». Il lit la graine du brouillon,
// la fait avancer et retourne un nombre entre 0 (inclus) et 1 (exclu).
function random(draft) {
  draft.seed = (draft.seed + 0x6d2b79f5) | 0;
  let t = draft.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randomItem(draft, items) {
  return items[Math.floor(random(draft) * items.length)];
}

// Mélange de Fisher-Yates : retourne une copie mélangée du tableau.
function shuffle(draft, items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random(draft) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Identifiant unique pour les bombes, bonus et éléments de décor.
function nextId(draft, prefix) {
  const id = `${prefix}-${draft.nextEntityId}`;
  draft.nextEntityId += 1;
  return id;
}

function emit(draft, type, data = {}) {
  draft.events.push({ type, time: draft.time, ...data });
}

// ===========================================================================
// Lecture de l'état (fonctions pures, utilisables aussi par le serveur et les tests)
// ===========================================================================

function getPlayer(state, playerId) {
  return state.players.find((player) => player.id === playerId);
}

// Une case hors de la carte est considérée comme un mur.
function getTile(state, x, y) {
  return state.map[y]?.[x] ?? TILE.WALL;
}

function getBombAt(state, x, y) {
  return state.bombs.find((bomb) => bomb.x === x && bomb.y === y);
}

function hasFlameAt(state, x, y) {
  return state.flames.some((flame) => flame.x === x && flame.y === y);
}

// Collision : on ne peut marcher que sur une case vide sans bombe.
// Les joueurs ne se bloquent pas entre eux.
function isWalkable(state, x, y) {
  return getTile(state, x, y) === TILE.EMPTY && !getBombAt(state, x, y);
}

function countActiveBombs(state, playerId) {
  return state.bombs.filter((bomb) => bomb.ownerId === playerId).length;
}

// Cases touchées par l'explosion d'une bombe : sa case, puis dans chaque
// direction jusqu'à sa portée. Un mur arrête la flamme. Un obstacle est
// touché mais arrête aussi la flamme, sauf si la bombe est perforante.
function getExplosionCells(state, bomb) {
  const cells = [{ x: bomb.x, y: bomb.y }];

  for (const { dx, dy } of Object.values(DIRECTIONS)) {
    for (let step = 1; step <= bomb.range; step += 1) {
      const x = bomb.x + dx * step;
      const y = bomb.y + dy * step;
      const tile = getTile(state, x, y);

      if (tile === TILE.WALL) break;
      cells.push({ x, y });
      if (tile === TILE.OBSTACLE && !bomb.piercing) break;
    }
  }

  return cells;
}

// Statistiques d'un joueur en début de manche : base + effets de ses
// augments, puis application des limites minimales.
function computeStats(augmentIds) {
  const stats = augmentIds.reduce((current, id) => AUGMENTS[id].apply(current), { ...BASE_STATS });
  return {
    ...stats,
    maxHearts: Math.max(MIN_HEARTS, stats.maxHearts),
    speed: Math.max(MIN_SPEED, stats.speed),
  };
}

function getMoveDelay(config, stats) {
  return Math.max(config.minMoveDelayMs, config.baseMoveDelayMs / stats.speed);
}

// Positions de départ : les quatre coins de la zone de jeu.
function getSpawnPositions(config) {
  const right = config.width - 2;
  const bottom = config.height - 2;
  return [
    { x: 1, y: 1 },
    { x: right, y: bottom },
    { x: right, y: 1 },
    { x: 1, y: bottom },
  ];
}

// Classement général, du premier au dernier : score total, puis manches
// gagnées, puis éliminations en cas d'égalité. À transmettre au Pôle 4
// pour la sauvegarde MongoDB en fin de partie.
function getResults(state) {
  return state.players
    .map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      roundWins: player.roundWins,
      kills: player.kills,
      deaths: player.deaths,
      augments: [...player.augments],
      isWinner: player.id === state.winnerId,
    }))
    .sort((a, b) => b.score - a.score || b.roundWins - a.roundWins || b.kills - a.kills);
}

// Points d'une manche selon l'ordre d'élimination : le premier éliminé
// marque 1 point, le deuxième 2, etc. Les joueurs éliminés au même instant
// marquent autant de points. Les survivants marquent un point de plus que
// le dernier éliminé, et le vainqueur (seul survivant) reçoit le bonus de victoire.
// Exemple à 4 joueurs : 1, 2, 3 puis 4 + 1 = 5 points pour le vainqueur.
function getRoundRanking(state, roundWinnerId) {
  const participants = state.players.filter((player) => player.inRound);
  const isEliminatedBefore = (other, player) =>
    other.eliminatedAt !== null &&
    (player.eliminatedAt === null || other.eliminatedAt < player.eliminatedAt);

  return participants
    .map((player) => {
      const place = participants.filter((other) => isEliminatedBefore(other, player)).length + 1;
      const bonus = player.id === roundWinnerId ? state.config.victoryBonus : 0;
      return { playerId: player.id, points: place + bonus };
    })
    .sort((a, b) => b.points - a.points);
}

// Catalogue des augments sans les fonctions, pour l'afficher côté client.
function getAugmentCatalog() {
  return Object.entries(AUGMENTS).map(([id, { tier, name, description }]) => ({
    id,
    tier,
    name,
    description,
  }));
}

// ===========================================================================
// Génération de la carte
// ===========================================================================
//
// La carte est décrite deux fois :
//  - state.map[y][x] : le type de chaque case (TILE), utilisé par les règles ;
//  - state.objects : les éléments à dessiner. Chaque objet occupe le
//    rectangle [x, x + width[ × [y, y + height[ (coin haut-gauche en x, y)
//    et indique son image dans « sprite » (chemin dans public/ressources/).

function isInPlayArea(config, { x, y }) {
  return x > 0 && y > 0 && x < config.width - 1 && y < config.height - 1;
}

function getPlayAreaCells(config) {
  const cells = [];
  for (let y = 1; y < config.height - 1; y += 1) {
    for (let x = 1; x < config.width - 1; x += 1) cells.push({ x, y });
  }
  return cells;
}

// Le point de départ et ses deux voisins vers l'intérieur restent libres
// pour qu'un joueur ne soit jamais coincé dès le début.
function getSafeCells(config) {
  return getSpawnPositions(config).flatMap(({ x, y }) => [
    { x, y },
    { x: x === 1 ? 2 : x - 1, y },
    { x, y: y === 1 ? 2 : y - 1 },
  ]);
}

function getFootprint({ x, y }, columns, rows) {
  const cells = [];
  for (let dy = 0; dy < rows; dy += 1) {
    for (let dx = 0; dx < columns; dx += 1) cells.push({ x: x + dx, y: y + dy });
  }
  return cells;
}

function setTiles(map, cells, tile) {
  for (const { x, y } of cells) map[y][x] = tile;
}

// Un mur dans la zone de jeu est forcément un élément fixe (bâtiment, arbre...).
function isFixedObjectCell(map, config, cell) {
  return isInPlayArea(config, cell) && map[cell.y][cell.x] === TILE.WALL;
}

// Vérifie que toutes les rues libres restent reliées entre elles, par un
// parcours en largeur depuis le premier point de départ.
function areStreetsConnected(map, config) {
  const start = getSpawnPositions(config)[0];
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];

  for (let i = 0; i < queue.length; i += 1) {
    for (const next of getNeighbors(queue[i])) {
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || map[next.y][next.x] !== TILE.EMPTY) continue;
      seen.add(key);
      queue.push(next);
    }
  }

  const streetCount = getPlayAreaCells(config).filter(({ x, y }) => map[y][x] === TILE.EMPTY).length;
  return seen.size === streetCount;
}

// Un élément fixe se place sur des rues libres, hors des zones de départ,
// avec au moins une case d'écart avec les autres éléments fixes.
function canPlaceFixedObject(map, config, footprint, safeCells) {
  return footprint.every(
    (cell) =>
      isInPlayArea(config, cell) &&
      map[cell.y][cell.x] === TILE.EMPTY &&
      !safeCells.some((safe) => samePosition(safe, cell)) &&
      !getNeighbors(cell).some((neighbor) => isFixedObjectCell(map, config, neighbor)),
  );
}

// Essaie les cases dans un ordre aléatoire et garde la première position
// qui ne coupe aucune rue. Si aucune ne convient, l'élément est ignoré.
function placeFixedObject(draft, map, objects, kind, safeCells) {
  const { config } = draft;
  const building = BUILDINGS[kind];
  const category = building ? 'building' : 'vegetation';
  const columns = building?.columns ?? 1;
  const rows = building?.rows ?? 1;

  for (const cell of shuffle(draft, getPlayAreaCells(config))) {
    const footprint = getFootprint(cell, columns, rows);
    if (!canPlaceFixedObject(map, config, footprint, safeCells)) continue;

    setTiles(map, footprint, TILE.WALL);
    if (areStreetsConnected(map, config)) {
      const sprite = (building ?? VEGETATION[kind]).sprite;
      objects.push(createObject(draft, { kind, category, ...cell, width: columns, height: rows, sprite }));
      return;
    }
    setTiles(map, footprint, TILE.EMPTY);
  }
}

// Transforme certains bâtiments en commerces de même emprise.
function assignShops(draft, objects) {
  const buildings = shuffle(draft, objects.filter((object) => object.category === 'building'));
  for (const shop of shuffle(draft, SHOPS)) {
    const building = buildings.find((item) => item.kind === shop.building && !item.shop);
    if (!building) continue;
    building.shop = shop.id;
    building.sprite = shop.sprite;
  }
}

// Remplit une partie des rues de cônes et de poubelles. On évite la case
// juste au-dessus d'un élément fixe, cachée par son toit.
function placeObstacles(draft, map, objects, safeCells) {
  const { config } = draft;
  const isFree = ({ x, y }) => map[y][x] === TILE.EMPTY;
  const isHiddenByRoof = ({ x, y }) => isFixedObjectCell(map, config, { x, y: y + 1 });
  const isSafe = (cell) => safeCells.some((safe) => samePosition(safe, cell));

  const candidates = getPlayAreaCells(config).filter(
    (cell) => isFree(cell) && !isSafe(cell) && !isHiddenByRoof(cell),
  );
  const count = Math.round(candidates.length * config.obstacleDensity);

  for (const cell of shuffle(draft, candidates).slice(0, count)) {
    const kind = randomItem(draft, Object.keys(DESTRUCTIBLES));
    map[cell.y][cell.x] = TILE.OBSTACLE;
    objects.push(createObstacleObject(draft, kind, cell));
  }
}

function createObject(draft, fields) {
  return { id: nextId(draft, 'object'), destructible: false, shop: null, ...fields };
}

function createObstacleObject(draft, kind, { x, y }) {
  return createObject(draft, {
    kind,
    category: 'obstacle',
    x,
    y,
    width: 1,
    height: 1,
    destructible: true,
    sprite: DESTRUCTIBLES[kind].sprite,
  });
}

// Carte aléatoire : bords, éléments fixes, commerces, puis obstacles.
function generateMap(draft) {
  const { config } = draft;
  const map = Array.from({ length: config.height }, (_, y) =>
    Array.from({ length: config.width }, (_, x) =>
      isInPlayArea(config, { x, y }) ? TILE.EMPTY : TILE.WALL,
    ),
  );
  const objects = [];
  const safeCells = getSafeCells(config);

  for (const kind of FIXED_OBJECTS_TO_PLACE) placeFixedObject(draft, map, objects, kind, safeCells);
  assignShops(draft, objects);
  placeObstacles(draft, map, objects, safeCells);

  return { map, objects };
}

// Transforme un plan texte en carte : '#' mur, 'o' obstacle, '.' rue.
// Pratique pour écrire des cartes précises dans les tests.
function parseLayout(draft) {
  const tiles = { '#': TILE.WALL, o: TILE.OBSTACLE, '.': TILE.EMPTY };
  const map = draft.layout.map((row) => [...row].map((char) => tiles[char] ?? TILE.EMPTY));
  const objects = [];

  map.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === TILE.OBSTACLE) objects.push(createObstacleObject(draft, 'cone', { x, y }));
    }),
  );
  return { map, objects };
}

function createMap(draft) {
  return draft.layout ? parseLayout(draft) : generateMap(draft);
}

// ===========================================================================
// Création de la partie et gestion des joueurs
// ===========================================================================

/**
 * Crée une partie vide, en phase « lobby ».
 * @param {object} [options]
 * @param {number} [options.seed] graine du hasard (ex. Date.now() côté serveur, fixe dans les tests)
 * @param {object} [options.config] valeurs qui remplacent DEFAULT_CONFIG
 * @param {string[]} [options.layout] carte fixe au format texte (voir parseLayout)
 */
function createGame({ seed = 1, config = {}, layout = null } = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  if (layout) {
    fullConfig.width = layout[0].length;
    fullConfig.height = layout.length;
  }

  return {
    config: fullConfig,
    layout,
    seed,
    phase: PHASE.LOBBY,
    time: 0, // temps écoulé depuis la création de la partie
    round: 0,
    roundEndsAt: null,
    map: [],
    objects: [], // décor à dessiner (bâtiments, végétation, obstacles)
    players: [],
    bombs: [],
    flames: [],
    powerUps: [],
    winnerId: null,
    nextEntityId: 1,
    events: [], // ce qui s'est passé depuis le dernier clearEvents (sons, animations...)
  };
}

function createPlayer(id, name) {
  return {
    id,
    name,
    connected: true,
    alive: false,
    x: 0,
    y: 0,
    facing: 'down',
    stats: { ...BASE_STATS },
    hearts: BASE_STATS.maxHearts, // coeurs restants pendant la manche
    invincibleUntil: 0,
    nextMoveAt: 0,
    input: { direction: null, bomb: false },
    augments: [], // augments choisis, conservés toute la partie
    augmentOffer: [], // augments proposés en phase « augment »
    inRound: false, // participe à la manche en cours
    eliminatedAt: null, // instant de l'élimination pendant la manche
    score: 0, // total des points de toutes les manches
    roundWins: 0,
    kills: 0,
    deaths: 0,
  };
}

function addPlayer(state, { id, name } = {}) {
  const canJoin =
    state.phase === PHASE.LOBBY &&
    typeof id === 'string' &&
    id !== '' &&
    !getPlayer(state, id) &&
    state.players.length < state.config.maxPlayers;
  if (!canJoin) return state;

  const draft = clone(state);
  draft.players.push(createPlayer(id, name || `Joueur ${draft.players.length + 1}`));
  return draft;
}

// Dans le lobby, le joueur est retiré. Pendant la partie, il est gardé pour
// les résultats mais marqué déconnecté et éliminé.
function removePlayer(state, playerId) {
  if (!getPlayer(state, playerId)) return state;
  const draft = clone(state);

  if (draft.phase === PHASE.LOBBY) {
    draft.players = draft.players.filter((player) => player.id !== playerId);
    return draft;
  }

  // Quitter la manche compte comme une élimination à cet instant.
  const player = getPlayer(draft, playerId);
  if (player.alive) player.eliminatedAt = draft.time;
  player.connected = false;
  player.alive = false;
  player.augmentOffer = [];
  emit(draft, 'playerLeft', { playerId });

  if (draft.phase === PHASE.PLAYING) checkRoundEnd(draft);
  if (draft.phase === PHASE.AUGMENT) startRoundIfEveryoneChose(draft);
  return draft;
}

function startGame(state) {
  if (state.phase !== PHASE.LOBBY || state.players.length < state.config.minPlayers) return state;
  const draft = clone(state);
  startRound(draft);
  return draft;
}

/**
 * Enregistre l'intention d'un joueur. Elle sera appliquée au prochain tick.
 * @param {object} input
 * @param {'up'|'down'|'left'|'right'|null} [input.direction] direction maintenue, null pour s'arrêter
 * @param {boolean} [input.bomb] true pour poser une bombe
 */
function setInput(state, playerId, input = {}) {
  const player = getPlayer(state, playerId);
  if (state.phase !== PHASE.PLAYING || !player || !player.alive) return state;

  const draft = clone(state);
  const draftPlayer = getPlayer(draft, playerId);

  if ('direction' in input) {
    draftPlayer.input.direction = DIRECTIONS[input.direction] ? input.direction : null;
  }
  // Une demande de bombe reste en attente jusqu'au tick, même si un autre
  // message arrive entre-temps.
  if (input.bomb === true) draftPlayer.input.bomb = true;

  return draft;
}

// Les événements sont conservés jusqu'à ce que le serveur les ait diffusés.
function clearEvents(state) {
  if (state.events.length === 0) return state;
  return { ...state, events: [] };
}

// ===========================================================================
// Manches et augments
// ===========================================================================

function startRound(draft) {
  draft.round += 1;
  draft.phase = PHASE.PLAYING;
  const { map, objects } = createMap(draft);
  draft.map = map;
  draft.objects = objects;
  draft.bombs = [];
  draft.flames = [];
  draft.powerUps = [];
  draft.roundEndsAt = draft.time + draft.config.roundDurationMs;

  const spawns = getSpawnPositions(draft.config);
  draft.players.forEach((player, index) => {
    const stats = computeStats(player.augments);
    Object.assign(player, spawns[index], {
      alive: player.connected,
      inRound: player.connected,
      eliminatedAt: null,
      facing: 'down',
      stats,
      hearts: stats.maxHearts,
      invincibleUntil: 0,
      nextMoveAt: draft.time,
      input: { direction: null, bomb: false },
      augmentOffer: [],
    });
  });

  emit(draft, 'roundStarted', { round: draft.round });
}

// Une manche se termine quand il reste au plus un survivant, ou quand le
// temps est écoulé (match nul s'il reste plusieurs survivants).
function checkRoundEnd(draft) {
  const survivors = draft.players.filter((player) => player.alive);
  const isTimeUp = draft.time >= draft.roundEndsAt;
  if (survivors.length > 1 && !isTimeUp) return;

  const roundWinner = survivors.length === 1 ? survivors[0] : null;
  endRound(draft, roundWinner);
}

// Distribue les points de la manche, puis passe aux augments ou termine la
// partie si c'était la dernière manche (ou s'il ne reste qu'un joueur connecté).
function endRound(draft, roundWinner) {
  const winnerId = roundWinner?.id ?? null;
  const ranking = getRoundRanking(draft, winnerId);
  for (const { playerId, points } of ranking) getPlayer(draft, playerId).score += points;
  if (roundWinner) roundWinner.roundWins += 1;
  draft.bombs = [];
  emit(draft, 'roundEnded', { round: draft.round, winnerId, ranking });

  const connected = draft.players.filter((player) => player.connected);
  const isLastRound = draft.round >= draft.config.totalRounds;
  const notEnoughPlayers = connected.length < 2;

  if (isLastRound || notEnoughPlayers) {
    draft.phase = PHASE.GAME_OVER;
    draft.winnerId = getResults(draft)[0]?.id ?? null;
    emit(draft, 'gameOver', { winnerId: draft.winnerId, results: getResults(draft) });
    return;
  }

  draft.phase = PHASE.AUGMENT;
  for (const player of connected) {
    player.augmentOffer = drawAugmentOffer(draft, player);
  }
}

// Tire des augments différents, en excluant ceux que le joueur possède
// déjà et qui ne se cumulent pas.
function drawAugmentOffer(draft, player) {
  const available = Object.keys(AUGMENTS).filter(
    (id) => AUGMENTS[id].stackable || !player.augments.includes(id),
  );
  return shuffle(draft, available).slice(0, draft.config.augmentChoices);
}

function chooseAugment(state, playerId, augmentId) {
  const player = getPlayer(state, playerId);
  if (state.phase !== PHASE.AUGMENT || !player || !player.augmentOffer.includes(augmentId)) {
    return state;
  }

  const draft = clone(state);
  const draftPlayer = getPlayer(draft, playerId);
  draftPlayer.augments.push(augmentId);
  draftPlayer.augmentOffer = [];
  emit(draft, 'augmentChosen', { playerId, augmentId });

  startRoundIfEveryoneChose(draft);
  return draft;
}

function startRoundIfEveryoneChose(draft) {
  const isWaiting = draft.players.some((player) => player.augmentOffer.length > 0);
  if (!isWaiting) startRound(draft);
}

// ===========================================================================
// Simulation d'une manche (appelée à chaque tick)
// ===========================================================================

/**
 * Fait avancer la manche de deltaMs millisecondes.
 * Ordre d'une étape : bombes demandées, déplacements, ramassage des bonus,
 * explosions, extinction des flammes, dégâts, fin de manche.
 */
function tick(state, deltaMs) {
  if (state.phase !== PHASE.PLAYING || !(deltaMs >= 0)) return state;

  const draft = clone(state);
  draft.time += deltaMs;

  placeRequestedBombs(draft);
  movePlayers(draft);
  collectPowerUps(draft);
  explodeDueBombs(draft);
  removeExpiredFlames(draft);
  damagePlayersInFlames(draft);
  checkRoundEnd(draft);

  return draft;
}

function placeRequestedBombs(draft) {
  for (const player of draft.players) {
    if (!player.input.bomb) continue;
    player.input.bomb = false;

    const canPlace =
      player.alive &&
      !getBombAt(draft, player.x, player.y) &&
      countActiveBombs(draft, player.id) < player.stats.maxBombs;
    if (!canPlace) continue;

    const bomb = {
      id: nextId(draft, 'bomb'),
      ownerId: player.id,
      x: player.x,
      y: player.y,
      range: player.stats.bombRange,
      piercing: player.stats.piercing,
      explodeAt: draft.time + draft.config.bombFuseMs * player.stats.fuseMultiplier,
    };
    draft.bombs.push(bomb);
    emit(draft, 'bombPlaced', { bombId: bomb.id, playerId: player.id, x: bomb.x, y: bomb.y });
  }
}

// Le joueur avance d'une case dans la direction maintenue, si la case est
// libre et si son délai de déplacement (lié à sa vitesse) est écoulé.
// Un joueur posé sur sa propre bombe peut en sortir : seule la case
// d'arrivée est vérifiée.
function movePlayers(draft) {
  for (const player of draft.players) {
    const direction = DIRECTIONS[player.input.direction];
    if (!player.alive || !direction) continue;

    player.facing = player.input.direction;
    if (draft.time < player.nextMoveAt) continue;

    const target = { x: player.x + direction.dx, y: player.y + direction.dy };
    if (!isWalkable(draft, target.x, target.y)) continue;

    player.x = target.x;
    player.y = target.y;
    player.nextMoveAt = draft.time + getMoveDelay(draft.config, player.stats);
  }
}

function collectPowerUps(draft) {
  draft.players.forEach((player, index) => {
    if (!player.alive) return;
    const powerUp = draft.powerUps.find((item) => samePosition(item, player));
    if (!powerUp) return;

    draft.players[index] = POWER_UPS[powerUp.type].apply(player);
    draft.powerUps = draft.powerUps.filter((item) => item.id !== powerUp.id);
    emit(draft, 'powerUpCollected', { playerId: player.id, type: powerUp.type });
  });
}

// Une bombe explose quand sa mèche est terminée ou quand une flamme la
// touche. La boucle continue tant qu'une bombe est prête : c'est ce qui
// produit les réactions en chaîne.
function explodeDueBombs(draft) {
  const isDue = (bomb) => bomb.explodeAt <= draft.time || hasFlameAt(draft, bomb.x, bomb.y);

  let bomb = draft.bombs.find(isDue);
  while (bomb) {
    explodeBomb(draft, bomb);
    bomb = draft.bombs.find(isDue);
  }
}

function explodeBomb(draft, bomb) {
  const cells = getExplosionCells(draft, bomb);
  const expiresAt = draft.time + draft.config.flameDurationMs;

  draft.bombs = draft.bombs.filter((item) => item.id !== bomb.id);
  // Les bonus déjà présents sur la carte brûlent dans l'explosion.
  draft.powerUps = draft.powerUps.filter((item) => !cells.some((cell) => samePosition(cell, item)));

  for (const cell of cells) {
    draft.flames.push({ x: cell.x, y: cell.y, ownerId: bomb.ownerId, expiresAt });
    if (getTile(draft, cell.x, cell.y) === TILE.OBSTACLE) destroyObstacle(draft, cell);
  }

  emit(draft, 'bombExploded', { bombId: bomb.id, ownerId: bomb.ownerId, cells });
}

// Retire l'obstacle de la grille et du décor, puis tire au sort un bonus.
function destroyObstacle(draft, cell) {
  draft.map[cell.y][cell.x] = TILE.EMPTY;
  draft.objects = draft.objects.filter((object) => !(object.destructible && samePosition(object, cell)));
  emit(draft, 'obstacleDestroyed', { x: cell.x, y: cell.y });

  if (random(draft) >= draft.config.powerUpDropChance) return;
  const type = randomItem(draft, Object.keys(POWER_UPS));
  draft.powerUps.push({ id: nextId(draft, 'powerUp'), type, x: cell.x, y: cell.y });
}

function removeExpiredFlames(draft) {
  draft.flames = draft.flames.filter((flame) => flame.expiresAt > draft.time);
}

function damagePlayersInFlames(draft) {
  for (const player of draft.players) {
    if (!player.alive || draft.time < player.invincibleUntil) continue;
    const flame = draft.flames.find((item) => samePosition(item, player));
    if (flame) hitPlayer(draft, player, flame.ownerId);
  }
}

// Une flamme retire un coeur. Le joueur devient ensuite invincible un court
// instant, sinon la même flamme le toucherait à nouveau au tick suivant.
// Sans coeur restant, il est éliminé.
function hitPlayer(draft, player, attackerId) {
  player.hearts -= 1;

  if (player.hearts > 0) {
    player.invincibleUntil = draft.time + draft.config.invincibilityMs;
    emit(draft, 'playerHit', { playerId: player.id, attackerId, hearts: player.hearts });
    return;
  }

  player.alive = false;
  player.eliminatedAt = draft.time;
  player.deaths += 1;
  const attacker = getPlayer(draft, attackerId);
  if (attacker && attacker.id !== player.id) attacker.kills += 1;
  emit(draft, 'playerDied', { playerId: player.id, killerId: attackerId });
}

// ===========================================================================
// Point d'entrée unique pour le serveur
// ===========================================================================

// Applique une action reçue sous forme d'objet. Les actions viennent des
// clients et peuvent être invalides : dans ce cas, l'état est inchangé.
function applyAction(state, action = {}) {
  switch (action.type) {
    case 'join':
      return addPlayer(state, { id: action.playerId, name: action.name });
    case 'leave':
      return removePlayer(state, action.playerId);
    case 'start':
      return startGame(state);
    case 'input':
      return setInput(state, action.playerId, action.input);
    case 'chooseAugment':
      return chooseAugment(state, action.playerId, action.augmentId);
    case 'tick':
      return tick(state, action.deltaMs);
    default:
      return state;
  }
}

module.exports = {
  // constantes
  TILE,
  PHASE,
  DIRECTIONS,
  DEFAULT_CONFIG,
  BASE_STATS,
  BUILDINGS,
  SHOPS,
  VEGETATION,
  DESTRUCTIBLES,
  POWER_UPS,
  AUGMENTS,
  // actions (retournent un nouvel état)
  createGame,
  addPlayer,
  removePlayer,
  startGame,
  setInput,
  chooseAugment,
  tick,
  clearEvents,
  applyAction,
  // lecture de l'état
  getPlayer,
  getTile,
  getBombAt,
  isWalkable,
  getExplosionCells,
  computeStats,
  getSpawnPositions,
  getResults,
  getRoundRanking,
  getAugmentCatalog,
};
