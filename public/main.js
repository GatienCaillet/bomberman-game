// Client du jeu : il n'applique aucune règle.
// Il affiche le dernier état envoyé par le serveur et lui transmet les touches.
import * as art from "./assets.js";
import { NetworkClient } from "./NetworkClient.js";

const TILE_SIZE = 40;
const RESSOURCES = "/ressources/";

const POWER_UP_SPRITES = {
    bombUp: "bonus/01-capacite-bombes-plaque.png",
    fireUp: "bonus/02-portee-flammes-plaque.png",
    speedUp: "bonus/03-vitesse-plaque.png",
};

const SOUNDS = {
    bombPlaced: "sons/placement.wav",
    bombExploded: "sons/explosion.wav",
};

// event.code ne dépend pas de la disposition du clavier :
// KeyW/KeyA/KeyS/KeyD = ZQSD en AZERTY, WASD en QWERTY.
const KEY_DIRECTIONS = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
};

const $ = (id) => document.getElementById(id);
const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");

const net = new NetworkClient();
// dernier état reçu : { code, hostId, game }
let snapshot = null;
// vrai entre l'entrée dans un salon et sa sortie (ignore les états qui arrivent après)
let inRoom = false;

// ===========================================================================
// Réseau
// ===========================================================================

net.onStatus = (status) => {
    if (status === "connected") {
        $("connection-status").textContent = "Connecté au serveur";
        return;
    }
    $("connection-status").textContent = "Connexion perdue, reconnexion…";
    if (inRoom) {
        leaveRoom();
        $("menu-error").textContent = "Connexion perdue avec le serveur.";
    }
};

net.onState = (next) => {
    if (!inRoom) return;
    const previousPhase = snapshot?.game.phase;
    snapshot = next;
    if (next.game.phase !== previousPhase) onPhaseChange(next.game.phase);
    updateUi();
};

net.onEvent = (event) => {
    if (!inRoom) return;
    if (SOUNDS[event.type]) playSound(SOUNDS[event.type]);

    switch (event.type) {
        case "roundStarted":
            showMessage(`Manche ${event.round}`);
            break;
        case "playerHit":
            if (event.playerId === net.playerId) showMessage("Touché !");
            break;
        case "playerDied":
            showMessage(event.playerId === net.playerId
                ? "Tu es éliminé"
                : `${nameOf(event.playerId)} est éliminé`);
            break;
        case "roundEnded":
            showMessage(event.winnerId
                ? `${nameOf(event.winnerId)} remporte la manche ${event.round}`
                : `Manche ${event.round} : match nul`, 3000);
            break;
        case "playerLeft":
            showMessage(`${nameOf(event.playerId)} a quitté la partie`);
            break;
    }
};

function onPhaseChange(phase) {
    if (phase === "playing") {
        // Le serveur remet les entrées à zéro au début d'une manche :
        // on oublie la dernière direction envoyée et on renvoie celle maintenue.
        net.lastDirection = null;
        sendHeldDirection();
    }
}

// ===========================================================================
// Menu et salon
// ===========================================================================

$("pseudo").value = localStorage.getItem("pseudo") ?? "";

function getPseudo() {
    const pseudo = $("pseudo").value.trim();
    localStorage.setItem("pseudo", pseudo);
    return pseudo;
}

async function enterRoom(request) {
    $("menu-error").textContent = "";
    inRoom = true;
    try {
        await request();
        updateUi();
    } catch (error) {
        inRoom = false;
        $("menu-error").textContent = error.message;
    }
}

function leaveRoom() {
    net.leaveRoom();
    inRoom = false;
    snapshot = null;
    heldDirections.length = 0;
    showScreen("menu");
}

$("create-btn").onclick = () =>
    enterRoom(() => net.createRoom(getPseudo(), Number($("rounds").value)));

$("join-btn").onclick = () =>
    enterRoom(() => net.joinRoom($("room-code").value, getPseudo()));

$("room-code").addEventListener("keydown", (event) => {
    if (event.key === "Enter") $("join-btn").click();
});

$("start-btn").onclick = async () => {
    $("lobby-error").textContent = "";
    try {
        await net.startGame();
    } catch (error) {
        $("lobby-error").textContent = error.message;
    }
};

