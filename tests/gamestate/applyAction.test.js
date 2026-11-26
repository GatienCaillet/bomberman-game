import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PHASE,
  createGame,
  applyAction,
  getPlayer,
  getResults,
} from '../../src/game/GameState.js';
import { OPEN_LAYOUT } from './helpers.js';

// Gèle récursivement un objet : toute modification lèverait une erreur.
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function run(state, actions) {
  return actions.reduce(applyAction, state);
}

describe('applyAction', () => {
  const lobby = () => createGame({ layout: OPEN_LAYOUT });

  it('ajoute et retire des joueurs', () => {
    let state = run(lobby(), [
      { type: 'join', playerId: 'a', name: 'Alice' },
      { type: 'join', playerId: 'b', name: 'Bob' },
    ]);
    assert.deepEqual(state.players.map((p) => p.name), ['Alice', 'Bob']);

    state = applyAction(state, { type: 'leave', playerId: 'a' });
    assert.deepEqual(state.players.map((p) => p.id), ['b']);
  });

  it('démarre la partie, transmet les entrées et fait avancer le temps', () => {
    const state = run(lobby(), [
      { type: 'join', playerId: 'a' },
      { type: 'join', playerId: 'b' },
      { type: 'start' },
      { type: 'input', playerId: 'a', input: { direction: 'right' } },
      { type: 'tick', deltaMs: 50 },
    ]);

    assert.equal(state.phase, PHASE.PLAYING);
    assert.equal(state.time, 50);
    assert.equal(getPlayer(state, 'a').x, 2);
  });

  it('transmet le choix d’un augment', () => {
    let state = run(createGame({ layout: OPEN_LAYOUT, config: { roundDurationMs: 50 } }), [
      { type: 'join', playerId: 'a' },
      { type: 'join', playerId: 'b' },
      { type: 'start' },
      { type: 'tick', deltaMs: 50 },
    ]);
    const choice = getPlayer(state, 'a').augmentOffer[0];
    state = applyAction(state, { type: 'chooseAugment', playerId: 'a', augmentId: choice });

    assert.deepEqual(getPlayer(state, 'a').augments, [choice]);
  });

  it('ignore les actions inconnues ou absentes', () => {
    const state = lobby();

    assert.equal(applyAction(state, { type: 'hack' }), state);
    assert.equal(applyAction(state, {}), state);
    assert.equal(applyAction(state), state);
  });
});

describe('fonctions pures', () => {
  it('ne modifie jamais l’état reçu', () => {
    let state = deepFreeze(createGame({ layout: OPEN_LAYOUT, config: { roundDurationMs: 3000 } }));
    const actions = [
      { type: 'join', playerId: 'a' },
      { type: 'join', playerId: 'b' },
      { type: 'start' },
      { type: 'input', playerId: 'a', input: { direction: 'right', bomb: true } },
      ...Array.from({ length: 70 }, () => ({ type: 'tick', deltaMs: 50 })),
    ];

    // Si une action modifiait l'état gelé, une TypeError serait levée.
    for (const action of actions) state = deepFreeze(applyAction(state, action));
    assert.equal(state.phase, PHASE.AUGMENT);
  });

  it('produit exactement le même déroulé pour la même graine', () => {
    const play = () =>
      run(createGame({ seed: 2024, config: { totalRounds: 1, roundDurationMs: 2000 } }), [
        { type: 'join', playerId: 'a' },
        { type: 'join', playerId: 'b' },
        { type: 'start' },
        { type: 'input', playerId: 'a', input: { direction: 'right', bomb: true } },
        ...Array.from({ length: 40 }, () => ({ type: 'tick', deltaMs: 50 })),
      ]);

    assert.deepEqual(play(), play());
  });
});

describe('partie complète', () => {
  it('enchaîne les manches jusqu’à la fin de la partie', () => {
    let state = run(createGame({ layout: OPEN_LAYOUT, config: { totalRounds: 3, roundDurationMs: 100 } }), [
      { type: 'join', playerId: 'a' },
      { type: 'join', playerId: 'b' },
      { type: 'start' },
    ]);

    for (let round = 1; round <= 3; round += 1) {
      assert.equal(state.round, round);
      state = run(state, [{ type: 'tick', deltaMs: 50 }, { type: 'tick', deltaMs: 50 }]);
      if (round < 3) {
        assert.equal(state.phase, PHASE.AUGMENT);
        for (const player of state.players) {
          state = applyAction(state, { type: 'chooseAugment', playerId: player.id, augmentId: player.augmentOffer[0] });
        }
      }
    }

    assert.equal(state.phase, PHASE.GAME_OVER);
    assert.ok(state.players.every((player) => player.augments.length === 2 && player.score === 3));
    assert.equal(state.winnerId, getResults(state)[0].id);
    assert.equal(state.events.filter((event) => event.type === 'gameOver').length, 1);
  });
});
