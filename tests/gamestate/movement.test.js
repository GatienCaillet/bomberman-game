import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CONFIG,
  setInput,
  tick,
  getPlayer,
  isWalkable,
  removePlayer,
} from '../../src/game/GameState.js';
import { createLobby, createStartedGame, advance, placeBomb, patchPlayer } from './helpers.js';

const position = (state, id) => {
  const { x, y } = getPlayer(state, id);
  return { x, y };
};

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
  it('avance d’une case dans la direction maintenue', () => {
    const state = tick(setInput(createStartedGame(), 'p1', { direction: 'right' }), 50);

    assert.deepEqual(position(state, 'p1'), { x: 2, y: 1 });
    assert.equal(getPlayer(state, 'p1').facing, 'right');
  });

  it('attend le délai de déplacement avant le pas suivant', () => {
    let state = tick(setInput(createStartedGame(), 'p1', { direction: 'right' }), 50);
    state = advance(state, DEFAULT_CONFIG.baseMoveDelayMs - 50);
    assert.deepEqual(position(state, 'p1'), { x: 2, y: 1 });

    state = tick(state, 50);
    assert.deepEqual(position(state, 'p1'), { x: 3, y: 1 });
  });

  it('s’arrête quand la direction est remise à null', () => {
    let state = tick(setInput(createStartedGame(), 'p1', { direction: 'right' }), 50);
    state = setInput(state, 'p1', { direction: null });
    state = advance(state, 1000);

    assert.deepEqual(position(state, 'p1'), { x: 2, y: 1 });
  });

  it('est bloqué par les murs mais se tourne quand même', () => {
    const state = advance(setInput(createStartedGame(), 'p1', { direction: 'up' }), 500);

    assert.deepEqual(position(state, 'p1'), { x: 1, y: 1 });
    assert.equal(getPlayer(state, 'p1').facing, 'up');
  });

  it('est bloqué par les obstacles', () => {
    const layout = ['#######', '#.o...#', '#.....#', '#.....#', '#######'];
    const state = advance(setInput(createStartedGame({ layout }), 'p1', { direction: 'right' }), 500);

    assert.deepEqual(position(state, 'p1'), { x: 1, y: 1 });
  });

  it('peut sortir de sa propre bombe mais pas y revenir', () => {
    let state = placeBomb(createStartedGame(), 'p1');
    state = tick(setInput(state, 'p1', { direction: 'right' }), 50);
    assert.deepEqual(position(state, 'p1'), { x: 2, y: 1 });

    state = advance(setInput(state, 'p1', { direction: 'left' }), 400);
    assert.deepEqual(position(state, 'p1'), { x: 2, y: 1 });
  });

  it('ne bloque pas les joueurs entre eux', () => {
    let state = createStartedGame();
    state = patchPlayer(state, 'p2', { x: 2, y: 1 });
    state = tick(setInput(state, 'p1', { direction: 'right' }), 50);

    assert.deepEqual(position(state, 'p1'), { x: 2, y: 1 });
  });

  it('va plus vite avec une vitesse plus élevée', () => {
    let state = createStartedGame();
    const p1 = getPlayer(state, 'p1');
    state = patchPlayer(state, 'p1', { stats: { ...p1.stats, speed: 2 } });
    state = tick(setInput(state, 'p1', { direction: 'right' }), 50);
    state = advance(state, 100);

    assert.deepEqual(position(state, 'p1'), { x: 3, y: 1 });
  });

  it('plafonne la vitesse avec le délai minimal', () => {
    let state = createStartedGame();
    const p1 = getPlayer(state, 'p1');
    state = patchPlayer(state, 'p1', { stats: { ...p1.stats, speed: 100 } });
    state = tick(setInput(state, 'p1', { direction: 'right' }), 10);

    assert.equal(getPlayer(state, 'p1').nextMoveAt, 10 + DEFAULT_CONFIG.minMoveDelayMs);
  });

  it('ne déplace pas un joueur éliminé', () => {
    let state = createStartedGame({ players: 3 });
    state = setInput(state, 'p1', { direction: 'right' });
    state = patchPlayer(state, 'p1', { alive: false });
    state = advance(state, 500);

    assert.deepEqual(position(state, 'p1'), { x: 1, y: 1 });
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
