import socket from "../socket/socket.js";
import * as art from "./canvas_art.js";

const canvas = document.getElementById("gameCanvas");
if (!canvas) {
    throw new Error("Can't find canvas of gameCanvas");
}

const ctx = canvas.getContext("2d");

//recuper les item de html
const message = document.getElementById("message");
const deathMessage = document.getElementById("die");

const TILE_SIZE = 40;
const MAP_WIDTH = 60;
const MAP_HEIGHT = 40;

const LOCAL_STORAGE_KEY = "bombermanGameState";
const LOCAL_PLAYER_ID = "p3";

//charger ressources graphiques
const image = {};
function loadImage(name, path) {
    const img = new Image();

    img.onload = () => {
        renderGame();
    };

    img.onerror = () => {
        console.log("Image introuvable :", path);
    };

    img.src = path;
    image[name] = img;
}

//sol
loadImage("floor", new URL("../../Ressources/" + art.ASSETS.floor, import.meta.url).href);

// Références graphiques uniquement : aucune modification de la carte.
loadImage("bomb", new URL("../../Ressources/" + art.ASSETS.bomb, import.meta.url).href);
for (const path of [...art.BUILDINGS, ...art.DESTRUCTIBLES]) {
    loadImage(path, new URL("../../Ressources/" + path, import.meta.url).href);
}
let playerLayer = null;
const playerSprites = {};

// 0: Passage
// 1: Mur
// 2: Mur destructible



// Créer la carte sans dépendre du fichier de références graphiques.
function generateMap(width, height) {
    const map = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
                (x % 2 === 0 && y % 2 === 0)) return 1;
            return Math.random() < 0.15 ? 2 : 0;
        })
    );
    // Garder libres les positions initiales et leurs sorties.
    for (const p of [{ x: 1, y: 1 }, { x: 5, y: 5 }, { x: 9, y: 9 }, { x: 1, y: 9 }]) {
        for (const d of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
            const x = p.x + d.x, y = p.y + d.y;
            if (x > 0 && x < width - 1 && y > 0 && y < height - 1) map[y][x] = 0;
        }
    }
    return map;
}

const gameState = {
    map: generateMap(MAP_WIDTH, MAP_HEIGHT),

    camera: {
        x: 0,
        y: 0,
        width: 700,
        height: 500
    },

    players: [
        {
            id: "p1",
            x: 1,
            y: 1,
            color: "#38bdf8",
            lives: 5,
            score: 0,
            speed: randomSpeed(),
            alive: true
        },
        {
            id: "p2",
            x: 5,
            y: 5,
            color: "#ef4444",
            lives: 5,
            score: 0,
            speed: randomSpeed(),
            alive: true
        },
        {
            id: "p3",
            x: 9,
            y: 9,
            color: "#10b981",
            lives: 5,
            speed: randomSpeed(),
            score: 0,
            alive: true
        },
        {
            id: "p4",
            x: 1,
            y: 9,
            color: "#f59e0b",
            lives: 5,
            speed: randomSpeed(),
            score: 0,
            alive: true
        }
    ],

    bombs: [],

    explosions: []

};

//Taille de CANVAS en fonction de la taille de la map
canvas.width = gameState.camera.width;
canvas.height = gameState.camera.height;
canvas.style.height = canvas.height + "px";
canvas.parentElement.style.height = canvas.height + "px";

