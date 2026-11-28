import {
  PHASE, createGame, addPlayer, removePlayer, startGame, setInput,
  chooseAugment, tick, clearEvents, getAugmentCatalog,
} from '../game/GameState.js';

//ticks par ms
const TICK_MS = 50;
//delta
const MAX_DT_MS = 250;
//chars possibles pour le code de la room
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export class RoomManager {
  constructor(io) {
    this.io = io;
    //code -> room
    this.rooms = new Map();
    //socket.id -> code (retrouver le salon d'un joueur)
    this.socketToRoom = new Map();
  }

  // ---------- SALONS ---------------------------------------------------------------------------------------

  createRoom(socket, { name, totalRounds } = {}) {
    if (this.socketToRoom.has(socket.id)) return { ok: false, error: 'Déjà dans un salon' };

    const rounds = Number.isInteger(totalRounds) ? Math.min(Math.max(totalRounds, 1), 10) : 3;
    const code = this.generateCode();
    this.rooms.set(code, {
      code,
      hostId: socket.id,
      state: createGame({ seed: Date.now(), config: { totalRounds: rounds } }),
      timer: null,
      lastTickAt: 0,
    });
    return this.joinRoom(socket, { code, name });
  }

  joinRoom(socket, { code, name } = {}) {
    if (this.socketToRoom.has(socket.id)) return { ok: false, error: 'Déjà dans un salon' };

    const room = this.rooms.get(String(code ?? '').trim().toUpperCase());
    if (!room) return { ok: false, error: 'Salon introuvable' };
    if (room.state.phase !== PHASE.LOBBY) return { ok: false, error: 'Partie déjà commencée' };
    if (room.state.players.length >= room.state.config.maxPlayers) return { ok: false, error: 'Salon plein' };

    room.state = addPlayer(room.state, { id: socket.id, name: String(name ?? '').slice(0, 16) });
    socket.join(room.code);
    this.socketToRoom.set(socket.id, room.code);
    this.publish(room);

    return { ok: true, code: room.code, playerId: socket.id, augments: getAugmentCatalog() };
  }

  leave(socket) {
    const room = this.getRoomOf(socket);
    if (!room) return;

    this.socketToRoom.delete(socket.id);
    socket.leave(room.code);
    //en lobby le joueur disparait, en partie il est marqué déconnecté et éliminé
    //(c'est gamestate qui décide)
    room.state = removePlayer(room.state, socket.id);

    if (room.state.players.every((p) => !p.connected)) return this.destroy(room);

    if (room.hostId === socket.id) {
      room.hostId = room.state.players.find((p) => p.connected).id; // passage de l'hôte
    }
    this.publish(room);
  }

  destroy(room) {
    this.stopLoop(room);
    this.rooms.delete(room.code);
  }

  // ----------ACTIONS DE JEU----------------------------------------------------------------------------------

  startGame(socket) {
    const room = this.getRoomOf(socket);
    if (!room) return { ok: false, error: 'Pas dans un salon' };
    if (room.hostId !== socket.id) return { ok: false, error: "Seul l'hôte peut lancer" };

    const next = startGame(room.state);
    //vu que GameState renvoie le mm objet s'il refuse
    if (next === room.state) return { ok: false, error: '2 joueurs min' };

    room.state = next;
    this.startLoop(room);
    return { ok: true };
  }

  handleInput(socket, input) {
    const room = this.getRoomOf(socket);
    //on vérifie qd même la forme avant de passer tout ça au GameState
    if (!room || typeof input !== 'object' || input === null) return;
    room.state = setInput(room.state, socket.id, input);
    //on diffuse au prochain tick
  }

  handleAugment(socket, augmentId) {
    const room = this.getRoomOf(socket);
    if (!room || typeof augmentId !== 'string') return;
    room.state = chooseAugment(room.state, socket.id, augmentId);
  }

  // ----------BOUCLE DE JEU-------------------------------------------------------------------------------------

  startLoop(room) {
    room.lastTickAt = Date.now();
    room.timer = setInterval(() => {
      //on mesure le temps écoulé & on le passe a tick()
      //sinon si le serv a été bloqué un instant, on risque un saut
      const now = Date.now();
      const dt = Math.min(now - room.lastTickAt, MAX_DT_MS);
      room.lastTickAt = now;

      room.state = tick(room.state, dt);
      this.publish(room);
    }, TICK_MS);
  }

  stopLoop(room) {
    clearInterval(room.timer);
    room.timer = null;
  }

  //on diffuse l'état a tout le monde
  publish(room) {
    const { seed, layout, ...game } = room.state;
    this.io.to(room.code).emit('state', { code: room.code, hostId: room.hostId, game });
    //et on vide les évènements
    room.state = clearEvents(room.state);

    //si on est en phase de game over alors.......
    if (room.state.phase === PHASE.GAME_OVER) this.stopLoop(room);
  }

  // ----------UTILITAIRES ROOM------------------------------------------------------------------

  getRoomOf(socket) {
    return this.rooms.get(this.socketToRoom.get(socket.id));
  }

  generateCode() {
    let code;
    do {
      code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }
}