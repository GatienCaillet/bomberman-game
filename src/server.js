// Initialisation Node.js/Socket.io, gestion des salons et boucle de jeu (Pôle 5)

//Pour pôle 4, pour ...

//imports
const mongoose = require('mongoose');
const express = require('express');
const Game = require('./models/Game');

const app = express();

// temporaire, simplement pour tester la connectivité
const fauxScores = [
  { pseudo: "Joueur1", score: 500 },
  { pseudo: "Alice", score: 1200 }
];


app.get('/api/scores', (req, res) => {
  // Quand quelqu'un visite cette URL, on renvoie le tableau en format JSON
  res.json(fauxScores);
});


mongoose.connect('mongodb://127.0.0.1:27017/bomberman')
  .then(() => {
    console.log('Connexion à MongoDB réussie !');

 /*à modifier en une fonction pour pôle 5    
    const maPartie = new Game({
      roomName:'Grenoble Bomber',
      winner: 'Joueur1'
    });

    maPartie.save()
      .then((maPartieSauvegarde) => {
        console.log("Partie sauvegardée avec succès :", maPartieSauvegarde);
      })
      .catch((err) => {
        console.error("Erreur lors de la sauvegarde :", err);
      });
*/
  })

  .catch(error => {
    console.error('Connexion à MongoDB échouée :', error.message);
  });

app.listen(3000, () => {
  console.log("Le serveur API est lancé ! Va sur http://localhost:3000/api/scores");
});