// Client du jeu : il n'applique aucune règle.
// Il affiche le dernier état envoyé par le serveur et lui transmet les touches.
import { NetworkClient } from "./NetworkClient.js";
import { drawGame, RESSOURCES } from "./render.js";

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
// Boucle d'affichage (le dessin est dans render.js)
// ===========================================================================

function renderLoop() {
    requestAnimationFrame(renderLoop);
    drawGame(snapshot?.game, net.playerId);
}

showScreen("menu");
renderLoop();
