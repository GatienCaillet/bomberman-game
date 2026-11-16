import socket from "../socket/socket.js";

const canvas = document.getElementById("gameCanvas");
if (!canvas) {
    throw new Error("Can't find canvas of gameCanvas");
}

const ctx = canvas.getContext("2d");

const message = document.getElementById("message");
const deathMessage = document.getElementById("die");

const TILE_SIZE = 40;
const LOCAL_STORAGE_KEY = "bombermanGameState";
const LOCAL_PLAYER_ID = "p2";


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
            lives: 5,
            score: 0,
            alive: true
        },
        {
            id: "p2",
            x: 5,
            y: 5,
            color: "#ef4444",
            lives: 5,
            score: 0,
            alive: true
        },
        {
            id: "p3",
            x: 9,
            y: 9,
            color: "#10b981",
            lives: 5,
            score: 0,
            alive: true
        },
        {
            id: "p4",
            x: 1,
            y: 9,
            color: "#f59e0b",
            lives: 5,
            score: 0,
            alive: true
        }
    ],

    bombs: [],

    explosions: []

};

//Taille de CANVAS en fonction de la taille de la map
canvas.width = gameState.map[0].length * TILE_SIZE;
canvas.height = gameState.map.length * TILE_SIZE;

//mettre a jour les vies affichees dans le panneau d'information

// Mettre à jour les informations du joueur local
// Mettre à jour les informations du joueur local
// Mettre à jour les informations du joueur local
function updatePlayerInfo() {
    const localPlayer = gameState.players.find(
        player => player.id === LOCAL_PLAYER_ID
    );

    if (!localPlayer) {
        return;
    }

    // Mettre à jour le nom
    const nameElement =
        document.getElementById("name");

    if (nameElement) {
        nameElement.textContent =
            localPlayer.name || localPlayer.id;
    }

    // Mettre à jour le score
    const scoreElement =
        document.getElementById("score");

    if (scoreElement) {
        scoreElement.textContent =
            `Score: ${formatScore(localPlayer.score)}`;
    }

    // Mettre à jour les coeurs
    const livesElement =
        document.getElementById("lives");

    if (livesElement) {
        livesElement.textContent =
            "❤️".repeat(Math.max(0, localPlayer.lives));
    }

    // Afficher le symbole de mort uniquement si le joueur est mort
    if (deathMessage) {
        deathMessage.style.display =
            localPlayer.alive ? "none" : "inline";
    }
}

// // Afficher les nombres entiers et les demi-points
// function formatScore(score) {
//     if (Number.isInteger(score)) {
//         return String(score);
//     }

//     return score.toFixed(1);
// }

// Afficher les nombres entiers et les demi-points
function formatScore(score) {
    if (Number.isInteger(score)) {
        return String(score);
    }

    return score.toFixed(1);
}

// Ajouter des points à un joueur
function addScore(playerId, points) {
    const player = gameState.players.find(
        player => player.id === playerId
    );

    if (!player) {
        return;
    }

    player.score += points;
}

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
        if (!player.alive) return; // Ne pas dessiner les joueurs morts

        const pixelX = player.x * TILE_SIZE;
        const pixelY = player.y * TILE_SIZE;

        //dessiner la figure du joueur
        ctx.strokeStyle = player.color;
        ctx.strokeRect(pixelX + 5, pixelY + 5, TILE_SIZE - 10, TILE_SIZE - 10);

        //dessiner le couteur du jouer

        ctx.fillStyle = player.color;
        ctx.fillRect(pixelX + 7, pixelY + 7, TILE_SIZE - 14, TILE_SIZE - 14);//dessiner les yeux du joueur
        ctx.fillStyle = "white";
        ctx.fillRect(pixelX + 10, pixelY + 10, 4, 4);
        ctx.fillRect(pixelX + TILE_SIZE - 14, pixelY + 10, 4, 4);

        //afficher l'identifiant du jouer
        ctx.fillStyle = "white";
        ctx.font = "12px Arail";

        ctx.fillText(
            player.id,
            pixelX + 12,
            pixelY + 24
        );

    });

    //dessiner les yeux des joueurs
    ctx.fillStyle = "white";

    //dessiner frame blanc
    ctx.strokeStyle = "white";
    ctx.linewidth = 2;

    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    //afficher numero de joueur
    gameState.players.forEach(player => {
        const pixelX = player.x * TILE_SIZE;
        const pixelY = player.y * TILE_SIZE;
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(player.id, pixelX + 5, pixelY + 15);
    });
}

