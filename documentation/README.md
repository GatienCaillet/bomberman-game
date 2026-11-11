# Grenoble Bomber — Interface et ressources de Ziyang

Les pages d’accueil, de fin et de classement sont prêtes visuellement.
Le réseau, les résultats et les scores restent à connecter.

## Aperçu local

Depuis la racine du dépôt :

```sh
python3 -m http.server 8000 --directory public
```

Ouvrir [l’accueil](http://localhost:8000/) ou [les aperçus](http://localhost:8000/apercus/).

## Interfaces à connecter

L’interface et le Canvas doivent partager la même connexion via
[public/js/socket.js](../public/js/socket.js), à fournir par Rachel.
Les événements ci-dessous sont des événements DOM sur `window` ; ils ne
sont pas encore reliés au serveur.

### Accueil

Fichiers : [index.html](../public/index.html) et [ui.js](../public/js/ui.js).

- `#nickname` : pseudo obligatoire, 20 caractères maximum, espaces de début et de fin retirés.
- `grenoble-bomber:join` : `event.detail = { nickname }`. Utiliser ce pseudo pour demander l’entrée dans un salon.
- `sessionStorage['grenobleBomber.nickname']` conserve le pseudo.
- `#message` affiche l’état ; la classe `error` signale une erreur.

Le bouton ne change pas encore de page. Ajouter l’accès au salon après confirmation du serveur.

### Fin de partie

Fichiers : [fin.html](../public/fin.html) et [fin.js](../public/js/fin.js).

- `#end-nickname` affiche le pseudo conservé.
- `.result-wait` et `.menu .message` attendent le résultat et le message du serveur. Mettre à jour leur `textContent`.
- Le bouton de revanche revient actuellement à l’accueil.

### Classement

Fichiers : [classement.html](../public/classement.html) et [classement.js](../public/js/classement.js).
Le tableau existe aussi dans les scripts d’accueil et de fin.

- `players` contient les données de démonstration : `name`, `wins`, `score` et `avatar` (chemin relatif à `public/ressources/`).
- Remplacer ces données par l’API de Tasnim, adapter `.score-table tbody` et retirer la mention de démonstration.
- `#score-button` ou `[data-scoreboard-open]` ouvre le tableau ; `C` le bascule et `Escape` le ferme.
- `grenoble-bomber:scoreboard` : `event.detail = { open: true/false }`. Le Canvas peut utiliser cet événement pour bloquer ses touches pendant l’ouverture.

## Emplacement des ressources

Les images et sons sont dans [public/ressources/](../public/ressources/).
Les pages les chargent directement depuis ce dossier.

| Dossier | Contenu |
| --- | --- |
| `batiments/logements/` | Maisons et immeubles |
| `batiments/commerces/` | Bâtiments avec magasin intégré |
| `personnages/` | Personnages et animations |
| `bombes/` | Bombes fixes et animées |
| `obstacles/` | Cônes, poubelles, arbres et buissons |
| `sols/`, `fonds/`, `decor/`, `interface/` | Sol, paysage, téléphérique et titres |
| `sons/` | Pas, placement et explosion |

Les bâtiments sont nommés `numero-lignesxcolonnes.png`, par exemple `06-2x2.png`.
Le nom indique l’occupation au sol, sans le toit. Une case vaut 256 × 256 px ;
un bâtiment `2x2` mesure 512 × 640 px avec les 128 px du toit.
Conserver les proportions et aligner le bas de l’image sur le bas des cases occupées.

Les fichiers `bande-animation.png` servent au Canvas ; les GIF permettent de voir les animations.
Voir le [guide des ressources](../public/ressources/lisez-moi.md) pour les dimensions et les bandes disponibles.

La [version de test Canvas](../public/apercus/jeu/jeu.html) sert uniquement à vérifier la cohérence des pixels entre les ressources.
Son script expose `GrenobleFlame.draw(ctx, x, y, size, mask, frame)` pour les explosions :
haut/droite/bas/gauche = `1/2/4/8`, et `frame` va de `0` à `7`.
Les règles définitives du jeu restent côté serveur.
