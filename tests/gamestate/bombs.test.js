import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TILE,
  DEFAULT_CONFIG,
  POWER_UPS,
  setInput,
  tick,
  getPlayer,
  getTile,
  getBombAt,
  getExplosionCells,
} from '../../src/game/GameState.js';
import { createStartedGame, advance, placeBomb, patchPlayer, eventsOfType } from './helpers.js';

const FUSE = DEFAULT_CONFIG.bombFuseMs;
const FLAME = DEFAULT_CONFIG.flameDurationMs;

// Obstacle en (3,1), à portée d'une bombe posée au départ de p1 (1,1).
const OBSTACLE_LAYOUT = ['#######', '#..o..#', '#.....#', '#.....#', '#######'];

// Grande arène ouverte pour mesurer les explosions sans bord trop proche.
const BIG_LAYOUT = [
  '#########',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#########',
];

const withStats = (state, id, changes) =>
  patchPlayer(state, id, { stats: { ...getPlayer(state, id).stats, ...changes } });

const sortCells = (cells) => [...cells].map(({ x, y }) => `${x},${y}`).sort();

describe('poser une bombe', () => {
  it('crée une bombe sous le joueur avec ses statistiques', () => {
    const state = placeBomb(createStartedGame(), 'p1');
    const bomb = getBombAt(state, 1, 1);

    assert.ok(bomb);
    assert.equal(bomb.ownerId, 'p1');
    assert.equal(bomb.range, 2);
    assert.equal(bomb.piercing, false);
    assert.equal(bomb.explodeAt, FUSE);
    assert.equal(getPlayer(state, 'p1').input.bomb, false);
    assert.equal(eventsOfType(state, 'bombPlaced').length, 1);
  });

  it('applique le multiplicateur de mèche', () => {
    const state = placeBomb(withStats(createStartedGame(), 'p1', { fuseMultiplier: 0.5 }), 'p1');

    assert.equal(getBombAt(state, 1, 1).explodeAt, FUSE * 0.5);
  });

  it('refuse une deuxième bombe sur la même case', () => {
    let state = withStats(createStartedGame(), 'p1', { maxBombs: 3 });
    state = placeBomb(state, 'p1');
    state = placeBomb(state, 'p1');

    assert.equal(state.bombs.length, 1);
  });

  it('limite le nombre de bombes posées en même temps', () => {
    let state = placeBomb(createStartedGame(), 'p1');
    state = tick(setInput(state, 'p1', { direction: 'right' }), 50);
    state = placeBomb(state, 'p1');

    assert.equal(state.bombs.length, 1);
  });

  it('autorise plusieurs bombes avec une réserve plus grande', () => {
    let state = withStats(createStartedGame(), 'p1', { maxBombs: 2 });
    state = placeBomb(state, 'p1');
    state = tick(setInput(state, 'p1', { direction: 'right' }), 50);
    state = placeBomb(state, 'p1');

    assert.equal(state.bombs.length, 2);
  });

  it('rend la bombe au joueur après l’explosion', () => {
    let state = placeBomb(createStartedGame(), 'p1');
    state = advance(state, FUSE + FLAME);
    assert.equal(state.bombs.length, 0);
    assert.equal(state.flames.length, 0);

    state = placeBomb(state, 'p1');
    assert.equal(state.bombs.length, 1);
  });

  it('fait exploser immédiatement une bombe posée dans une flamme', () => {
    let state = withStats(createStartedGame(), 'p1', { maxBombs: 2 });
    state = advance(placeBomb(state, 'p1'), FUSE);
    assert.ok(state.flames.some((flame) => flame.x === 1 && flame.y === 1));

    state = placeBomb(state, 'p1');
    assert.equal(state.bombs.length, 0);
    assert.equal(eventsOfType(state, 'bombExploded').length, 2);
  });
});

describe('getExplosionCells', () => {
  const state = createStartedGame({ layout: BIG_LAYOUT });

  it('couvre la case de la bombe et sa portée dans les quatre directions', () => {
    const cells = getExplosionCells(state, { x: 4, y: 4, range: 2, piercing: false });

    assert.deepEqual(
      sortCells(cells),
      sortCells([
        { x: 4, y: 4 },
        { x: 4, y: 3 }, { x: 4, y: 2 },
        { x: 4, y: 5 }, { x: 4, y: 6 },
        { x: 3, y: 4 }, { x: 2, y: 4 },
        { x: 5, y: 4 }, { x: 6, y: 4 },
      ]),
    );
  });

  it('s’arrête sur les murs', () => {
    const cells = getExplosionCells(state, { x: 1, y: 1, range: 5, piercing: false });

    assert.ok(cells.every(({ x, y }) => getTile(state, x, y) !== TILE.WALL));
    assert.equal(cells.length, 1 + 5 + 5);
  });

  it('touche un obstacle mais s’arrête dessus', () => {
    const obstacles = createStartedGame({ layout: ['#######', '#..oo.#', '#.....#', '#######'] });
    const cells = getExplosionCells(obstacles, { x: 1, y: 1, range: 4, piercing: false });
    const row = cells.filter((cell) => cell.y === 1).map((cell) => cell.x).sort();

    assert.deepEqual(row, [1, 2, 3]);
  });

  it('traverse les obstacles avec des flammes perforantes', () => {
    const obstacles = createStartedGame({ layout: ['#######', '#..oo.#', '#.....#', '#######'] });
    const cells = getExplosionCells(obstacles, { x: 1, y: 1, range: 4, piercing: true });
    const row = cells.filter((cell) => cell.y === 1).map((cell) => cell.x).sort();

    assert.deepEqual(row, [1, 2, 3, 4, 5]);
  });
});