//dessiner les bombes
function drawBombs() {
    gameState.bombs.forEach(bomb => {
        ctx.fillStyle = "#000000";
        ctx.fillRect(bomb.x * TILE_SIZE, bomb.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
}

// Dessiner les explosions
function drawExplosions() {
    for (const explosion of gameState.explosions) {
        const pixelX = explosion.x * TILE_SIZE;
        const pixelY = explosion.y * TILE_SIZE;

        // explosion exterieur
        ctx.fillStyle = "#ff0000";


        ctx.fillRect(
            pixelX + 3,
            pixelY + 3,
            TILE_SIZE - 6,
            TILE_SIZE - 6
        );

        // explosion interieur
        ctx.fillStyle = "#fde047";

        ctx.fillRect(
            pixelX + 12,
            pixelY + 12,
            TILE_SIZE - 24,
            TILE_SIZE - 24
        );
    }
}

// dessiner jeu general
function renderGame() {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawMap();
    drawBombs();
    drawExplosions();
    drawPlayers();

    updatePlayerInfo();

}

// verifier si jouer peut passer
function canWalk(x, y) {
    // veifier si hors de frontiere de carte
    if (
        x < 0 ||
        x >= gameState.map[0].length ||
        y < 0 ||
        y >= gameState.map.length
    ) {
        return false;
    }

    // mur et mur destructible
    const tile = gameState.map[y][x];

    if (tile === 1 || tile === 2) {
        return false;
    }

    // posiiton de bombe indirect
    const bombExists = gameState.bombs.some(
        bomb => bomb.x === x && bomb.y === y
    );

    if (bombExists) {
        return false;
    }

    // indierct si racontere autre jouer
    const otherPlayerExists = gameState.players.some(
        player =>
            player.id !== LOCAL_PLAYER_ID &&
            player.alive &&
            player.x === x &&
            player.y === y
    );

    if (otherPlayerExists) {
        return false;
    }

    return true;
}

// jouer local mouvememt
function movePlayer(direction) {
    const player = gameState.players.find(
        player => player.id === LOCAL_PLAYER_ID
    );

    if (!player || !player.alive) {
        return;
    }


    let newX = player.x;
    let newY = player.y;

    if (direction === "up") {
        newY--;
    }

    if (direction === "down") {
        newY++;
    }

    if (direction === "left") {
        newX--;
    }

    if (direction === "right") {
        newX++;
    }

    if (!canWalk(newX, newY)) {
        if (message) {
            message.textContent = "chemin indirect";
        }

        return;
    }

    // local test: pisition de jouer
    player.x = newX;
    player.y = newY;

    if (message) {
        message.textContent =
            `PositionPlayer：(${player.x}, ${player.y})`;
    }

    renderGame();
}

// local placer bombe
function placeBomb() {
    const player = gameState.players.find(
        player => player.id === LOCAL_PLAYER_ID
    );

    if (!player || !player.alive) {
        return;
    }
    // placer qu'un seul bombe dans une position
    const bombExists = gameState.bombs.some(
        bomb => bomb.x === player.x && bomb.y === player.y
    );

    if (bombExists) {
        return;
    }

    // créer une bombe à la position du joueur
    const bomb = {
        x: player.x,
        y: player.y,
        ownerId: player.id
    }

    gameState.bombs.push(bomb);

    

    renderGame();

    // expolision dans 1.5 seconde

    if (message) {
        message.textContent = "La bombe explosera dans 1.5 secondes"
    }

    setTimeout(() => {
        explodeBomb(bomb);
    }, 1500);

}

// Retirer une vie aux joueurs touchés par l'explosion
function damagePlayers(explosionCells, ownerId) {
    const owner = gameState.players.find(
        player => player.id === ownerId
    );

    for (const player of gameState.players) {
        if (!player.alive) {
            continue;
        }

        const isTouched = explosionCells.some(
            explosion =>
                explosion.x === player.x &&
                explosion.y === player.y
        );

        if (!isTouched) {
            continue;
        }

        console.log(
            `${player.id} est touche. vies avant :`,
            player.lives
        );

       // Le joueur perd une vie
        player.lives = Math.max(
            0,
            player.lives - 1
        );

        // Le joueur touché perd 0.5 point
        player.score -= 0.5;

        // Un joueur ennemi touché rapporte des points au propriétaire
        if (owner && player.id !== ownerId) {
            if (player.lives <= 0) {
                // Joueur ennemi éliminé : +2 points
                owner.score += 2;
            } else {
                // Joueur ennemi touché : +1 point
                owner.score += 1;
            }
        }

        // Le joueur meurt après cinq dégâts
        if (player.lives <= 0) {
            player.lives = 0;
            player.alive = false;

            if (message) {
                message.textContent =
                    `${player.id} est mort`;
            }
        }
        console.log(
            `${player.id} vies après :`,
            player.lives
        );
    }
}

// Faire exploser une bombe
function explodeBomb(bomb) {
    // La case centrale de l'explosion
    const explosionCells = [
        {
            x: bomb.x,
            y: bomb.y
        }
    ];

    let destroyedWalls = 0;

    const directions = [
        { x: 0, y: -1 }, // Vers le haut
        { x: 0, y: 1 },  // Vers le bas
        { x: -1, y: 0 }, // Vers la gauche
        { x: 1, y: 0 }   // Vers la droite
    ];

    const explosionRange = 2;

    // Calculer les cases touchées par l'explosion
    for (const direction of directions) {
        for (
            let distance = 1;
            distance <= explosionRange;
            distance++
        ) {
            const x = bomb.x + direction.x * distance;
            const y = bomb.y + direction.y * distance;

            // Arrêter si la case est en dehors de la carte
            if (
                x < 0 ||
                x >= gameState.map[0].length ||
                y < 0 ||
                y >= gameState.map.length
            ) {
                break;
            }

            const tile = gameState.map[y][x];

            // Un mur fixe bloque l'explosion
            if (tile === 1) {
                break;
            }

            // Ajouter la case à l'explosion
            explosionCells.push({
                x: x,
                y: y
            });

            // Un mur destructible est détruit, puis l'explosion s'arrête dans cette direction
            if (tile === 2) {
                gameState.map[y][x] = 0;
                destroyedWalls++ ;
                break;
            }
        }
    }
    // Gagner 0.5 point pour chaque mur detruit
    addScore(
        bomb.ownerId,
        destroyedWalls * 0.5
    );

    // Supprimer la bombe qui vient d'exploser
    gameState.bombs = gameState.bombs.filter(
        existingBomb => existingBomb !== bomb
    );

    // Ajouter les cases à la liste des explosions
    gameState.explosions.push(...explosionCells);

    damagePlayers(
        explosionCells,
        bomb.ownerId
    );

    renderGame();

    // Afficher immédiatement le résultat
    renderGame();

    // Supprimer l'effet visuel après 500 millisecondes
    setTimeout(() => {
        gameState.explosions =
            gameState.explosions.filter(explosion => {
                return !explosionCells.some(
                    cell =>
                        cell.x === explosion.x &&
                        cell.y === explosion.y
                );
            });

        renderGame();
    }, 500);
}

// ecoter clavier
document.addEventListener("keydown", event => {
    const directionKeys = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right"
    };

    const direction = directionKeys[event.key];

    if (direction) {
        event.preventDefault();
        movePlayer(direction);
        return;
    }

    if (event.code === "Space") {
        event.preventDefault();
        placeBomb();
    }
});

//commencer 
renderGame();

