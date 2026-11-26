// Initialisation Node.js/Socket.io, gestion des salons et boucle de jeu (Pôle 5)


//Pour pôle 4, pour les routes API + connexion Mongoose
import express from 'express';
import mongoose from 'mongoose';
import apiRoutes from './api/routes.js';

const app = express();

//connexion à MongoDB
connectDB();

app.use('/api', apiRoutes);

app.listen(3000, () => {
  console.log("Le serveur API est lancé ! Va sur http://localhost:3000/api/scores");
});

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
