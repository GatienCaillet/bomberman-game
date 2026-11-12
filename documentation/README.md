# Grenoble Bomber — Interface et ressources de Ziyang

[中文版](README-chinois.md)

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
Ce fichier n’est actuellement qu’un emplacement réservé.
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
L’accueil, la fin et la page dédiée chargent ce même composant.

- [public/data/classement-data.js](../public/data/classement-data.js) définit `window.classementData` avec `label` et `players` ; chaque joueur utilise les champs `name`, `wins` et `score`, sans avatar. L’ordre du fichier détermine le rang.
- Charger ce fichier avant `js/classement.js`. Modifier les données puis actualiser la page ; l’ouverture directe du HTML fonctionne sans `fetch()`. Lors de l’intégration de l’API de Tasnim, conserver ces champs et les points d’entrée ci-dessous.
- `window.Scoreboard.open()` et `window.Scoreboard.close()` permettent l’appel depuis un autre script. `data-scoreboard-auto-open` sur le `body` affiche automatiquement le panneau sur la page dédiée.
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
| `bonus/` | Trois bonus sur plaques en bois : capacité de bombes, portée des flammes et vitesse (PNG 256×256, versions sans plaque conservées) |
| `obstacles/` | Cônes, poubelles, arbres et buissons |
| `sols/`, `fonds/`, `decor/`, `interface/` | Sol, paysage, téléphérique et titres |
| `sons/` | Pas, placement et explosion |

Les bâtiments sont nommés `numero-lignesxcolonnes.png`, par exemple `06-2x2.png`.
Le nom indique l’occupation au sol, sans le toit. Une case vaut 256 × 256 px ;
un bâtiment `2x2` mesure 512 × 640 px avec les 128 px du toit.
Conserver les proportions et aligner le bas de l’image sur le bas des cases occupées.

Les fichiers `bande-animation.png` servent au Canvas ; les GIF permettent de voir les animations.
Voir le [guide des ressources](../public/ressources/lisez-moi.md) pour les dimensions et les bandes disponibles.

## Exemple de contrôleur de personnage

Fichier : [controller.md](../public/js/controller.md). Ce fichier est un exemple de
contrôleur de personnage : il charge les animations et propose des commandes simples
pour les tests. Renommer `controller.md` en `controller.js`, puis ouvrir
l’[exemple HTML](../public/apercus/jeu/jeu.html) ; la page référence déjà ce chemin JS.

- Les flèches ou WASD permettent un déplacement continu. La dernière direction pressée prend immédiatement la priorité ; au relâchement, une direction encore maintenue reprend. Relâcher toutes les touches arrête le joueur.
- Espace pose une bombe sur la case la plus proche des pieds, V pose un obstacle. Le corps de la bombe est centré ; elle disparaît après 3 secondes par défaut et déclenche un callback d’explosion. Les pas, la pose et l’explosion utilisent les sons existants.
- Le policier (`policier`) utilise la bombe cylindrique et le cône ; le manifestant (`manifestant`) utilise la bombe ronde et la poubelle. C bascule le classement, Échap le ferme ; `classement.js` gère ces touches.
- `GameController.setPlayer({ id, character })` associe le joueur et son personnage ; `getPlayer()` lit cette association. `onPlace(fn)` et `onBombExplode(fn)` fournissent les enregistrements de pose et les callbacks d’explosion avec `ownerId`. Les objets posés conservent leur propriétaire d’origine.
- `setCollision(fn)` permet de fournir une règle de collision. La démo vérifie les limites de la grille, sans simuler la propagation des flammes, les dégâts ou le score. Les règles définitives restent côté serveur ; la démo n’est pas encore reliée au réseau.

Voir les interfaces détaillées et l’ordre de lecture dans le [guide des aperçus](../public/apercus/lisez-moi.md).
