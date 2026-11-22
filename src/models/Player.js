// Schéma Mongoose pour les joueurs (Pôle 4)
import mongoose from 'mongoose';
//const mongoose = require('mongoose');

const playerSchema = mongoose.Schema({ 
    pseudo: String,
    bestScore: Number
});

export default mongoose.model('Player', playerSchema);