// Chemins des images, relatifs à public/ressources/.
// Les variantes d'un même sprite (GIF, première image, bande) ne sont pas des objets différents.
// Ressources nécessaires à la carte : sol et apparences des bombes.
export const ASSETS = {
    floor: 'sols/paves-sans-joint.png',
    bomb: 'bombes/fixes/06-bombe-ronde.png',
    roundBomb: 'bombes/animations/bombe-ronde/combustion/animation.gif',
    cylinderBomb: 'bombes/animations/bombe-cylindrique/combustion/animation.gif',
};
// Bâtiments indestructibles : chaque case occupée reçoit la valeur 1.
export const BUILDINGS = [
    'batiments/logements/01-1x1.png',
    'batiments/logements/02-1x2.png',
    'batiments/logements/03-1x3.png',
    'batiments/logements/04-2x1.png',
    'batiments/logements/05-2x2.png',
    'batiments/commerces/01-1x2.png',
    'batiments/commerces/02-1x2.png',
    'batiments/commerces/03-2x2.png',
    'batiments/commerces/04-1x1.png',
    'batiments/commerces/05-1x3.png',
    'batiments/commerces/06-2x1.png',
    'batiments/commerces/07-2x2.png',
    'batiments/commerces/08-1x1.png',
];
// Obstacles et végétation destructibles : chaque case occupée reçoit la valeur 2.
export const DESTRUCTIBLES = [
    'obstacles/destructibles/03-cone.png',
    'obstacles/destructibles/04-poubelle.png',
    'obstacles/vegetation/01-buisson.png',
    'obstacles/vegetation/02-arbre.png',
];
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
