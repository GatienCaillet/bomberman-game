// Schéma Mongoose pour les parties (Pôle 4)
const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({ 
    roomName: String,
    players: {
        type: Number,
        min: 1,
        max: 4
    },
    winner: String,
    duration: Number
});

module.exports = mongoose.model('Game', gameSchema);