// Les variantes d'un même sprite (GIF, première image, bande) ne sont pas des objets différents.
// Ressources nécessaires à la carte : sol et apparences des bombes.
export const ASSETS = {
    floor: 'Sols/paves-sans-joint.png',
    bomb: 'Bombes/Fixes/06-bombe-ronde.png',
    roundBomb: 'Bombes/Animations/Bombe-ronde/Combustion/animation.gif',
    cylinderBomb: 'Bombes/Animations/Bombe-cylindrique/Combustion/animation.gif',
};
// Bâtiments indestructibles : chaque case occupée reçoit la valeur 1.
export const BUILDINGS = [
    'Batiments/Logements/01-maison-Saint-Laurent--1.5x1.png',
    'Batiments/Logements/02-maison-creme--1.5x2.png',
    'Batiments/Logements/03-maisons-du-quai--1.5x3.png',
    'Batiments/Logements/04-maison-rose--2.5x1.png',
    'Batiments/Logements/05-immeuble-ocre--2.5x2.png',
    'Batiments/Commerces/01-epicerie--1.5x2.png',
    'Batiments/Commerces/02-primeur--1.5x2.png',
    'Batiments/Commerces/03-boutique-mode--2.5x2.png',
    'Batiments/Commerces/04-boulangerie--1.5x1.png',
    'Batiments/Commerces/05-cafe--1.5x3.png',
    'Batiments/Commerces/06-librairie--2.5x1.png',
    'Batiments/Commerces/07-pharmacie--2.5x2.png',
    'Batiments/Commerces/08-fleuriste--1.5x1.png',
];
// Obstacles et végétation destructibles : chaque case occupée reçoit la valeur 2.
export const DESTRUCTIBLES = [
    'Obstacles/Destructibles/03-cone.png',
    'Obstacles/Destructibles/04-poubelle.png',
    'Obstacles/Vegetation/01-buisson.png',
    'Obstacles/Vegetation/02-arbre.png',
];
// Animations GIF des joueurs, classées par personnage et état de déplacement.
export const CHARACTERS = {
    protester: {
        idle: 'Personnages/Animations/Manifestant/Repos-face/animation.gif',
        walk: 'Personnages/Animations/Manifestant/Marche-profil/animation.gif',
    },
    police: {
        idle: 'Personnages/Animations/Policier/Repos-face/animation.gif',
        sideIdle: 'Personnages/Animations/Policier/Repos-profil/animation.gif',
        walk: 'Personnages/Animations/Policier/Marche-profil/animation.gif',
        frontWalk: 'Personnages/Animations/Policier/Marche-face/animation.gif',
    },
};
