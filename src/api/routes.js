// Routes Express comme GET /api/scores (Pôle 4) 
import express from 'express';
//const express = require('express');
const router = express.Router(); // Crée un "mini-serveur" 

//const Player = require('../models/Player');
import Player from '../models/Player.js';

// Route GET /api/scores
router.get('/scores', (req, res) => {
  Player.find()
    .sort({ bestScore: -1 })
    .limit(10)
    .then((topJoueurs) => {
      res.json(topJoueurs);
    })
    .catch((err) => {
      console.error("Erreur de base de données :", err);
      res.status(500).json({ erreur: "Impossible de récupérer les scores" });
    });
});

export default router;