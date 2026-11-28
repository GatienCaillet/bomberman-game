// Rendu du jeu : dessine l'état reçu du serveur dans le canvas.
// Le décor, les bombes et les flammes sont dans le canvas ; les joueurs sont
// des <img> posés au-dessus pour garder l'animation des GIF.
import * as art from "./assets.js";

export const RESSOURCES = "/ressources/";
const TILE_SIZE = 40;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const images = new Map();
function getImage(path) {
    let image = images.get(path);
    if (!image) {
        image = new Image();
        image.src = RESSOURCES + path;
        images.set(path, image);
    }
    return image;
}

const isLoaded = (image) => image.complete && image.naturalWidth > 0;

function resizeCanvas(config) {
    const width = config.width * TILE_SIZE;
    const height = config.height * TILE_SIZE;
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
}

function isBorder(config, x, y) {
    return x === 0 || y === 0 || x === config.width - 1 || y === config.height - 1;
}

function drawGround(game) {
    const floor = getImage(art.ASSETS.floor);
    game.map.forEach((row, y) => row.forEach((tile, x) => {
        const px = x * TILE_SIZE, py = y * TILE_SIZE;
        if (isBorder(game.config, x, y)) {
            ctx.fillStyle = "#2b2f3a";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            return;
        }
        if (isLoaded(floor)) {
            ctx.drawImage(floor, px, py, TILE_SIZE, TILE_SIZE);
        } else {
            ctx.fillStyle = "#9ca3af";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
    }));
}

// Décor : bâtiments, végétation, cônes, poubelles.
// Un objet couvre width × height cases ; son image garde ses proportions
// et repose sur le bas de son emprise (le toit peut dépasser au-dessus).
function drawObjects(game) {
    const sorted = [...game.objects].sort((a, b) => (a.y + a.height) - (b.y + b.height));
    for (const object of sorted) {
        const image = getImage(object.sprite);
        const x = object.x * TILE_SIZE;
        const bottom = (object.y + object.height) * TILE_SIZE;
        const width = object.width * TILE_SIZE;

        if (isLoaded(image)) {
            const height = image.naturalHeight * (width / image.naturalWidth);
            ctx.drawImage(image, x, bottom - height, width, height);
        } else {
            ctx.fillStyle = object.destructible ? "#d2b48c" : "#8b4513";
            ctx.fillRect(x, object.y * TILE_SIZE, width, object.height * TILE_SIZE);
        }
    }
}

function drawPowerUps(game) {
    for (const powerUp of game.powerUps) {
        const x = powerUp.x * TILE_SIZE, y = powerUp.y * TILE_SIZE;
        const path = art.POWER_UPS[powerUp.type];
        if (path && isLoaded(getImage(path))) {
            ctx.drawImage(getImage(path), x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else {
            // pas d'image pour le coeur : on dessine un emoji
            ctx.font = `${TILE_SIZE * 0.6}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(powerUp.type === "heart" ? "❤️" : "?", x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        }
    }
}

// La bombe gonfle de plus en plus vite à l'approche de l'explosion.
function drawBombs(game) {
    const image = getImage(art.ASSETS.bomb);
    for (const bomb of game.bombs) {
        const remaining = bomb.explodeAt - game.time;
        const speed = remaining < 800 ? 40 : 120;
        const scale = 0.8 + 0.08 * Math.sin(performance.now() / speed);
        const size = TILE_SIZE * scale;
        const x = bomb.x * TILE_SIZE + (TILE_SIZE - size) / 2;
        const y = bomb.y * TILE_SIZE + (TILE_SIZE - size) / 2;

        if (isLoaded(image)) {
            ctx.drawImage(image, x, y, size, size);
        } else {
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawFlames(game) {
    for (const flame of game.flames) {
        const x = flame.x * TILE_SIZE, y = flame.y * TILE_SIZE;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(x + 12, y + 12, TILE_SIZE - 24, TILE_SIZE - 24);
    }
}

// ---------------------------------------------------------------------------
// Joueurs : des <img> posés au-dessus du canvas, pour garder l'animation des GIF
// (un GIF dessiné dans un canvas reste figé sur sa première image).
// ---------------------------------------------------------------------------

const playerLayer = document.createElement("div");
playerLayer.className = "player-layer";
canvas.parentElement.appendChild(playerLayer);
// id du joueur -> { box, img, label }
const playerSprites = new Map();

function getPlayerSprite(player) {
    let sprite = playerSprites.get(player.id);
    if (!sprite) {
        const box = document.createElement("div");
        box.className = "player";
        const img = document.createElement("img");
        img.alt = player.name;
        const label = document.createElement("span");
        label.className = "player-name";
        box.append(label, img);
        playerLayer.appendChild(box);
        sprite = { box, img, label };
        playerSprites.set(player.id, sprite);
    }
    return sprite;
}

// ---------------------------------------------------------------------------
// Lissage : le serveur envoie les positions toutes les 50 ms, l'écran se
// redessine environ toutes les 16 ms. Pour éviter les saccades, chaque joueur
// est affiché un peu dans le passé (INTERPOLATION_DELAY_MS), entre les deux
// états reçus qui encadrent cet instant.
// ---------------------------------------------------------------------------

const INTERPOLATION_DELAY_MS = 70;
const HISTORY_MS = 1000;
// Au-delà de ce saut (en cases), le joueur est téléporté (nouvelle manche).
const TELEPORT_DISTANCE = 1.5;

// id du joueur -> [{ time, x, y }] (temps du serveur)
const positionHistory = new Map();
let lastGame = null;
// heure locale à laquelle le dernier état est arrivé, et son temps serveur
let clock = { serverTime: 0, localTime: 0 };

function recordPositions(game) {
    if (game === lastGame) return;
    // une nouvelle partie repart de time = 0 : on oublie l'historique
    if (lastGame && game.time < lastGame.time) positionHistory.clear();
    lastGame = game;
    clock = { serverTime: game.time, localTime: performance.now() };

    for (const player of game.players) {
        let samples = positionHistory.get(player.id);
        if (!samples) {
            samples = [];
            positionHistory.set(player.id, samples);
        }
        const last = samples[samples.length - 1];
        // en phase d'augment le temps n'avance plus : on remplace le dernier point
        if (last && last.time === game.time) samples.pop();
        samples.push({ time: game.time, x: player.x, y: player.y });
        while (samples.length > 2 && samples[1].time < game.time - HISTORY_MS) samples.shift();
    }
}

function getDisplayPosition(player) {
    const samples = positionHistory.get(player.id);
    if (!samples?.length) return { x: player.x, y: player.y };

    const elapsed = performance.now() - clock.localTime;
    const time = Math.min(clock.serverTime, clock.serverTime + elapsed - INTERPOLATION_DELAY_MS);

    let next = samples.findIndex((sample) => sample.time >= time);
    if (next === -1) next = samples.length - 1;
    if (next === 0) return { x: samples[0].x, y: samples[0].y };

    const a = samples[next - 1], b = samples[next];
    if (Math.hypot(b.x - a.x, b.y - a.y) > TELEPORT_DISTANCE) return { x: b.x, y: b.y };
    const ratio = Math.min(1, Math.max(0, (time - a.time) / (b.time - a.time)));
    return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}

// Choisit l'animation selon le personnage, la direction et le mouvement.
function getAnimation(character, player) {
    // « moving » vient du serveur : faux quand le joueur pousse contre un mur
    const moving = player.alive && (player.moving ?? player.input?.direction != null);
    const sideways = player.facing === "left" || player.facing === "right";

    if (moving) {
        if (!sideways && character.frontWalk) return { path: character.frontWalk, profile: false };
        return { path: character.walk, profile: true };
    }
    if (sideways && character.sideIdle) return { path: character.sideIdle, profile: true };
    return { path: character.idle, profile: false };
}

function drawPlayers(game, myId) {
    // le layer recouvre exactement l'intérieur du canvas (sans sa bordure)
    const scale = canvas.clientWidth / canvas.width;
    Object.assign(playerLayer.style, {
        left: canvas.offsetLeft + canvas.clientLeft + "px",
        top: canvas.offsetTop + canvas.clientTop + "px",
        width: canvas.clientWidth + "px",
        height: canvas.clientHeight + "px",
    });

    const size = TILE_SIZE * 1.3 * scale;
    const blink = Math.floor(performance.now() / 100) % 2 === 0;

    game.players.forEach((player, index) => {
        const sprite = getPlayerSprite(player);
        const character = index % 2 ? art.CHARACTERS.police : art.CHARACTERS.protester;
        const { path, profile } = getAnimation(character, player);

        // changer src relance le GIF : on ne le fait que si l'animation change
        if (sprite.img.dataset.path !== path) {
            sprite.img.dataset.path = path;
            sprite.img.src = RESSOURCES + path;
        }

        const invincible = game.time < player.invincibleUntil;
        // (x, y) est le centre du personnage, en cases (décimales)
        const { x, y } = getDisplayPosition(player);
        sprite.label.textContent = player.name;
        sprite.box.classList.toggle("me", player.id === myId);
        Object.assign(sprite.box.style, {
            display: player.alive ? "block" : "none",
            width: size + "px",
            height: size + "px",
            // centré sur sa position, les pieds sur le bas de sa case
            left: ((x + 0.5) * TILE_SIZE * scale - size / 2) + "px",
            top: ((y + 1) * TILE_SIZE * scale - size) + "px",
            opacity: invincible && blink ? 0.35 : 1,
        });
        // les images de profil regardent vers la droite
        sprite.img.style.transform = profile && player.facing === "left" ? "scaleX(-1)" : "";
    });

    // retirer les joueurs qui ne sont plus dans la partie
    for (const [id, sprite] of playerSprites) {
        if (!game.players.some((player) => player.id === id)) {
            sprite.box.remove();
            playerSprites.delete(id);
        }
    }
}

// Dessine une image de la partie. myId sert à mettre en avant le joueur local.
export function drawGame(game, myId) {
    if (!game || !game.map.length) return;

    recordPositions(game);
    resizeCanvas(game.config);
    // redimensionner le canvas réinitialise ce réglage
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGround(game);
    drawObjects(game);
    drawPowerUps(game);
    drawBombs(game);
    drawFlames(game);
    drawPlayers(game, myId);
}

// préchargement des images connues
for (const path of [art.ASSETS.floor, art.ASSETS.bomb, ...Object.values(art.POWER_UPS)]) getImage(path);
