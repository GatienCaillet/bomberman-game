import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PHASE,
  DEFAULT_CONFIG,
  BASE_STATS,
  createGame,
  addPlayer,
  removePlayer,
  startGame,
  getPlayer,
  clearEvents,
} from '../../src/game/GameState.js';
import { createLobby, OPEN_LAYOUT } from './helpers.js';

describe('createGame', () => {
  it('crée une partie vide en phase lobby avec la configuration par défaut', () => {
    const state = createGame();

    assert.equal(state.phase, PHASE.LOBBY);
    assert.deepEqual(state.config, DEFAULT_CONFIG);
    assert.equal(state.round, 0);
    assert.equal(state.time, 0);
    assert.deepEqual(state.players, []);
    assert.deepEqual(state.bombs, []);
    assert.deepEqual(state.events, []);
    assert.equal(state.winnerId, null);
  });

  it('fusionne la configuration fournie avec les valeurs par défaut', () => {
    const state = createGame({ config: { totalRounds: 5, bombFuseMs: 1000 } });

    assert.equal(state.config.totalRounds, 5);
    assert.equal(state.config.bombFuseMs, 1000);
    assert.equal(state.config.width, DEFAULT_CONFIG.width);
  });

  it('déduit la taille de la carte d’un plan texte', () => {
    const state = createGame({ layout: OPEN_LAYOUT, config: { width: 99, height: 99 } });

    assert.equal(state.config.width, 7);
    assert.equal(state.config.height, 5);
  });

  it('conserve la graine fournie', () => {
    assert.equal(createGame({ seed: 42 }).seed, 42);
  });
});

describe('addPlayer', () => {
  it('ajoute un joueur avec les statistiques de base', () => {
    const state = addPlayer(createGame(), { id: 'a', name: 'Alice' });
    const player = getPlayer(state, 'a');

    assert.equal(state.players.length, 1);
    assert.equal(player.name, 'Alice');
    assert.equal(player.connected, true);
    assert.equal(player.alive, false);
    assert.deepEqual(player.stats, BASE_STATS);
    assert.equal(player.hearts, BASE_STATS.maxHearts);
    assert.equal(player.score, 0);
    assert.deepEqual(player.augments, []);
  });

  it('donne un nom par défaut si aucun nom n’est fourni', () => {
    let state = addPlayer(createGame(), { id: 'a' });
    state = addPlayer(state, { id: 'b', name: '' });

    assert.equal(getPlayer(state, 'a').name, 'Joueur 1');
    assert.equal(getPlayer(state, 'b').name, 'Joueur 2');
  });

  it('refuse un identifiant invalide ou déjà utilisé', () => {
    const state = addPlayer(createGame(), { id: 'a' });

    assert.equal(addPlayer(state, { id: 'a' }), state);
    assert.equal(addPlayer(state, { id: '' }), state);
    assert.equal(addPlayer(state, { id: 42 }), state);
    assert.equal(addPlayer(state), state);
  });

  it('refuse un joueur au-delà du maximum', () => {
    const full = createLobby({ players: 4 });

    assert.equal(full.players.length, DEFAULT_CONFIG.maxPlayers);
    assert.equal(addPlayer(full, { id: 'p5' }), full);
  });

  it('refuse un joueur une fois la partie démarrée', () => {
    const started = startGame(createLobby());

    assert.equal(addPlayer(started, { id: 'late' }), started);
  });

  it('ne modifie pas l’état reçu', () => {
    const state = createGame();
    addPlayer(state, { id: 'a' });

    assert.deepEqual(state.players, []);
  });
});

describe('removePlayer', () => {
  it('retire le joueur pendant le lobby', () => {
    const state = removePlayer(createLobby(), 'p1');

    assert.deepEqual(state.players.map((player) => player.id), ['p2']);
  });

  it('ignore un joueur inconnu', () => {
    const state = createLobby();

    assert.equal(removePlayer(state, 'inconnu'), state);
  });

  it('garde le joueur en partie, déconnecté et éliminé', () => {
    const started = startGame(createLobby({ players: 3 }));
    const state = removePlayer(started, 'p1');
    const player = getPlayer(state, 'p1');

    assert.equal(state.players.length, 3);
    assert.equal(player.connected, false);
    assert.equal(player.alive, false);
    assert.equal(player.eliminatedAt, state.time);
    assert.ok(state.events.some((event) => event.type === 'playerLeft' && event.playerId === 'p1'));
  });
});

describe('startGame', () => {
  it('refuse de démarrer avec moins de joueurs que le minimum', () => {
    const state = createLobby({ players: 1 });

    assert.equal(startGame(state), state);
  });

  it('démarre la première manche', () => {
    const state = startGame(createLobby());

    assert.equal(state.phase, PHASE.PLAYING);
    assert.equal(state.round, 1);
    assert.equal(state.roundEndsAt, state.config.roundDurationMs);
    assert.ok(state.players.every((player) => player.alive && player.inRound));
    assert.ok(state.events.some((event) => event.type === 'roundStarted' && event.round === 1));
  });

  it('place les joueurs sur les points de départ', () => {
    const state = startGame(createLobby({ players: 4 }));
    const positions = state.players.map(({ x, y }) => ({ x, y }));

    assert.deepEqual(positions, [
      { x: 1, y: 1 },
      { x: 5, y: 3 },
      { x: 5, y: 1 },
      { x: 1, y: 3 },
    ]);
  });

  it('ne démarre pas une partie déjà en cours', () => {
    const state = startGame(createLobby());

    assert.equal(startGame(state), state);
  });
});

describe('clearEvents', () => {
  it('vide la liste des événements', () => {
    const state = startGame(createLobby());

    assert.ok(state.events.length > 0);
    assert.deepEqual(clearEvents(state).events, []);
  });

  it('retourne le même état s’il n’y a aucun événement', () => {
    const state = createGame();

    assert.equal(clearEvents(state), state);
  });
});
