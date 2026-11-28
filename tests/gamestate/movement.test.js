import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CONFIG,
  setInput,
  tick,
  getPlayer,
  getPlayerCell,
  isWalkable,
  removePlayer,
} from '../../src/game/GameState.js';
import { ONE_TILE_MS, createLobby, createStartedGame, advance, placeBomb, patchPlayer } from './helpers.js';

// Distance entre le bord du joueur et le bord de sa case quand il est centré.
const GAP = (1 - DEFAULT_CONFIG.hitboxSize) / 2;

// Les positions sont décimales : on les compare à un millième près.
function assertPosition(state, id, expected) {
  const { x, y } = getPlayer(state, id);
  const close = Math.abs(x - expected.x) < 1e-3 && Math.abs(y - expected.y) < 1e-3;
  assert.ok(close, `position (${x}, ${y}) au lieu de (${expected.x}, ${expected.y})`);
}

function withSpeed(state, id, speed) {
  const { stats } = getPlayer(state, id);
  return patchPlayer(state, id, { stats: { ...stats, speed } });
}


describe('setInput', () => {
  it('enregistre la direction maintenue', () => {
    const state = setInput(createStartedGame(), 'p1', { direction: 'right' });

    assert.equal(getPlayer(state, 'p1').input.direction, 'right');
  });

  it('remplace une direction inconnue par un arrêt', () => {
    let state = setInput(createStartedGame(), 'p1', { direction: 'right' });
    state = setInput(state, 'p1', { direction: 'diagonale' });

    assert.equal(getPlayer(state, 'p1').input.direction, null);
  });

  it('garde la direction si le message ne la précise pas', () => {
    let state = setInput(createStartedGame(), 'p1', { direction: 'down' });
    state = setInput(state, 'p1', { bomb: true });

    assert.equal(getPlayer(state, 'p1').input.direction, 'down');
  });

  it('garde une demande de bombe en attente jusqu’au tick', () => {
    let state = setInput(createStartedGame(), 'p1', { bomb: true });
    state = setInput(state, 'p1', { bomb: false });

    assert.equal(getPlayer(state, 'p1').input.bomb, true);
  });

  it('ignore les entrées hors manche, d’un joueur inconnu ou éliminé', () => {
    const lobby = createLobby();
    assert.equal(setInput(lobby, 'p1', { direction: 'right' }), lobby);

    const started = createStartedGame({ players: 3 });
    assert.equal(setInput(started, 'inconnu', { direction: 'right' }), started);

    const left = removePlayer(started, 'p1');
    assert.equal(setInput(left, 'p1', { direction: 'right' }), left);
  });
});


describe('déplacements', () => {
  it('avance en continu, proportionnellement au temps écoulé', () => {
    const state = tick(setInput(createStartedGame(), 'p1', { direction: 'right' }), 50);

    assertPosition(state, 'p1', { x: 1 + DEFAULT_CONFIG.baseSpeed * 0.05, y: 1 });
    assert.equal(getPlayer(state, 'p1').facing, 'right');
    assert.equal(getPlayer(state, 'p1').moving, true);
  });

  it('parcourt une case en 1 / baseSpeed seconde', () => {
    const state = advance(setInput(createStartedGame(), 'p1', { direction: 'right' }), ONE_TILE_MS);

    assertPosition(state, 'p1', { x: 2, y: 1 });
  });

  it('peut s’arrêter entre deux cases', () => {
    let state = advance(setInput(createStartedGame(), 'p1', { direction: 'right' }), ONE_TILE_MS * 1.5);
    state = setInput(state, 'p1', { direction: null });
    state = advance(state, 1000);

    assertPosition(state, 'p1', { x: 2.5, y: 1 });
    assert.equal(getPlayer(state, 'p1').moving, false);
  });

  it('est bloqué par les murs au contact, mais se tourne quand même', () => {
    const state = advance(setInput(createStartedGame(), 'p1', { direction: 'up' }), 500);

    assertPosition(state, 'p1', { x: 1, y: 1 - GAP });
    assert.equal(getPlayer(state, 'p1').facing, 'up');
    assert.equal(getPlayer(state, 'p1').moving, false);
  });

  it('est bloqué par les obstacles', () => {
    const layout = ['#######', '#.o...#', '#.....#', '#.....#', '#######'];
    const state = advance(setInput(createStartedGame({ layout }), 'p1', { direction: 'right' }), 500);

    assertPosition(state, 'p1', { x: 1 + GAP, y: 1 });
  });

  it('ne traverse pas un mur, même très vite sur un long tick', () => {
    const state = tick(setInput(withSpeed(createStartedGame(), 'p1', 100), 'p1', { direction: 'right' }), 1000);

    assertPosition(state, 'p1', { x: 5 + GAP, y: 1 });
  });

  it('peut sortir de sa propre bombe mais pas y revenir', () => {
    let state = placeBomb(createStartedGame(), 'p1');
    state = advance(setInput(state, 'p1', { direction: 'right' }), ONE_TILE_MS);
    assertPosition(state, 'p1', { x: 2, y: 1 });

    state = advance(setInput(state, 'p1', { direction: 'left' }), 400);
    assertPosition(state, 'p1', { x: 1.5 + DEFAULT_CONFIG.hitboxSize / 2, y: 1 });
    assert.deepEqual(getPlayerCell(getPlayer(state, 'p1')), { x: 2, y: 1 });
  });

  it('peut revenir sur sa bombe tant qu’il ne l’a pas quittée', () => {
    let state = placeBomb(createStartedGame(), 'p1');
    state = tick(setInput(state, 'p1', { direction: 'right' }), 50);
    state = advance(setInput(state, 'p1', { direction: 'left' }), 50);

    assertPosition(state, 'p1', { x: 1, y: 1 });
  });

  it('ne bloque pas les joueurs entre eux', () => {
    let state = createStartedGame();
    state = patchPlayer(state, 'p2', { x: 2, y: 1 });
    state = advance(setInput(state, 'p1', { direction: 'right' }), ONE_TILE_MS);

    assertPosition(state, 'p1', { x: 2, y: 1 });
  });

  it('va plus vite avec une vitesse plus élevée', () => {
    let state = withSpeed(createStartedGame(), 'p1', 2);
    state = advance(setInput(state, 'p1', { direction: 'right' }), ONE_TILE_MS / 2);

    assertPosition(state, 'p1', { x: 2, y: 1 });
  });

  it('plafonne la vitesse à maxSpeed', () => {
    let state = withSpeed(createStartedGame(), 'p1', 100);
    state = tick(setInput(state, 'p1', { direction: 'right' }), 100);

    assertPosition(state, 'p1', { x: 1 + DEFAULT_CONFIG.maxSpeed * 0.1, y: 1 });
  });

  it('ne déplace pas un joueur éliminé', () => {
    let state = createStartedGame({ players: 3 });
    state = setInput(state, 'p1', { direction: 'right' });
    state = patchPlayer(state, 'p1', { alive: false });
    state = advance(state, 500);

    assertPosition(state, 'p1', { x: 1, y: 1 });
  });
});

