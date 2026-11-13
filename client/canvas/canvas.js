import socket from "../socket/socket.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const message = document.getElementById("message");

const TILE_SIZE = 40;

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
    if (event.key === "ArrowUp") {
        socket.emit("move", { direction: "up" });
    } else if (event.key === "ArrowDown") {
        socket.emit("move", { direction: "down" });
    } else if (event.key === "ArrowLeft") {
        socket.emit("move", { direction: "left" });
    } else if (event.key === "ArrowRight") {
        socket.emit("move", { direction: "right" });
    } else if (event.key === "Space") {
        event.preventDefault(); // Empêche le défilement de la page
        socket.emit("player_imput", { action: "place_bomb" });
    }
});