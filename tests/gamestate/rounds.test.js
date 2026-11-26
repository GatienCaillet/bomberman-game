import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PHASE,
  DEFAULT_CONFIG,
  createGame,
  tick,
  getPlayer,
  removePlayer,
  getResults,
  getRoundRanking,
} from '../../src/game/GameState.js';
import { createStartedGame, advance, placeBomb, patchPlayer, eventsOfType } from './helpers.js';

const FUSE = DEFAULT_CONFIG.bombFuseMs;
const INVINCIBILITY = DEFAULT_CONFIG.invincibilityMs;

// p2 est placé dans le rayon de la bombe que p1 pose en (1,1).
function bombNextTo(victimId, { players = 2, hearts = 2, config = {} } = {}) {
  let state = createStartedGame({ players, config });
  state = patchPlayer(state, victimId, { x: 3, y: 1, hearts });
  return placeBomb(state, 'p1');
}

describe('dégâts et coeurs', () => {
  it('retire un coeur et rend le joueur invincible un court instant', () => {
    const state = advance(bombNextTo('p2'), FUSE);
    const p2 = getPlayer(state, 'p2');

    assert.equal(p2.hearts, 1);
    assert.equal(p2.alive, true);
    assert.equal(p2.invincibleUntil, FUSE + INVINCIBILITY);
    assert.ok(eventsOfType(state, 'playerHit').some((e) => e.playerId === 'p2' && e.attackerId === 'p1' && e.hearts === 1));
  });

  it('ne touche pas deux fois un joueur invincible', () => {
    const state = advance(bombNextTo('p2'), FUSE + DEFAULT_CONFIG.flameDurationMs);

    assert.equal(getPlayer(state, 'p2').hearts, 1);
    assert.equal(eventsOfType(state, 'playerHit').filter((e) => e.playerId === 'p2').length, 1);
  });

  it('touche de nouveau un joueur dont l’invincibilité est terminée', () => {
    let state = advance(bombNextTo('p2', { players: 3 }), FUSE);
    state = patchPlayer(state, 'p2', { invincibleUntil: state.time });
    state = tick(state, 50);

    assert.equal(getPlayer(state, 'p2').alive, false);
  });

  it('élimine le joueur à son dernier coeur et crédite le tueur', () => {
    const state = advance(bombNextTo('p2', { players: 3, hearts: 1 }), FUSE);
    const p2 = getPlayer(state, 'p2');

    assert.equal(p2.alive, false);
    assert.equal(p2.hearts, 0);
    assert.equal(p2.eliminatedAt, FUSE);
    assert.equal(p2.deaths, 1);
    assert.equal(getPlayer(state, 'p1').kills, 1);
    assert.ok(eventsOfType(state, 'playerDied').some((e) => e.playerId === 'p2' && e.killerId === 'p1'));
  });

  it('ne compte pas une élimination par sa propre bombe comme un kill', () => {
    let state = createStartedGame({ players: 3 });
    state = placeBomb(patchPlayer(state, 'p1', { hearts: 1 }), 'p1');
    state = advance(state, FUSE);
    const p1 = getPlayer(state, 'p1');

    assert.equal(p1.alive, false);
    assert.equal(p1.deaths, 1);
    assert.equal(p1.kills, 0);
  });
});

