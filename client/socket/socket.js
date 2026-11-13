import {
    io
} from "https://cdn.socket.io/4.6.1/socket.io.esm.min.js";


// Crée une instance de socket.io et se connecte au serveur
const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("Connecté au serveur avec l'ID de socket :", socket.id);
});

socket.on("connect_error", (error) => {
    console.log("Erreur de connexion au serveur", error.message);
});

socket.on("disconnect", () => {
    console.log("Déconnecté du serveur");
});

export default socket;