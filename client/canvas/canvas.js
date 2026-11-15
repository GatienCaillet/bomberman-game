import socket from "../socket/socket.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const message = document.getElementById("message");

const TILE_SIZE = 40;
const floorImage = new Image();
floorImage.src = "Ressources/Sols/paves-sans-joint.png";

const playerImages = {
    p1: new Image(),
    p2: new Image(),
    p3: new Image(),
    p4: new Image()
};

playerImages.p1.src = "Ressources/Personnages/Animations/Manifestant/Marche-profil/animation.gif";
playerImages.p2.src = "Ressources/Personnages/Animations/Manifestant/Marche-profil/animation.gif";
playerImages.p3.src = "Ressources/Personnages/Animations/Manifestant/Marche-profil/animation.gif";
playerImages.p4.src = "Ressources/Personnages/Animations/Manifestant/Marche-profil/animation.gif";

// 0: Passage
// 1: Mur
// 2: Mur destructible

const gameState = {
    map: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ],

    players: [
        {
            id: "p1",
            x: 1,
            y: 1,
            color: "#38bdf8",
            alive: true
        },
        {
            id: "p2",
            x: 5,
            y: 5,
            color: "#ef4444",
            alive: true
        },
        {
            id: "p3",
            x: 9,
            y: 9,
            color: "#10b981",
            alive: true
        },
        {
            id: "p4",
            x: 1,
            y: 9,
            color: "#f59e0b",
            alive: true
        }
    ],

    bombs: [
        {
            x: 3,
            y: 3
        }
    ],

    explosions: [
        {
            x: 3,
            y: 4
        },
        {
            x: 3,
            y: 5
        }
    ]
};

//Taille de CANVAS en fonction de la taille de la map
canvas.width = gameState.map[0].length * TILE_SIZE;
canvas.height = gameState.map.length * TILE_SIZE;

// dessiner la carte
function drawMap() {
    for (let y = 0; y < gameState.map.length; y++) {
        for (let x = 0; x < gameState.map[y].length; x++) {
            const tile = gameState.map[y][x];

            const pixelX = x * TILE_SIZE;
            const pixelY = y * TILE_SIZE;

            //dessiner le passage
            if (tile === 0) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
            }
            //dessiner la maille de la carte
            ctx.strokeStyle = "#000000";
            ctx.strokeRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);

            if (tile === 1) {
                // Dessiner un mur
                ctx.fillStyle = "#8b4513";
                ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
            } else if (tile === 2) {
                // Dessiner un mur destructible
                ctx.fillStyle = "#d2b48c";
                ctx.fillRect(pixelX + 2, pixelY + 2, TILE_SIZE - 4, TILE_SIZE - 4);

                ctx.strokeStyle = "#713f12";
                ctx.strokeRect(pixelX + 7, pixelY + 7, TILE_SIZE - 14, TILE_SIZE - 14);
            }
        }
    }
}