//mettre a jour les vies affichees dans le panneau d'information

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

    // Mettre a jour la vitesse
    const vitesseElement =
        document.getElementById("speed");

    if (vitesseElement) {
        vitesseElement.textContent =
            "⚡️".repeat(localPlayer.speed);
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

//mettre a jour de la position de la camera
function updateCamera() {
    const player = gameState.players.find(player => player.id === LOCAL_PLAYER_ID);
    if (!player) return;
    const camera = gameState.camera;
    camera.x = Math.max(0, Math.min(
        (player.x + 0.5) * TILE_SIZE - canvas.width / 2,
        gameState.map[0].length * TILE_SIZE - canvas.width
    ));
    camera.y = Math.max(0, Math.min(
        (player.y + 0.5) * TILE_SIZE - canvas.height / 2,
        gameState.map.length * TILE_SIZE - canvas.height
    ));
}

// Afficher les nombres entiers et les demi-points
function formatScore(score) {
    if (Number.isInteger(score)) {
        return String(score);
    }

    return score.toFixed(1);
}

//avoir vitesse de jouers differents: 1-3
function randomSpeed() {
    return Math.floor(Math.random() * 3) + 1;
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
            const pixelX = x * TILE_SIZE, pixelY = y * TILE_SIZE;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
            if (image.floor.complete && image.floor.naturalWidth > 0) {
                ctx.drawImage(image.floor, pixelX, pixelY, TILE_SIZE, TILE_SIZE);
            }
            if (tile === 0) continue;
            // Garder le type de collision existant : 1 = bâtiment, 2 = obstacle.
            const paths = tile === 1 ? art.BUILDINGS : art.DESTRUCTIBLES;
            const img = image[paths[(x * 7 + y * 3) % paths.length]];
            if (img.complete && img.naturalWidth > 0) {
                const scale = Math.min(TILE_SIZE / img.naturalWidth, TILE_SIZE / img.naturalHeight);
                const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
                ctx.drawImage(img, pixelX + (TILE_SIZE - width) / 2, pixelY + TILE_SIZE - height, width, height);
            } else {
                ctx.fillStyle = tile === 1 ? "#8b4513" : "#d2b48c";
                ctx.fillRect(pixelX, pixelY, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

// dessiner les joueurs
function drawPlayers() {
    // Une simple couche d'images conserve l'animation native des GIF.
    if (!playerLayer) {
        playerLayer = document.createElement("div");
        playerLayer.style.cssText = "position:absolute;overflow:hidden;pointer-events:none;z-index:2";
        canvas.parentElement.appendChild(playerLayer);
    }
    const box = canvas.getBoundingClientRect(), parent = canvas.parentElement.getBoundingClientRect();
    const sx = canvas.clientWidth / canvas.width, sy = canvas.clientHeight / canvas.height;
    Object.assign(playerLayer.style, {
        left: box.left - parent.left + canvas.clientLeft + "px",
        top: box.top - parent.top + canvas.clientTop + "px",
        width: canvas.clientWidth + "px", height: canvas.clientHeight + "px"
    });
    gameState.players.forEach((player, index) => {
        let sprite = playerSprites[player.id];
        if (!sprite) {
            sprite = document.createElement("img");
            const character = index % 2 ? art.CHARACTERS.police : art.CHARACTERS.protester;
            sprite.src = new URL("../../Ressources/" + character.idle, import.meta.url).href;
            sprite.alt = player.id;
            sprite.style.cssText = "position:absolute;object-fit:contain;image-rendering:pixelated";
            playerLayer.appendChild(sprite);
            playerSprites[player.id] = sprite;
        }
        Object.assign(sprite.style, {
            display: player.alive ? "block" : "none",
            left: (player.x * TILE_SIZE - gameState.camera.x) * sx + "px",
            top: (player.y * TILE_SIZE - gameState.camera.y) * sy + "px",
            width: TILE_SIZE * sx + "px", height: TILE_SIZE * sy + "px"
        });
    });
}

//dessiner les bombes
function drawBombs() {
    gameState.bombs.forEach(bomb => {
        if (image.bomb.complete && image.bomb.naturalWidth > 0) {
            ctx.drawImage(image.bomb, bomb.x * TILE_SIZE, bomb.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else {
            ctx.fillStyle = "#000000";
            ctx.fillRect(bomb.x * TILE_SIZE, bomb.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
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
    updateCamera();
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.save();
    ctx.translate(-gameState.camera.x, -gameState.camera.y);
    drawMap();
    drawBombs();
    drawExplosions();
    drawPlayers();

    ctx.restore();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    updatePlayerInfo();
    checkResult();

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

    // indierct si raconter autre jouer
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
    if(gamefinished){
        return;
    }
    const player = gameState.players.find(
        player => player.id === LOCAL_PLAYER_ID
    );

    if (!player || !player.alive) {
        return;
    }

    const speed = player.speed || 1; //verifier si player.speed est valide, sinon la vitesse par defaut est 1

    let newX = player.x;
    let newY = player.y; // mettre a jour la position


    //vitesse different
    for (let i = 0; i < speed; i++) {
        let nextX = newX;
        let nextY = newY;


        if (direction === "up") {
            nextY--;
        }

        if (direction === "down") {
            nextY++;
        }

        if (direction === "left") {
            nextX--;
        }

        if (direction === "right") {
            nextX++;
        }

        if (!canWalk(nextX, nextY)) {
            if (message) {
                message.textContent = "chemin indirect";
            }

            break;
        }
        newX = nextX;
        newY = nextY;
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
    if(gamefinished){
        return;
    }
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
// Verifier la resultat
let gamefinished = false;

function checkResult() {
    if (gamefinished) {
        return;
    }

    const localPlayer = gameState.players.find(
        player => player.id === LOCAL_PLAYER_ID
    );

    if (!localPlayer) return;

    const alivePlayers = gameState.players.filter(
        player => player.alive && player.lives > 0
    );

    //defait: le jouer local est mort
    if (!localPlayer.alive || localPlayer.lives <= 0) {
        gamefinished = true;
        showResult("LOSE");
        return;
    }

    //victoire: le jouer local est le dernier survivant 

    if (alivePlayers.length === 1 &&
        alivePlayers[0].id === localPlayer.id) {
        gamefinished = true;

        showResult("WIN");
        return;
    }
}



function showResult(result) {
    gamefinished = true;

    const resultBloc = document.getElementById("game-result");
    const title = document.getElementById("result-title");
    const message = document.getElementById("result-message");


    //afficher le resultat
    if (!resultBloc || !title) {
        return;
    }

    resultBloc.hidden = false;

    if (result === "WIN") {
        title.textContent = "VICTOIRE";
        title.className = "result-title win";
        if (message) {
            message.textContent = "Vous avez gagné !";
        }
    } else {
        title.textContent = "DÉFAITE";
        title.className = "result-title lose";
        if (message) {
            message.textContent = "Vous avez perdu.";
        }
    }
    document.body.classList.add("game-over");
    setTimeout(() => {
        resultBloc.hidden = true;
        document.body.classList.remove("game-over");
    }, 10000);
}






// Faire exploser une bombe
function explodeBomb(bomb) {
    if (!gameState.bombs.includes(bomb)) return;
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
                destroyedWalls++;
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

    //Verifier la victoitr ou la defaite
    checkResult();

    // Afficher immédiatement le résultat
    renderGame();

    // Supprimer l'effet visuel après 500 millisecondes
    setTimeout(() => {
        gameState.explosions =
            gameState.explosions.filter(explosion => !explosionCells.includes(explosion));

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

     // Arrêter les contrôles après la fin du jeu
    if (gamefinished) {
        if (direction || event.code === "Space") {
            event.preventDefault();
        }
        return;
    }

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

