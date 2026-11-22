// Schéma Mongoose pour les parties (Pôle 4)
import mongoose from 'mongoose';

//const mongoose = require('mongoose');

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

export default mongoose.model('Game', gameSchema);