$("leave-btn").onclick = leaveRoom;
$("back-btn").onclick = leaveRoom;

// ===========================================================================
// Interface (HTML)
// ===========================================================================

function showScreen(name) {
    $("menu").hidden = name !== "menu";
    $("lobby").hidden = name !== "lobby";
    $("game-page").hidden = name !== "game";
}

function getMe() {
    return snapshot?.game.players.find((player) => player.id === net.playerId);
}

function nameOf(playerId) {
    return snapshot?.game.players.find((player) => player.id === playerId)?.name ?? "?";
}

// Le serveur envoie un état toutes les 50 ms : on ne reconstruit une liste
// que si son contenu a changé, sinon un clic tomberait sur un bouton remplacé.
const lastRendered = {};
function renderOnce(key, value, render) {
    if (lastRendered[key] === value) return;
    lastRendered[key] = value;
    render();
}

function updateUi() {
    if (!snapshot) return;
    const { game } = snapshot;

    if (game.phase === "lobby") {
        showScreen("lobby");
        renderLobby();
        return;
    }

    showScreen("game");
    updatePlayerInfo();
    renderAugmentPanel();
    renderResult();
}

function renderLobby() {
    const { game, code, hostId } = snapshot;
    const isHost = hostId === net.playerId;

    $("lobby-code").textContent = code;
    $("start-btn").hidden = !isHost;
    $("start-btn").disabled = game.players.length < game.config.minPlayers;
    $("lobby-wait").hidden = isHost;

    // net.playerId fait partie de la clé : le premier état arrive avant la
    // réponse du serveur qui nous donne notre id
    const list = game.players.map((p) => `${p.id}:${p.name}`).join("|") + hostId + net.playerId;
    renderOnce("lobby", list, () => {
        $("lobby-players").replaceChildren(...game.players.map((player) => {
            const item = document.createElement("li");
            item.textContent = player.name;
            if (player.id === hostId) item.textContent += " (hôte)";
            if (player.id === net.playerId) item.classList.add("me");
            return item;
        }));
    });
}

