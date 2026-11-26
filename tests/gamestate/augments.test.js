import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PHASE,
  AUGMENTS,
  BASE_STATS,
  DEFAULT_CONFIG,
  computeStats,
  getAugmentCatalog,
  chooseAugment,
  removePlayer,
  getPlayer,
  setInput,
  tick,
} from '../../src/game/GameState.js';
import { createStartedGame, createLobby, advance, patchPlayer, eventsOfType } from './helpers.js';

// Termine la première manche au temps imparti : on arrive en phase augment.
function augmentPhase({ players = 2, prepare = (s) => s } = {}) {
  const state = prepare(createStartedGame({ players, config: { roundDurationMs: 100 } }));
  return advance(state, 100);
}

// Chaque joueur connecté choisit le premier augment proposé.
function everyoneChoosesFirst(state) {
  let current = state;
  for (const player of state.players) {
    if (player.augmentOffer.length > 0) current = chooseAugment(current, player.id, player.augmentOffer[0]);
  }
  return current;
}

describe('computeStats', () => {
  it('retourne les statistiques de base sans augment', () => {
    assert.deepEqual(computeStats([]), BASE_STATS);
  });

  it('applique les effets des augments', () => {
    const stats = computeStats(['vitality', 'pyromaniac', 'piercingFlames']);

    assert.equal(stats.maxHearts, BASE_STATS.maxHearts + 1);
    assert.equal(stats.bombRange, BASE_STATS.bombRange + 1);
    assert.equal(stats.piercing, true);
  });

  it('cumule un augment cumulable pris plusieurs fois', () => {
    assert.equal(computeStats(['stockpile', 'stockpile', 'stockpile']).maxBombs, BASE_STATS.maxBombs + 3);
  });

  it('donne le même résultat quel que soit l’ordre des augments', () => {
    const ids = ['shortFuse', 'bigBang', 'colossus', 'sprinter', 'glassCannon'];
    const reference = computeStats(ids);

    assert.deepEqual(computeStats([...ids].reverse()), reference);
    assert.deepEqual(computeStats([ids[2], ids[0], ids[4], ids[1], ids[3]]), reference);
  });

  it('garde au moins un coeur', () => {
    assert.equal(computeStats(['glassCannon', 'glassCannon', 'glassCannon']).maxHearts, 1);
  });

  it('garde une vitesse minimale', () => {
    const stats = computeStats(['colossus', 'heavyArsenal', 'colossus', 'heavyArsenal']);

    assert.equal(stats.speed, 0.4);
  });
});

describe('getAugmentCatalog', () => {
  it('décrit tous les augments sans leurs fonctions', () => {
    const catalog = getAugmentCatalog();

    assert.deepEqual(catalog.map((augment) => augment.id), Object.keys(AUGMENTS));
    for (const augment of catalog) {
      assert.deepEqual(Object.keys(augment).sort(), ['description', 'id', 'name', 'tier']);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(catalog)), catalog);
  });
});

describe('offre d’augments', () => {
  it('propose des augments différents à chaque joueur connecté', () => {
    const state = augmentPhase({ players: 3 });

    assert.equal(state.phase, PHASE.AUGMENT);
    for (const player of state.players) {
      assert.equal(player.augmentOffer.length, DEFAULT_CONFIG.augmentChoices);
      assert.equal(new Set(player.augmentOffer).size, player.augmentOffer.length);
      assert.ok(player.augmentOffer.every((id) => id in AUGMENTS));
    }
  });

  it('ne propose pas un augment non cumulable déjà possédé', () => {
    const nonStackable = Object.keys(AUGMENTS).filter((id) => !AUGMENTS[id].stackable);
    const state = augmentPhase({ prepare: (s) => patchPlayer(s, 'p1', { augments: nonStackable }) });

    assert.ok(getPlayer(state, 'p1').augmentOffer.every((id) => AUGMENTS[id].stackable));
  });

  it('ne propose rien à un joueur déconnecté', () => {
    const state = augmentPhase({ players: 3, prepare: (s) => removePlayer(s, 'p3') });

    assert.deepEqual(getPlayer(state, 'p3').augmentOffer, []);
  });
});

