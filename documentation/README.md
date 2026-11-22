# Interfaces et ressources de Grenoble Bomber

[中文版](README-chinois.md) · [Lancement de l’aperçu](../README.md#aperçu-des-interfaces)

Les interfaces d’accueil, de fin et de classement sont prêtes visuellement.
Le réseau, les résultats et les scores réels restent à connecter. Ce guide regroupe
les informations utiles auparavant réparties dans les documents de projet, d’aperçus et de ressources.

## Interfaces à connecter

L’accueil et la fin partagent [style.css](../public/style.css).
Le composant de classement utilise [classement.css](../public/classement.css).
L’interface et le Canvas doivent partager la connexion de [socket.js](../public/js/socket.js),
actuellement un emplacement réservé. Les événements ci-dessous sont des événements DOM sur `window`.

| Interface | Fichiers et points d’entrée |
| --- | --- |
| Accueil | [index.html](../public/index.html), [ui.js](../public/js/ui.js) : `#nickname` est obligatoire, limité à 20 caractères et nettoyé des espaces aux extrémités. `grenoble-bomber:join` transmet `{ nickname }`. `#message` affiche l’état, avec la classe `error` si nécessaire. Le bouton attend l’intégration du salon. |
| Fin | [fin.html](../public/fin.html), [fin.js](../public/js/fin.js) : `#end-nickname` lit `sessionStorage['grenobleBomber.nickname']`, enregistré à l’accueil. Alimenter `.result-wait` et `.menu .message` avec les données du serveur. La revanche revient à l’accueil. |
| Classement | [classement.html](../public/classement.html), [classement.js](../public/js/classement.js) : même panneau sur l’accueil, la fin et la page dédiée. |

Le classement lit `window.classementData` depuis [classement-data.js](../public/data/classement-data.js),
à charger avant `classement.js`. Structure : `{ label, players: [{ name, wins, score }] }` ;
l’ordre des joueurs détermine leur rang. Les données actuelles sont des exemples, à remplacer par l’API.

- `window.Scoreboard.open()` / `close()` permettent l’ouverture depuis un autre script.
- `#score-button` ou `[data-scoreboard-open]` ouvre le panneau ; `C` le bascule, `Escape` le ferme.
- `data-scoreboard-auto-open` sur le `body` ouvre le panneau au chargement de la page dédiée.
- `grenoble-bomber:scoreboard` transmet `{ open: true/false }` ; le Canvas peut suspendre les commandes pendant l’ouverture.

## Ressources et rendu

[public/ressources/](../public/ressources/) contient actuellement **54 médias : 43 PNG, 8 GIF et 3 WAV**.
La [galerie](../public/apercus/ressources/ressources.html) et les [aperçus](../public/apercus/index.html)
permettent de vérifier leur aspect et d’écouter les sons.

| Dossier | Contenu |
| --- | --- |
| `batiments/logements/`, `batiments/commerces/` | Six bâtiments résidentiels et neuf bâtiments avec commerce, dont la maison abricot et sa pâtisserie en 2×2 |
| `personnages/` | Policier et manifestant, images fixes et animations |
| `bombes/` | Bombe ronde, bombe cylindrique, aperçus animés et bandes PNG |
| `bonus/` | Trois plaques 256×256 : capacité de bombes (`01-capacite-bombes-plaque.png`), portée des flammes (`02-portee-flammes-plaque.png`), vitesse (`03-vitesse-plaque.png`) |
| `obstacles/` | Cône, poubelle, buisson et arbre |
| `sols/`, `fonds/`, `decor/`, `interface/` | Pavés, paysage de Grenoble, téléphérique, titres et personnages décoratifs |
| `sons/` | `pas.wav`, `placement.wav`, `explosion.wav` |

Une case mesure 256×256 px. Les bâtiments suivent `numero-lignesxcolonnes.png` :
le nom décrit l’emprise au sol, sans les 128 px du toit. Un bâtiment `1x2` mesure
512×384 px, un `2x2` mesure 512×640 px. Conserver les proportions et aligner le pied
sur le bas des cases occupées. Le cône et la poubelle mesurent 320×384 px.

Pour les animations, `animation.gif` sert d’aperçu, `image-01.png` de première image
si disponible, et `bande-animation.png` fournit les images côte à côte au Canvas :

| Bande PNG | Dimensions totales | Images | Dimensions par image |
| --- | --- | --- | --- |
| `personnages/animations/policier/marche-face/` | 1024×256 | 4 | 256×256 |
| `personnages/animations/policier/marche-profil/` | 2048×256 | 8 | 256×256 |
| `personnages/animations/policier/repos-face/` | 1024×256 | 4 | 256×256 |
| `personnages/animations/policier/repos-profil/` | 1024×256 | 4 | 256×256 |
| `bombes/animations/bombe-ronde/combustion/` | 2048×256 | 8 | 256×256 |
| `bombes/animations/bombe-cylindrique/combustion/` | 2048×384 | 8 | 256×384 |

Le manifestant dispose de GIF de repos de face et de marche de profil, sans bande PNG.
Pour conserver les pixels nets, utiliser `ctx.imageSmoothingEnabled = false` dans le Canvas.

## Contrôleur : exemple pour tester la fluidité des ressources

[controller.md](../public/js/controller.md) contient un **exemple de code JavaScript**
pour tester la fluidité des déplacements, des animations et des interactions avec les ressources.
Il est volontairement conservé en `.md`, sans être intégré au jeu,
pour ne pas interférer avec le développement des autres membres de l’équipe.
Pour réutiliser ce code, il suffit de remplacer l’extension `.md` par `.js` ;
l’[exemple HTML](../public/apercus/jeu/jeu.html) référence déjà `controller.js`.
Avant ce renommage, la page montre le décor mais son contrôleur n’est pas actif.

- Flèches ou WASD : déplacement continu ; Espace : bombe ; V : obstacle ; C / Escape : classement.
- `GameController.setPlayer({ id, character })` / `getPlayer()` gèrent le joueur : `policier` utilise la bombe cylindrique et le cône ; `manifestant`, la bombe ronde et la poubelle.
- `setSpeed(ms)`, `setBombLifetime(ms)` et `setCollision(fn)` règlent vitesse, durée des bombes et collisions ; `clear()` arrête les commandes.
- `onPlace(fn)` reçoit `{ kind, ownerId, character, type, x, y }`. `onBombExplode(fn)` reçoit `(x, y, bomb)` avec le propriétaire d’origine.
- `init({ onMove, onBomb, onObstacle, onReset })` permet de réutiliser les commandes avec un autre module ; cela remplace les callbacks de la démonstration.

L’exemple utilise le DOM et les sons existants ; il ne simule ni propagation des flammes,
ni dégâts, ni scores. Les règles définitives et les autorisations restent côté serveur.

## Prompts : conserver les standards de génération

Les prompts de [generation/](generation/) sont conservés volontairement : ils définissent
les standards de création des ressources, notamment la netteté, l’échelle des pixels,
les dimensions, les proportions, la palette et la transparence.
Ils servent de référence lors de l’ajout ou de la modification d’un visuel.
Les supprimer ferait perdre ces paramètres et risquerait de produire des images de netteté
ou de style différents des ressources existantes.

| Instructions | Ressources concernées |
| --- | --- |
| [Génération des logements](generation/batiments/logements/instructions-generation.json), [proportions](generation/batiments/logements/instructions-proportions.json), [bâtiments 2×2](generation/batiments/batiments-2x2.json) | Maisons et immeubles |
| [Commerces](generation/batiments/commerces/instructions-generation.json) | Bâtiments avec magasin intégré |
| [Interface](generation/interface/instructions-generation.json) | Éléments visuels des menus |
| [Obstacles](generation/obstacles/destructibles/instructions-obstacles.json) | Cône et poubelle |
| [Bonus](generation/bonus/instructions-generation.json), [plaques](generation/bonus/instructions-plaques.json) | Capacité, portée et vitesse |

L’[exporteur macOS](generation/bonus/export-sprites.swift) complète les instructions des bonus.
Pour compléter les ressources, reprendre les paramètres du groupe concerné et vérifier le résultat dans les aperçus.
