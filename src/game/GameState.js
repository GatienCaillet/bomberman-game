// Module de fonctions pures pour la logique et les collisions (Pôle 3)

// Constantes pour la taille de la grille
const WIDTH = 15;
const HEIGHT = 13;

const TILE_EMPTY = 0;   // Case vide
const TILE_WALL = 1;   // Mur gris indestructible
const TILE_CRATE = 2;  // Brique destructible

const CRATE_DENSITY = 70; // Pourcentage de briques par rapport au case vide (0-100)

// Parameters pour les bombes
const BOMB_TIMER_TICKS = 30; // Nombre de ticks avant l'explosion
const DEFAULT_BOMB_RANGE = 2; // Portée de base de l'explosion

// Génère une grille initiale avec des murs et des briques
function generateGrid() {
    const grid = [];
    
    // Génération du plateau de base
    for (let y = 0; y < HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < WIDTH; x++) {
            // Placement des murs gris indestructibles (coordonnées impaires)
            if (x % 2 !== 0 && y % 2 !== 0) {
                row.push(TILE_WALL);
            } else {
                // Remplissage aléatoire avec des briques
                row.push(Math.random() > (1-(CRATE_DENSITY/100)) ? TILE_CRATE : TILE_EMPTY);
            }
        }
        grid.push(row);
    }

    // Nettoyage des points d'apparition (Safe zones pour les 4 joueurs)
    // Chaque coin nécessite un espace en 'L' de 3 cases pour pouvoir poser une bombe et s'enfuir
    const safeZones = [
        // Spawn Haut Gauche
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 },
        // Spawn Haut Droite
        { x: WIDTH - 1, y: 0 }, { x: WIDTH - 2, y: 0 }, { x: WIDTH - 1, y: 1 },
        // Spawn Bas Gauche
        { x: 0, y: HEIGHT - 1 }, { x: 1, y: HEIGHT - 1 }, { x: 0, y: HEIGHT - 2 },
        // Spawn Bas Droite
        { x: WIDTH - 1, y: HEIGHT - 1 }, { x: WIDTH - 2, y: HEIGHT - 1 }, { x: WIDTH - 1, y: HEIGHT - 2 }
    ];

    // Forcer ces cases à être vides
    safeZones.forEach(pos => {
        grid[pos.y][pos.x] = TILE_EMPTY;
    });

    return grid;
}

// Initialise une nouvelle grille et l'état de départ
function createInitialState() {
    return {
        players: {
            1: { id: 1, name: "Player 1", x: 0, y: 0, alive: true },
            2: { id: 2, name: "Player 2", x: WIDTH - 1, y: 0, alive: true },
            3: { id: 3, name: "Player 3", x: 0, y: HEIGHT - 1, alive: true },
            4: { id: 4, name: "Player 4", x: WIDTH - 1, y: HEIGHT - 1, alive: true }
        },
        bombs: [],
        grid: generateGrid(),
        gameOver: false,
        winner: null
    };
}

// Fonction pure : prend l'état actuel et une action, retourne le nouvel état
function processPlayerInput(currentState, playerId, input) {
    // Clonage profond pour garantir l'immutabilité et une fonction pure
    const newState = JSON.parse(JSON.stringify(currentState));
    const player = newState.players[playerId];

    // Ignorer si le joueur n'existe pas, est mort, ou si la partie est finie
    if (!player || !player.alive || newState.gameOver) return newState;

    let newX = player.x;
    let newY = player.y;

    // Mettre à jour les coordonnées théoriques
    if (input.action === 'move_up') newY -= 1;
    if (input.action === 'move_down') newY += 1;
    if (input.action === 'move_left') newX -= 1;
    if (input.action === 'move_right') newX += 1;

    // Vérifier les collisions avec la grille et les autres objets
    const isWithinBounds = newX >= 0 && newX < WIDTH && newY >= 0 && newY < HEIGHT;
    
    if (isWithinBounds) {
        const isTileEmpty = newState.grid[newY][newX] === TILE_EMPTY;
        const isBombBlocking = newState.bombs.some(b => b.x === newX && b.y === newY);
        
        // Le joueur avance seulement si la case est vide et sans bombe
        if (isTileEmpty && !isBombBlocking) {
            player.x = newX;
            player.y = newY;
        }
    }

    // Poser une bombe si demandé
    if (input.action === 'place_bomb') {
        const hasBombOnTile = newState.bombs.some(b => b.x === player.x && b.y === player.y);
        
        if (!hasBombOnTile) {
            newState.bombs.push({
                id: Date.now() + Math.random().toString(), // ID unique pour la bombe
                x: player.x,
                y: player.y,
                timer: BOMB_TIMER_TICKS, // Ticks avant explosion
                owner: playerId,
                range: DEFAULT_BOMB_RANGE // Portée de base de l'explosion
            });
        }
    }
    return newState;
}

// Fonction pure appelée à chaque "tick" du serveur
function updateGame(currentState) {
    const newState = JSON.parse(JSON.stringify(currentState));
    
    if (newState.gameOver) return newState;

    newState.explosions = []; // Stocke les coordonnées des flammes pour la frame actuelle

    // Décrémenter les minuteurs des bombes
    const survivingBombs = [];
    
    newState.bombs.forEach(bomb => {
        bomb.timer -= 1;
        
        if (bomb.timer <= 0) {
            // Gérer la propagation des explosions
            newState.explosions.push({ x: bomb.x, y: bomb.y }); // Centre de l'explosion
            
            // Propagation en croix (Haut, Bas, Droite, Gauche)
            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            
            directions.forEach(([dx, dy]) => {
                for (let i = 1; i <= bomb.range; i++) {
                    const exX = bomb.x + (dx * i);
                    const exY = bomb.y + (dy * i);
                    
                    if (exY >= 0 && exY < HEIGHT && exX >= 0 && exX < WIDTH) {
                        const tile = newState.grid[exY][exX];
                        
                        if (tile === TILE_WALL) {
                            break; // Un mur gris bloque instantanément la flamme
                        }
                        
                        newState.explosions.push({ x: exX, y: exY });
                        
                        if (tile === TILE_CRATE) {
                            newState.grid[exY][exX] = TILE_EMPTY; // La brique est détruite
                            break; // L'explosion s'arrête sur la brique détruite
                        }
                    }
                }
            });
        } else {
            survivingBombs.push(bomb);
        }
    });
    
    newState.bombs = survivingBombs;

    // Vérifier la mort des joueurs et les conditions de victoire
    let alivePlayersCount = 0;
    let lastAlivePlayerId = null;

    Object.values(newState.players).forEach(p => {
        if (p.alive) {
            // Le joueur est-il sur une case enflammée ?
            const isHit = newState.explosions.some(ex => ex.x === p.x && ex.y === p.y);
            
            if (isHit) {
                p.alive = false;
            } else {
                alivePlayersCount++;
                lastAlivePlayerId = p.id;
            }
        }
    });

    // Condition de fin de partie : 1 survivant ou match nul (0 survivant)
    if (alivePlayersCount <= 1) {
        newState.gameOver = true;
        newState.winner = alivePlayersCount === 1 ? lastAlivePlayerId : 'draw';
    }

    return newState;
}

module.exports = { createInitialState, processPlayerInput, updateGame };