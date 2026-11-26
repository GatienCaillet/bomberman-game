import { io } from '/socket.io/socket.io.esm.min.js';

export class NetworkClient {
  constructor(url) {
    this.socket = io(url);
    this.playerId = null;
    this.roomCode = null;
    //id -> nom/description des augments pour l'UI
    this.augmentCatalog = [];
    //dernier snapshot reçu pour le rendu
    this.state = null;

    //callbacks a assigner
    //(snapshot) a chaque broadcast
    this.onState = () => {};
    //(event) pour chaque événement donc sons/animations
    this.onEvent = () => {};
    //('connected' | 'disconnected')
    this.onStatus = () => {};

    this.socket.on('state', (snapshot) => {
      this.state = snapshot;
      this.onState(snapshot);
      for (const event of snapshot.game.events) this.onEvent(event);
    });

    this.socket.on('connect', () => this.onStatus('connected'));
    this.socket.on('disconnect', () => {
    //si déconnecté c'est retour au menu (pour l'instant)
      this.playerId = null;
      this.roomCode = null;
      this.state = null;
      this.onStatus('disconnected');
    });

    this.lastDirection = null;
  }

  //envoie une requête et attend la réponse ack sous forme de promise
  #request(event, payload) {
    return new Promise((resolve, reject) => {
      this.socket.timeout(5000).emit(event, payload, (err, res) => {
        if (err) return reject(new Error('Serveur injoignable'));
        if (!res.ok) return reject(new Error(res.error));
        resolve(res);
      });
    });
  }

  //créer une room
  async createRoom(name, totalRounds) {
    return this.#enter(await this.#request('room:create', { name, totalRounds }));
  }

  //rejoindre une room
  async joinRoom(code, name) {
    return this.#enter(await this.#request('room:join', { code, name }));
  }

  #enter(res) {
    this.playerId = res.playerId;
    this.roomCode = res.code;
    this.augmentCatalog = res.augments;
    return res;
  }

  startGame() { return this.#request('room:start'); }
  leaveRoom() { this.socket.emit('room:leave'); this.roomCode = null; this.state = null; }

  //direction: up/down/left/right/null (< null = on s'arrête)
  //le serveur retient la direction maintenue et on n'envoie que ce qui change
  sendDirection(direction) {
    if (direction === this.lastDirection) return;
    this.lastDirection = direction;
    this.socket.emit('game:input', { direction });
  }

  //poser une bombe
  placeBomb() { this.socket.emit('game:input', { bomb: true }); }
  //choisir un augment
  chooseAugment(augmentId) { this.socket.emit('game:augment', augmentId); }

  //latence en ms
  ping() {
    const t0 = performance.now();
    return new Promise((resolve) => this.socket.emit('net:ping', () => resolve(performance.now() - t0)));
  }
}