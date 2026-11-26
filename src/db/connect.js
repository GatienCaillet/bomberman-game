//pôle 4

//connexion Mongoose
mongoose.connect('mongodb://127.0.0.1:27017/bomberman')
  .then(() => {
    console.log('Connexion à MongoDB réussie !');
    })

  .catch(error => {
    console.error('Connexion à MongoDB échouée :', error.message);
  });