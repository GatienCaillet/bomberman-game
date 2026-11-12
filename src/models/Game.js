// Schéma Mongoose pour les parties (Pôle 4)
const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({ 
    roomName: String,
    players: Number,
    winner: String,
    duration: Number
});

module.exports = mongoose.model('Game', gameSchema);