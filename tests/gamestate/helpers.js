// Outils partagés par les tests du GameState.
import { createGame, addPlayer, startGame, setInput, tick } from '../../src/game/GameState.js';

// Petite arène ouverte : bords en murs, intérieur 5 × 3 entièrement libre.
// Points de départ : (1,1), (5,3), (5,1), (1,3).
export const OPEN_LAYOUT = Object.freeze([
  '#######',
  '#.....#',
  '#.....#',
  '#.....#',
  '#######',
]);

// Crée une partie et ajoute les joueurs demandés (ids « p1 », « p2 »...).
export function createLobby({ players = 2, layout = OPEN_LAYOUT, config = {}, seed = 1 } = {}) {
  let state = createGame({ seed, layout, config });
  for (let i = 1; i <= players; i += 1) {
    state = addPlayer(state, { id: `p${i}`, name: `Joueur ${i}` });
  }
  return state;
}

// Partie démarrée, prête à être simulée.
export function createStartedGame(options = {}) {
  return startGame(createLobby(options));
}

// Fait avancer la partie de « count » ticks de « deltaMs ».
export function runTicks(state, count, deltaMs = 50) {
  let current = state;
  for (let i = 0; i < count; i += 1) current = tick(current, deltaMs);
  return current;
}

// Fait avancer la partie d'une durée totale, par pas de « step » ms.
export function advance(state, totalMs, step = 50) {
  let current = state;
  let elapsed = 0;
  while (elapsed < totalMs) {
    const delta = Math.min(step, totalMs - elapsed);
    current = tick(current, delta);
    elapsed += delta;
  }
  return current;
}

// Pose une bombe à la position actuelle du joueur (au prochain tick).
export function placeBomb(state, playerId) {
  return tick(setInput(state, playerId, { bomb: true }), 0);
}

// Remplace directement des champs d'un joueur (pour préparer une situation).
export function patchPlayer(state, playerId, changes) {
  const draft = structuredClone(state);
  Object.assign(draft.players.find((player) => player.id === playerId), changes);
  return draft;
}

export function eventsOfType(state, type) {
  return state.events.filter((event) => event.type === type);
}
