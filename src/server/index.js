import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomManager } from './RoomManager.js';

const app = express();
app.use(express.static('public'));
const httpServer = createServer(app);

//client mort après 10s max
//pour un bomberman t'es pas censé stagner
const io = new Server(httpServer, { pingInterval: 5000, pingTimeout: 5000 });
const rooms = new RoomManager(io);

const reply = (ack, result) => typeof ack === 'function' && ack(result);

//la partie principale....
io.on('connection', (socket) => {
  socket.on('room:create', (opts, ack) => reply(ack, rooms.createRoom(socket, opts)));
  socket.on('room:join', (opts, ack) => reply(ack, rooms.joinRoom(socket, opts)));
  socket.on('room:start', (_, ack) => reply(ack, rooms.startGame(socket)));
  socket.on('room:leave', () => rooms.leave(socket));

  socket.on('game:input', (input) => rooms.handleInput(socket, input));
  socket.on('game:augment', (augmentId) => rooms.handleAugment(socket, augmentId));

  //mesure de latence (chronomètre aller-retour de ack)
  socket.on('net:ping', (ack) => reply(ack, true));

  //fermeture d'onglet/perte réseau/timeout du heartbeat
  socket.on('disconnect', () => rooms.leave(socket));
});

httpServer.listen(3000, () => console.log('http://localhost:3000'));