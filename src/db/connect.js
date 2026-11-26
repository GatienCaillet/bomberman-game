//pôle 4
//connexion Mongoose
import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bomberman';
  try {
    await mongoose.connect(uri);
    console.log('Connexion à MongoDB réussie !');
  } catch (error) {
    console.error('Connexion à MongoDB échouée :', error.message);
  }
}