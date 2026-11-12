'use strict';

/**
 * GameState : les règles du jeu Bomberman (Pôle 3, logique côté serveur).
 *
 * Utilisation par le serveur temps réel (Pôle 5) :
 *
 *   let state = createGame({ seed: Date.now() });
 *   state = addPlayer(state, { id: socket.id, name: 'Alice' });
 *   state = startGame(state);
 *   // à chaque message d'un client :
 *   state = setInput(state, playerId, { direction: 'up' });
 *   // à intervalle régulier (ex. toutes les 50 ms) :
 *   state = tick(state, 50);
 *   broadcast(state);
 *   state = clearEvents(state);
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
  OBSTACLE: 'obstacle', // cône ou poubelle : destructible
});

// Une partie passe par ces phases :
// lobby -> playing
const PHASE = Object.freeze({
  LOBBY: 'lobby', // les joueurs rejoignent la partie
  PLAYING: 'playing', // une manche est en cours
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
  baseMoveDelayMs: 200, // délai entre deux pas à la vitesse 1
  minMoveDelayMs: 80, // limite la vitesse maximale
  obstacleDensity: 0.5, // part des rues libres remplies de cônes et poubelles
});

// Statistiques d'un joueur sans aucun bonus.
const BASE_STATS = Object.freeze({
  speed: 1, // multiplicateur de vitesse de déplacement
});

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

// Identifiant unique pour les éléments de décor.
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

// Collision : on ne peut marcher que sur une case vide.
// Les joueurs ne se bloquent pas entre eux.
function isWalkable(state, x, y) {
  return getTile(state, x, y) === TILE.EMPTY;
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
    map: [],
    objects: [], // décor à dessiner (bâtiments, végétation, obstacles)
    players: [],
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
    nextMoveAt: 0,
    input: { direction: null },
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

// Dans le lobby, le joueur est retiré. Pendant la partie, il est gardé
// mais marqué déconnecté et retiré du jeu.
function removePlayer(state, playerId) {
  if (!getPlayer(state, playerId)) return state;
  const draft = clone(state);

  if (draft.phase === PHASE.LOBBY) {
    draft.players = draft.players.filter((player) => player.id !== playerId);
    return draft;
  }

  const player = getPlayer(draft, playerId);
  player.connected = false;
  player.alive = false;
  emit(draft, 'playerLeft', { playerId });
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
 */
function setInput(state, playerId, input = {}) {
  const player = getPlayer(state, playerId);
  if (state.phase !== PHASE.PLAYING || !player || !player.alive) return state;

  const draft = clone(state);
  const draftPlayer = getPlayer(draft, playerId);

  if ('direction' in input) {
    draftPlayer.input.direction = DIRECTIONS[input.direction] ? input.direction : null;
  }
  return draft;
}

// Les événements sont conservés jusqu'à ce que le serveur les ait diffusés.
function clearEvents(state) {
  if (state.events.length === 0) return state;
  return { ...state, events: [] };
}

// ===========================================================================
// Manches
// ===========================================================================

function startRound(draft) {
  draft.round += 1;
  draft.phase = PHASE.PLAYING;
  const { map, objects } = createMap(draft);
  draft.map = map;
  draft.objects = objects;

  const spawns = getSpawnPositions(draft.config);
  draft.players.forEach((player, index) => {
    Object.assign(player, spawns[index], {
      alive: player.connected,
      facing: 'down',
      stats: { ...BASE_STATS },
      nextMoveAt: draft.time,
      input: { direction: null },
    });
  });

  emit(draft, 'roundStarted', { round: draft.round });
}

// ===========================================================================
// Simulation d'une manche (appelée à chaque tick)
// ===========================================================================

/**
 * Fait avancer la manche de deltaMs millisecondes.
 * Pour l'instant, une étape ne fait que déplacer les joueurs.
 */
function tick(state, deltaMs) {
  if (state.phase !== PHASE.PLAYING || !(deltaMs >= 0)) return state;

  const draft = clone(state);
  draft.time += deltaMs;

  movePlayers(draft);

  return draft;
}

// Le joueur avance d'une case dans la direction maintenue, si la case est
// libre et si son délai de déplacement (lié à sa vitesse) est écoulé.
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
  // actions (retournent un nouvel état)
  createGame,
  addPlayer,
  removePlayer,
  startGame,
  setInput,
  tick,
  clearEvents,
  applyAction,
  // lecture de l'état
  getPlayer,
  getTile,
  isWalkable,
  getSpawnPositions,
};