describe('chooseAugment', () => {
  it('enregistre l’augment choisi', () => {
    const before = augmentPhase({ players: 3 });
    const choice = getPlayer(before, 'p1').augmentOffer[1];
    const state = chooseAugment(before, 'p1', choice);

    assert.deepEqual(getPlayer(state, 'p1').augments, [choice]);
    assert.deepEqual(getPlayer(state, 'p1').augmentOffer, []);
    assert.ok(eventsOfType(state, 'augmentChosen').some((e) => e.playerId === 'p1' && e.augmentId === choice));
    assert.equal(state.phase, PHASE.AUGMENT);
  });

  it('refuse un augment qui n’a pas été proposé', () => {
    const state = augmentPhase();
    const notOffered = Object.keys(AUGMENTS).find((id) => !getPlayer(state, 'p1').augmentOffer.includes(id));

    assert.equal(chooseAugment(state, 'p1', notOffered), state);
    assert.equal(chooseAugment(state, 'p1', 'inconnu'), state);
  });

  it('refuse un choix hors de la phase augment ou d’un joueur inconnu', () => {
    const lobby = createLobby();
    assert.equal(chooseAugment(lobby, 'p1', 'vitality'), lobby);

    const state = augmentPhase();
    assert.equal(chooseAugment(state, 'inconnu', 'vitality'), state);
  });

  it('refuse un deuxième choix du même joueur', () => {
    const before = augmentPhase({ players: 3 });
    const [first, second] = getPlayer(before, 'p1').augmentOffer;
    const state = chooseAugment(before, 'p1', first);

    assert.equal(chooseAugment(state, 'p1', second), state);
  });
});

describe('manche suivante', () => {
  it('démarre quand tous les joueurs ont choisi', () => {
    const state = everyoneChoosesFirst(augmentPhase());

    assert.equal(state.phase, PHASE.PLAYING);
    assert.equal(state.round, 2);
    assert.ok(eventsOfType(state, 'roundStarted').some((e) => e.round === 2));
  });

  it('n’attend pas les joueurs déconnectés', () => {
    let state = augmentPhase({ players: 3 });
    state = chooseAugment(state, 'p1', getPlayer(state, 'p1').augmentOffer[0]);
    state = chooseAugment(state, 'p2', getPlayer(state, 'p2').augmentOffer[0]);
    assert.equal(state.phase, PHASE.AUGMENT);

    state = removePlayer(state, 'p3');
    assert.equal(state.phase, PHASE.PLAYING);
    assert.equal(getPlayer(state, 'p3').alive, false);
    assert.equal(getPlayer(state, 'p3').inRound, false);
  });

  it('applique les augments aux statistiques de la nouvelle manche', () => {
    let state = augmentPhase();
    state = patchPlayer(state, 'p1', { augmentOffer: ['vitality'] });
    state = chooseAugment(state, 'p1', 'vitality');
    state = chooseAugment(state, 'p2', getPlayer(state, 'p2').augmentOffer[0]);
    const p1 = getPlayer(state, 'p1');

    assert.deepEqual(p1.stats, computeStats(['vitality']));
    assert.equal(p1.hearts, BASE_STATS.maxHearts + 1);
  });

  it('remet à zéro les bonus de manche, les positions et les coeurs', () => {
    let state = createStartedGame({ config: { roundDurationMs: 300 } });
    const stats = getPlayer(state, 'p1').stats;
    state = patchPlayer(state, 'p1', { hearts: 1, stats: { ...stats, maxBombs: 5 } });
    state = tick(setInput(state, 'p1', { direction: 'right' }), 50);
    state = advance(state, 250);
    assert.equal(state.phase, PHASE.AUGMENT);

    state = everyoneChoosesFirst(state);
    const p1 = getPlayer(state, 'p1');
    assert.deepEqual({ x: p1.x, y: p1.y }, { x: 1, y: 1 });
    assert.deepEqual(p1.stats, computeStats(p1.augments));
    assert.equal(p1.hearts, p1.stats.maxHearts);
    assert.deepEqual(p1.input, { direction: null, bomb: false });
  });

  it('conserve les scores d’une manche à l’autre', () => {
    const state = everyoneChoosesFirst(augmentPhase());

    assert.ok(state.players.every((player) => player.score === 1));
  });
});
