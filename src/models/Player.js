// Schéma Mongoose pour les joueurs (Pôle 4)
const mongoose = require('mongoose');

const playerSchema = mongoose.Schema({ 
    pseudo: String,
    bestScore: Number
});

module.exports = mongoose.model('Player', playerSchema);
