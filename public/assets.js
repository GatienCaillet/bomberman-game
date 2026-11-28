// Images propres au client, chemins relatifs à public/ressources/.
// Le décor (bâtiments, obstacles, végétation) n'est pas ici : le serveur
// envoie le chemin de chaque image dans game.objects[].sprite (voir GameState.js).

export const ASSETS = {
    floor: 'sols/paves-sans-joint.png',
    bomb: 'bombes/fixes/06-bombe-ronde.png',
};

// Bonus ramassables, par type (le coeur n'a pas d'image : il est dessiné en emoji).
export const POWER_UPS = {
    bombUp: 'bonus/01-capacite-bombes-plaque.png',
    fireUp: 'bonus/02-portee-flammes-plaque.png',
    speedUp: 'bonus/03-vitesse-plaque.png',
};

// Animations GIF des joueurs, classées par personnage et état de déplacement.
export const CHARACTERS = {
    protester: {
        idle: 'personnages/animations/manifestant/repos-face/animation.gif',
        walk: 'personnages/animations/manifestant/marche-profil/animation.gif',
    },
    police: {
        idle: 'personnages/animations/policier/repos-face/animation.gif',
        sideIdle: 'personnages/animations/policier/repos-profil/animation.gif',
        walk: 'personnages/animations/policier/marche-profil/animation.gif',
        frontWalk: 'personnages/animations/policier/marche-face/animation.gif',
    },
};