describe('fin de manche', () => {
  it('termine la manche quand il ne reste qu’un survivant', () => {
    const state = advance(bombNextTo('p2', { hearts: 1 }), FUSE);
    const [event] = eventsOfType(state, 'roundEnded');

    assert.equal(state.phase, PHASE.AUGMENT);
    assert.equal(event.round, 1);
    assert.equal(event.winnerId, 'p1');
    assert.equal(getPlayer(state, 'p1').roundWins, 1);
    assert.deepEqual(state.bombs, []);
  });

  it('distribue les points selon l’ordre d’élimination', () => {
    const state = advance(bombNextTo('p2', { hearts: 1 }), FUSE);

    // p2 éliminé en premier : 1 point. p1 : 2 points + 1 de victoire.
    assert.equal(getPlayer(state, 'p2').score, 1);
    assert.equal(getPlayer(state, 'p1').score, 3);
  });

  it('déclare la manche nulle quand le temps est écoulé', () => {
    let state = createStartedGame({ config: { roundDurationMs: 1000 } });
    state = advance(state, 950);
    assert.equal(state.phase, PHASE.PLAYING);

    state = tick(state, 50);
    const [event] = eventsOfType(state, 'roundEnded');
    assert.equal(event.winnerId, null);
    assert.ok(state.players.every((player) => player.score === 1 && player.roundWins === 0));
  });

  it('termine la manche quand un joueur quitte et qu’il n’en reste qu’un', () => {
    const state = removePlayer(createStartedGame(), 'p2');

    assert.equal(eventsOfType(state, 'roundEnded')[0].winnerId, 'p1');
  });

  it('termine la partie après la dernière manche', () => {
    const state = advance(bombNextTo('p2', { hearts: 1, config: { totalRounds: 1 } }), FUSE);
    const [event] = eventsOfType(state, 'gameOver');

    assert.equal(state.phase, PHASE.GAME_OVER);
    assert.equal(state.winnerId, 'p1');
    assert.equal(event.winnerId, 'p1');
    assert.deepEqual(event.results.map((result) => result.id), ['p1', 'p2']);
  });

  it('termine la partie s’il reste moins de deux joueurs connectés', () => {
    const state = removePlayer(createStartedGame(), 'p2');

    assert.equal(state.phase, PHASE.GAME_OVER);
    assert.equal(state.winnerId, 'p1');
  });

  it('n’avance plus le temps une fois la manche terminée', () => {
    const state = removePlayer(createStartedGame(), 'p2');

    assert.equal(tick(state, 50), state);
  });
});

describe('tick', () => {
  it('fait avancer le temps de la partie', () => {
    assert.equal(tick(createStartedGame(), 50).time, 50);
  });

  it('ignore une durée négative ou invalide', () => {
    const state = createStartedGame();

    assert.equal(tick(state, -10), state);
    assert.equal(tick(state, Number.NaN), state);
    assert.equal(tick(state, undefined), state);
  });

  it('ne fait rien hors d’une manche', () => {
    const lobby = createGame();

    assert.equal(tick(lobby, 50), lobby);
  });
});

describe('getRoundRanking', () => {
  // État minimal : seuls players et config sont lus.
  const stateWith = (players) => ({
    config: { victoryBonus: 1 },
    players: players.map(([id, eliminatedAt, inRound = true]) => ({ id, eliminatedAt, inRound })),
  });

  it('donne 1, 2, 3 puis 4 + 1 points dans une manche à quatre', () => {
    const ranking = getRoundRanking(
      stateWith([['a', 100], ['b', null], ['c', 300], ['d', 200]]),
      'b',
    );

    assert.deepEqual(ranking, [
      { playerId: 'b', points: 5 },
      { playerId: 'c', points: 3 },
      { playerId: 'd', points: 2 },
      { playerId: 'a', points: 1 },
    ]);
  });

  it('donne autant de points aux joueurs éliminés au même instant', () => {
    const ranking = getRoundRanking(stateWith([['a', 100], ['b', 100], ['c', null]]), 'c');
    const points = Object.fromEntries(ranking.map((r) => [r.playerId, r.points]));

    assert.deepEqual(points, { a: 1, b: 1, c: 4 });
  });

  it('n’ajoute pas de bonus sans vainqueur', () => {
    const ranking = getRoundRanking(stateWith([['a', 100], ['b', null], ['c', null]]), null);
    const points = Object.fromEntries(ranking.map((r) => [r.playerId, r.points]));

    assert.deepEqual(points, { a: 1, b: 2, c: 2 });
  });

  it('ignore les joueurs qui ne participaient pas à la manche', () => {
    const ranking = getRoundRanking(stateWith([['a', null], ['b', 100], ['c', null, false]]), 'a');

    assert.deepEqual(ranking.map((r) => r.playerId).sort(), ['a', 'b']);
  });
});

describe('getResults', () => {
  const player = (id, score, roundWins, kills) => ({
    id, name: id, score, roundWins, kills, deaths: 0, augments: [],
  });

  it('classe par score, puis manches gagnées, puis éliminations', () => {
    const results = getResults({
      winnerId: 'b',
      players: [player('a', 5, 1, 9), player('b', 8, 0, 0), player('c', 5, 2, 0), player('d', 5, 1, 10)],
    });

    assert.deepEqual(results.map((r) => r.id), ['b', 'c', 'd', 'a']);
    assert.deepEqual(results.map((r) => r.isWinner), [true, false, false, false]);
  });

  it('copie la liste des augments', () => {
    const augments = ['vitality'];
    const [result] = getResults({ winnerId: null, players: [{ ...player('a', 0, 0, 0), augments }] });

    assert.deepEqual(result.augments, augments);
    assert.notEqual(result.augments, augments);
  });
});