describe('aide aux virages', () => {
  // Des piliers en (2,2) et (4,2) : on ne descend que par les colonnes 1, 3 et 5.
  const layout = ['#######', '#.....#', '#.#.#.#', '#.....#', '#######'];
  const goDown = (x, ms = 400) => {
    const state = patchPlayer(createStartedGame({ layout }), 'p1', { x, y: 1 });
    return advance(setInput(state, 'p1', { direction: 'down' }), ms);
  };

  // Le joueur glisse juste assez pour passer (son corps tient dans l'allée),
  // ici 0,2 case, puis utilise le reste du trajet (1,8 case) pour descendre.
  it('fait glisser vers l’allée la plus proche quand on est un peu décalé', () => {
    assertPosition(goDown(1.3), 'p1', { x: 1 + GAP, y: 2.8 });
  });

  it('fonctionne des deux côtés de l’allée', () => {
    assertPosition(goDown(2.7), 'p1', { x: 3 - GAP, y: 2.8 });
  });

  it('ne glisse pas au-delà de cornerAssist : le joueur reste bloqué au contact', () => {
    const x = 1 + DEFAULT_CONFIG.cornerAssist + 0.05;
    assertPosition(goDown(x), 'p1', { x, y: 1 + GAP });
  });

  it('ne glisse pas vers une allée bouchée', () => {
    // allée la plus proche : colonne 2, bouchée par le pilier
    assertPosition(goDown(2.2), 'p1', { x: 2.2, y: 1 + GAP });
  });
});

describe('case du joueur', () => {
  it('est la case qui contient son centre', () => {
    assert.deepEqual(getPlayerCell({ x: 1.45, y: 2.55 }), { x: 1, y: 3 });
    assert.deepEqual(getPlayerCell({ x: 2, y: 1 }), { x: 2, y: 1 });
  });

  it('reçoit la bombe posée', () => {
    let state = patchPlayer(createStartedGame(), 'p1', { x: 1.6, y: 1.2 });
    state = placeBomb(state, 'p1');

    assert.deepEqual({ x: state.bombs[0].x, y: state.bombs[0].y }, { x: 2, y: 1 });
  });

  it('ramasse un bonus seulement quand le centre entre dans sa case', () => {
    let state = createStartedGame();
    state = { ...state, powerUps: [{ id: 'powerUp-x', type: 'bombUp', x: 2, y: 1 }] };

    const before = tick(patchPlayer(state, 'p1', { x: 1.45 }), 0);
    assert.equal(before.powerUps.length, 1);

    const after = tick(patchPlayer(state, 'p1', { x: 1.55 }), 0);
    assert.equal(after.powerUps.length, 0);
  });

  it('décide si une flamme touche le joueur', () => {
    // bombe en (1,1), portée 2 : flammes jusqu'en x = 3
    const explode = (x) => {
      const state = placeBomb(patchPlayer(createStartedGame(), 'p2', { x, y: 1 }), 'p1');
      return getPlayer(advance(state, DEFAULT_CONFIG.bombFuseMs), 'p2').hearts;
    };

    assert.equal(explode(3.45), 1); // centre en (3,1)
    assert.equal(explode(3.55), 2); // centre en (4,1), même si le corps dépasse sur (3,1)
  });
});

describe('isWalkable', () => {
  it('n’accepte que les rues sans bombe', () => {
    const layout = ['#####', '#.o.#', '#...#', '#####'];
    let state = createStartedGame({ layout });

    assert.equal(isWalkable(state, 1, 1), true);
    assert.equal(isWalkable(state, 0, 0), false);
    assert.equal(isWalkable(state, 2, 1), false);

    state = placeBomb(state, 'p1');
    assert.equal(isWalkable(state, 1, 1), false);
  });
});