// Informations du joueur local
function updatePlayerInfo() {
    const { game } = snapshot;
    const me = getMe();
    if (!me) return;

    const hearts = Math.max(0, me.hearts);
    const lost = Math.max(0, me.stats.maxHearts - hearts);

    $("name").textContent = me.name;
    $("score").textContent = `Score : ${me.score}`;
    $("lives").textContent = me.alive || game.phase !== "playing"
        ? "❤️".repeat(hearts) + "🖤".repeat(lost)
        : "💀 Éliminé";
    $("speed").textContent = `⚡ x${Number(me.stats.speed.toFixed(2))}`;
    $("bombs").textContent = `💣 ${me.stats.maxBombs}   🔥 ${me.stats.bombRange}`;
    $("round").textContent = `Manche ${game.round}/${game.config.totalRounds}`;

    const remaining = Math.max(0, (game.roundEndsAt ?? 0) - game.time);
    const seconds = Math.ceil(remaining / 1000);
    $("timer").textContent = game.phase === "playing"
        ? `⏱ ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
        : "";
}

function renderAugmentPanel() {
    const { game } = snapshot;
    const show = game.phase === "augment";
    $("augment-panel").hidden = !show;
    if (!show) return;

    const offer = getMe()?.augmentOffer ?? [];
    $("augment-wait").textContent = offer.length ? "" : "En attente des autres joueurs…";

    renderOnce("augments", offer.join(","), () => {
        $("augment-choices").replaceChildren(...offer.map((id) => {
            const augment = net.augmentCatalog.find((item) => item.id === id);
            const button = document.createElement("button");
            button.className = "augment";
            button.innerHTML = "<strong></strong><span></span>";
            button.querySelector("strong").textContent = augment?.name ?? id;
            button.querySelector("span").textContent = augment?.description ?? "";
            button.onclick = () => net.chooseAugment(id);
            return button;
        }));
    });
}

function renderResult() {
    const { game } = snapshot;
    const show = game.phase === "gameOver";
    $("game-result").hidden = !show;
    if (!show) return;

    const won = game.winnerId === net.playerId;
    $("result-title").textContent = won ? "VICTOIRE" : "DÉFAITE";
    $("result-title").className = "result-title " + (won ? "win" : "lose");
    $("result-message").textContent = won
        ? "Tu as le meilleur score !"
        : `${nameOf(game.winnerId)} remporte la partie.`;

    // même ordre que getResults() côté serveur
    const ranking = [...game.players].sort((a, b) =>
        b.score - a.score || b.roundWins - a.roundWins || b.kills - a.kills);

    renderOnce("ranking", JSON.stringify(ranking.map((p) => [p.id, p.score])), () => {
        $("ranking-body").replaceChildren(...ranking.map((player, index) => {
            const row = document.createElement("tr");
            if (player.id === net.playerId) row.classList.add("me");
            for (const value of [index + 1, player.name, player.score, player.roundWins, player.kills]) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            }
            return row;
        }));
    });
}

let messageTimer = null;
function showMessage(text, duration = 2000) {
    const message = $("message");
    message.textContent = text;
    message.classList.add("visible");
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => message.classList.remove("visible"), duration);
}

function playSound(path) {
    const sound = new Audio(RESSOURCES + path);
    sound.volume = 0.4;
    // le navigateur peut refuser le son tant que la page n'a pas été cliquée
    sound.play().catch(() => {});
}

// ===========================================================================
// Clavier
// ===========================================================================

// Directions maintenues, la dernière appuyée en dernier :
// relâcher une touche reprend la direction encore maintenue.
const heldDirections = [];

function sendHeldDirection() {
    net.sendDirection(heldDirections.at(-1) ?? null);
}

function isTyping(event) {
    return ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName);
}

document.addEventListener("keydown", (event) => {
    if (!inRoom || isTyping(event)) return;
    const direction = KEY_DIRECTIONS[event.code];

    if (direction) {
        event.preventDefault();
        if (!heldDirections.includes(direction)) heldDirections.push(direction);
        sendHeldDirection();
    } else if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) net.placeBomb();
    }
});

document.addEventListener("keyup", (event) => {
    const direction = KEY_DIRECTIONS[event.code];
    if (!direction) return;
    const index = heldDirections.indexOf(direction);
    if (index !== -1) heldDirections.splice(index, 1);
    if (inRoom) sendHeldDirection();
});

// sans ça, le joueur continuerait d'avancer après un changement de fenêtre
window.addEventListener("blur", () => {
    heldDirections.length = 0;
    if (inRoom) sendHeldDirection();
});

// ===========================================================================
// Dessin (canvas)
// ===========================================================================

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
        const path = POWER_UP_SPRITES[powerUp.type];
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

// Choisit l'animation selon le personnage, la direction et le mouvement.
function getAnimation(character, player) {
    const moving = player.alive && player.input?.direction != null;
    const sideways = player.facing === "left" || player.facing === "right";

    if (moving) {
        if (!sideways && character.frontWalk) return { path: character.frontWalk, profile: false };
        return { path: character.walk, profile: true };
    }
    if (sideways && character.sideIdle) return { path: character.sideIdle, profile: true };
    return { path: character.idle, profile: false };
}

function drawPlayers(game) {
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
        sprite.label.textContent = player.name;
        sprite.box.classList.toggle("me", player.id === net.playerId);
        Object.assign(sprite.box.style, {
            display: player.alive ? "block" : "none",
            width: size + "px",
            height: size + "px",
            // centré sur la case, les pieds sur le bas de la case
            left: ((player.x + 0.5) * TILE_SIZE * scale - size / 2) + "px",
            top: ((player.y + 1) * TILE_SIZE * scale - size) + "px",
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

function renderGame() {
    requestAnimationFrame(renderGame);
    const game = snapshot?.game;
    if (!game || !game.map.length) return;

    resizeCanvas(game.config);
    // redimensionner le canvas réinitialise ce réglage
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGround(game);
    drawObjects(game);
    drawPowerUps(game);
    drawBombs(game);
    drawFlames(game);
    drawPlayers(game);
}

// préchargement des images connues
for (const path of [art.ASSETS.floor, art.ASSETS.bomb, ...Object.values(POWER_UP_SPRITES)]) getImage(path);

showScreen("menu");
renderGame();