describe('explosions', () => {
  it('explose à la fin de la mèche et laisse des flammes', () => {
    let state = placeBomb(createStartedGame(), 'p1');
    state = advance(state, FUSE - 50);
    assert.equal(state.bombs.length, 1);

    state = tick(state, 50);
    const [event] = eventsOfType(state, 'bombExploded');
    assert.equal(state.bombs.length, 0);
    assert.equal(event.ownerId, 'p1');
    assert.deepEqual(sortCells(state.flames), sortCells(event.cells));
    assert.ok(state.flames.every((flame) => flame.ownerId === 'p1' && flame.expiresAt === FUSE + FLAME));
  });

  it('éteint les flammes après leur durée', () => {
    let state = advance(placeBomb(createStartedGame(), 'p1'), FUSE);
    state = advance(state, FLAME - 50);
    assert.ok(state.flames.length > 0);

    state = tick(state, 50);
    assert.equal(state.flames.length, 0);
  });

  it('déclenche les bombes touchées par une flamme (réaction en chaîne)', () => {
    let state = withStats(createStartedGame(), 'p1', { maxBombs: 2 });
    state = placeBomb(state, 'p1');
    state = tick(setInput(state, 'p1', { direction: 'right' }), 50);
    state = placeBomb(state, 'p1');
    const secondExplodeAt = getBombAt(state, 2, 1).explodeAt;
    assert.ok(secondExplodeAt > FUSE);

    state = advance(state, FUSE - state.time);
    assert.equal(state.time, FUSE);
    assert.equal(state.bombs.length, 0);
    assert.equal(eventsOfType(state, 'bombExploded').length, 2);
  });

  it('détruit les obstacles touchés, dans la grille et dans le décor', () => {
    let state = createStartedGame({ layout: OBSTACLE_LAYOUT, config: { powerUpDropChance: 0 } });
    assert.equal(state.objects.length, 1);

    state = advance(placeBomb(state, 'p1'), FUSE);
    assert.equal(getTile(state, 3, 1), TILE.EMPTY);
    assert.equal(state.objects.length, 0);
    assert.deepEqual(
      eventsOfType(state, 'obstacleDestroyed').map(({ x, y }) => ({ x, y })),
      [{ x: 3, y: 1 }],
    );
    assert.equal(state.powerUps.length, 0);
  });

  it('peut libérer un bonus à la place de l’obstacle', () => {
    let state = createStartedGame({ layout: OBSTACLE_LAYOUT, config: { powerUpDropChance: 1 } });
    state = advance(placeBomb(state, 'p1'), FUSE);

    assert.equal(state.powerUps.length, 1);
    assert.deepEqual({ x: state.powerUps[0].x, y: state.powerUps[0].y }, { x: 3, y: 1 });
    assert.ok(state.powerUps[0].type in POWER_UPS);
  });

  it('brûle les bonus déjà présents dans l’explosion', () => {
    let state = createStartedGame();
    state = { ...state, powerUps: [{ id: 'powerUp-x', type: 'bombUp', x: 3, y: 1 }] };
    state = advance(placeBomb(state, 'p1'), FUSE);

    assert.equal(state.powerUps.length, 0);
  });
});

describe('bonus', () => {
  // Pose un bonus en (2,1) puis fait avancer p1 dessus.
  function collect(type, prepare = (s) => s) {
    let state = prepare(createStartedGame());
    state = { ...state, powerUps: [{ id: 'powerUp-x', type, x: 2, y: 1 }] };
    return tick(setInput(state, 'p1', { direction: 'right' }), 50);
  }

  it('est ramassé en marchant dessus', () => {
    const state = collect('bombUp');

    assert.equal(state.powerUps.length, 0);
    assert.deepEqual(
      eventsOfType(state, 'powerUpCollected').map(({ playerId, powerUpType }) => ({ playerId, powerUpType })),
      [{ playerId: 'p1', powerUpType: 'bombUp' }],
    );
  });

  it('bombUp ajoute une bombe', () => {
    assert.equal(getPlayer(collect('bombUp'), 'p1').stats.maxBombs, 2);
  });

  it('fireUp augmente la portée', () => {
    assert.equal(getPlayer(collect('fireUp'), 'p1').stats.bombRange, 3);
  });

  it('speedUp augmente la vitesse', () => {
    assert.ok(Math.abs(getPlayer(collect('speedUp'), 'p1').stats.speed - 1.2) < 1e-9);
  });

  it('heart rend un coeur sans dépasser le maximum', () => {
    const hurt = collect('heart', (s) => patchPlayer(s, 'p1', { hearts: 1 }));
    assert.equal(getPlayer(hurt, 'p1').hearts, 2);

    const full = collect('heart');
    assert.equal(getPlayer(full, 'p1').hearts, 2);
  });

  it('n’est pas ramassé par un joueur éliminé', () => {
    let state = createStartedGame({ players: 3 });
    state = { ...state, powerUps: [{ id: 'powerUp-x', type: 'bombUp', x: 1, y: 1 }] };
    state = tick(patchPlayer(state, 'p1', { alive: false }), 50);

    assert.equal(state.powerUps.length, 1);
  });
});
