//pôle 4
//connexion Mongoose
import mongoose from 'mongoose';

const LOCAL_URI = 'mongodb://127.0.0.1:27017/bomberman';

export async function connectDB() {
  const atlasUri = process.env.MONGO_URI;

  if (atlasUri) {
  try {
    await mongoose.connect(atlasUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connexion à MongoDB Atlas réussie !');
    return;
  } catch (error) {
    console.warn('MongoDB Atlas inaccessible (réseau/Eduroam ?), bascule en local...');
  } //pour empêcher de freeze
}
try { //fallback
  await mongoose.connect(LOCAL_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('Connexion à MongoDB local réussie !');
  } catch (error) {
    console.error('Aucune base MongoDB disponible (le serveur continue sans DB) :', error.message);
  }
}