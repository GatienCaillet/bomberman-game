import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TILE,
  DEFAULT_CONFIG,
  SHOPS,
  getTile,
  getSpawnPositions,
} from '../../src/game/GameState.js';
import { createStartedGame } from './helpers.js';

const SEEDS = [1, 7, 42, 1234, 99999];

// Partie démarrée sur une carte générée (pas de plan texte).
function generated(seed, config = {}) {
  return createStartedGame({ seed, layout: null, config });
}

function cellsOf(object) {
  const cells = [];
  for (let dy = 0; dy < object.height; dy += 1) {
    for (let dx = 0; dx < object.width; dx += 1) cells.push({ x: object.x + dx, y: object.y + dy });
  }
  return cells;
}

// Nombre de cases non fixes (rues et obstacles destructibles) accessibles
// depuis le premier point de départ : un obstacle finit toujours par sauter.
function countReachableStreets(state) {
  const start = getSpawnPositions(state.config)[0];
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  for (let i = 0; i < queue.length; i += 1) {
    const { x, y } = queue[i];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const key = `${nx},${ny}`;
      if (seen.has(key) || getTile(state, nx, ny) === TILE.WALL) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen.size;
}

describe('génération de la carte', () => {
  it('respecte les dimensions de la configuration', () => {
    const state = generated(1);

    assert.equal(state.map.length, DEFAULT_CONFIG.height);
    assert.ok(state.map.every((row) => row.length === DEFAULT_CONFIG.width));
  });

  it('entoure la carte de murs', () => {
    for (const seed of SEEDS) {
      const { map, config } = generated(seed);
      for (let x = 0; x < config.width; x += 1) {
        assert.equal(map[0][x], TILE.WALL);
        assert.equal(map[config.height - 1][x], TILE.WALL);
      }
      for (let y = 0; y < config.height; y += 1) {
        assert.equal(map[y][0], TILE.WALL);
        assert.equal(map[y][config.width - 1], TILE.WALL);
      }
    }
  });

  it('laisse libres les points de départ et leurs deux voisins vers l’intérieur', () => {
    for (const seed of SEEDS) {
      const state = generated(seed);
      for (const { x, y } of getSpawnPositions(state.config)) {
        const innerX = x === 1 ? 2 : x - 1;
        const innerY = y === 1 ? 2 : y - 1;
        assert.equal(getTile(state, x, y), TILE.EMPTY);
        assert.equal(getTile(state, innerX, y), TILE.EMPTY);
        assert.equal(getTile(state, x, innerY), TILE.EMPTY);
      }
    }
  });

  it('garde toutes les cases non fixes reliées entre elles', () => {
    for (const seed of SEEDS) {
      const state = generated(seed);
      const streets = state.map.flat().filter((tile) => tile !== TILE.WALL).length;
      assert.equal(countReachableStreets(state), streets, `graine ${seed}`);
    }
  });

  it('produit la même carte pour la même graine', () => {
    const a = generated(42);
    const b = generated(42);

    assert.deepEqual(a.map, b.map);
    assert.deepEqual(a.objects, b.objects);
  });

  it('produit des cartes différentes pour des graines différentes', () => {
    assert.notDeepEqual(generated(1).map, generated(2).map);
  });

  it('considère une case hors de la carte comme un mur', () => {
    const state = generated(1);

    assert.equal(getTile(state, -1, 0), TILE.WALL);
    assert.equal(getTile(state, 0, -1), TILE.WALL);
    assert.equal(getTile(state, 100, 100), TILE.WALL);
  });
});

describe('éléments de décor', () => {
  it('fait correspondre chaque élément fixe à des murs dans la grille', () => {
    for (const seed of SEEDS) {
      const state = generated(seed);
      const fixed = state.objects.filter((object) => !object.destructible);
      assert.ok(fixed.length > 0);
      for (const object of fixed) {
        for (const { x, y } of cellsOf(object)) assert.equal(state.map[y][x], TILE.WALL);
      }
    }
  });

  it('fait correspondre exactement les obstacles du décor et ceux de la grille', () => {
    for (const seed of SEEDS) {
      const state = generated(seed);
      const fromObjects = state.objects
        .filter((object) => object.destructible)
        .map(({ x, y }) => `${x},${y}`)
        .sort();
      const fromMap = [];
      state.map.forEach((row, y) =>
        row.forEach((tile, x) => {
          if (tile === TILE.OBSTACLE) fromMap.push(`${x},${y}`);
        }),
      );
      assert.deepEqual(fromObjects, fromMap.sort());
    }
  });

  it('donne un identifiant unique et un sprite à chaque élément', () => {
    const { objects } = generated(7);
    const ids = new Set(objects.map((object) => object.id));

    assert.equal(ids.size, objects.length);
    assert.ok(objects.every((object) => typeof object.sprite === 'string' && object.sprite.endsWith('.png')));
  });

  it('place chaque commerce au plus une fois, sur un bâtiment de même emprise', () => {
    for (const seed of SEEDS) {
      const { objects } = generated(seed);
      const shops = objects.filter((object) => object.shop);
      const ids = shops.map((object) => object.shop);
      assert.equal(new Set(ids).size, ids.length);
      for (const object of shops) {
        const shop = SHOPS.find((item) => item.id === object.shop);
        assert.equal(object.kind, shop.building);
        assert.equal(object.sprite, shop.sprite);
        assert.equal(object.category, 'building');
      }
    }
  });

  it('ne place aucun obstacle si la densité est nulle', () => {
    const state = generated(1, { obstacleDensity: 0 });

    assert.ok(!state.map.flat().includes(TILE.OBSTACLE));
    assert.ok(state.objects.every((object) => !object.destructible));
  });
});

describe('carte à partir d’un plan texte', () => {
  const layout = [
    '#####',
    '#.o.#',
    '#.#.#',
    '#####',
  ];

  it('traduit chaque caractère en type de case', () => {
    const state = createStartedGame({ layout });

    assert.equal(getTile(state, 0, 0), TILE.WALL);
    assert.equal(getTile(state, 1, 1), TILE.EMPTY);
    assert.equal(getTile(state, 2, 1), TILE.OBSTACLE);
    assert.equal(getTile(state, 2, 2), TILE.WALL);
  });

  it('crée un cône destructible pour chaque obstacle', () => {
    const state = createStartedGame({ layout });

    assert.equal(state.objects.length, 1);
    assert.deepEqual(
      { kind: state.objects[0].kind, x: state.objects[0].x, y: state.objects[0].y, destructible: state.objects[0].destructible },
      { kind: 'cone', x: 2, y: 1, destructible: true },
    );
  });

  it('considère un caractère inconnu comme une rue', () => {
    const state = createStartedGame({ layout: ['#####', '#.?.#', '#...#', '#####'] });

    assert.equal(getTile(state, 2, 1), TILE.EMPTY);
  });
});