// dessiner les joueurs
function drawPlayers() {
    gameState.players.forEach(player => {
        if (player.alive) {
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }

        //dessiner la figure du joueur
        ctx.strokeStyle = player.color;
        ctx.strokeRect(player.x * TILE_SIZE + 5, player.y * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    });

    //dessiner les yeux des joueurs
    ctx.fillStyle = "white";
}

//dessiner les bombes
function drawBombs() {
    gameState.bombs.forEach(bomb => {
        ctx.fillStyle = "#000000";
        ctx.fillRect(bomb.x * TILE_SIZE, bomb.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
}

//dessiner les explosions
function drawExplosions() {
    gameState.explosions.forEach(explosion => {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(explosion.x * TILE_SIZE, explosion.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
}

//dessiner la passage
// function drawPassages() {
//     for (let y = 0; y < gameState.map.length; y++) {


function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner la carte
    drawMap();
    // Dessiner les joueurs
    drawPlayers();
    // Dessiner les bombes
    drawBombs();
    // Dessiner les explosions
    drawExplosions();

    // Dessiner les passages
    // drawPassages();
}
//demarcher dessiner
renderGame();

//claver les touches du clavier pour le déplacement des joueurs
document.addEventListener("keydown", (event) => {
    const player = gameState.players[0]; // On suppose que le joueur 1 est le joueur local

    let newX = player.x;
    let newY = player.y;

    switch (event.key) {
        case "ArrowUp":
            newY--;
            break;
        case "ArrowDown":
            newY++;
            break;
        case "ArrowLeft":
            newX--;
            break;
        case "ArrowRight":
            newX++;
            break;
        case " ":
            // Placer une bombe
            socket.emit("placeBomb", { x: player.x, y: player.y });
            return; // Ne pas continuer pour éviter de redessiner le joueur
        default:
            return; // Ne rien faire si une autre touche est pressée
        case newX === player.x && newY === player.y:
            return; // Ne rien faire si le joueur n'a pas bougé 

            event.preventDefault(); // Empêcher le comportement par défaut des touches fléchées

       if (!canwalk(newX, newY)) {
            return; // Ne rien faire si le joueur ne peut pas marcher sur la case
        }

        // Envoyer la nouvelle position au serveur
        socket.emit("movePlayer", 
            { x: newX, y: newY },
            playerID = player.id,
            direction = event.key,
            (response) => {
                if (response.success) {
                    // Mettre à jour la position du joueur localement
                    player.x = newX;
                    player.y = newY;
                    renderGame();
                } else {
                    console.log("Déplacement refusé par le serveur :", response.message);
                }
            }
        );

        // Mettre à jour la position du joueur localement
        player.x = newX;
        player.y = newY;
        renderGame();
    }

    //verifier collision avec les murs et les bombes
    function canwalk(x, y) {
        // Vérifier les limites de la carte
        if (x < 0 || x >= gameState.map[0].length || y < 0 || y >= gameState.map.length) {
            return false;

            // Vérifier si la case est un mur ou une bombe
        } else if (gameState.map[y][x] === 1 || gameState.map[y][x] === 2) {
            return false;
        } else if (gameState.bombs.some(bomb => bomb.x === x && bomb.y === y)) {
            return false;
        }

        // Vérifier si la case est occupée par un autre joueur
        if (gameState.players.some(otherPlayer => otherPlayer.x === x && otherPlayer.y === y && otherPlayer.alive)) {
            return false;
        }

        // Si aucune des conditions ci-dessus n'est remplie, le joueur peut marcher sur cette case
        return true;

    }

    // Vérifier si le nouveau positionnement est valide (pas un mur)
    if (gameState.map[newY][newX] === 0) {
        player.x = newX;
        player.y = newY;
        renderGame();
    }
});
// Écouter les événements de déplacement des joueurs depuis le serveur
socket.on("playerMoved", (data) => {
    const player = gameState.players.find(p => p.id === data.playerId);
    if (player) {
        player.x = data.x;
        player.y = data.y;
        renderGame();
    }
});

// Écouter les mises à jour du serveur pour les joueurs, bombes et explosions
socket.on("updateGameState", (newGameState) => {
    // Mettre à jour l'état du jeu avec les nouvelles données reçues du serveur
    gameState.players = newGameState.players;
    gameState.bombs = newGameState.bombs;
    gameState.explosions = newGameState.explosions;
    renderGame();
});

// Écouter les messages du serveur
socket.on("message", (msg) => {
    message.textContent = msg;
});

// Écouter les messages d'erreur du serveur
socket.on("errorMessage", (errorMsg) => {
    message.textContent = errorMsg;
});

// Écouter les messages de victoire du serveur
socket.on("victoryMessage", (victoryMsg) => {
    message.textContent = victoryMsg;
});

// Écouter les messages de défaite du serveur
socket.on("defeatMessage", (defeatMsg) => {
    message.textContent = defeatMsg;
}); 