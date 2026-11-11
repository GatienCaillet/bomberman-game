# Grenoble Bomber — interface et médias / 前端与素材

Les pages sont dans `public/` et leurs fichiers ont des noms ASCII. Les images et sons sont servis depuis `public/ressources/` ; modifier un média met directement à jour la page. / 页面和素材已按项目结构整理；修改素材会直接反映在页面上。

## Aperçu / 预览

Depuis la racine du dépôt : / 在仓库根目录运行：

```sh
cd public
python3 -m http.server 8000
```

Ouvrir `http://localhost:8000/` pour [l’accueil](../index.html), `/fin.html` pour [la fin](../fin.html), `/classement.html` pour [le classement](../classement.html), ou `/apercus/` pour [les démonstrations](index.html). Un serveur Express peut aussi servir `public/` comme dossier statique.

## Points d’intégration / 对接接口

### Accueil / 欢迎

Code : [public/js/ui.js](../js/ui.js).

- `#nickname` : pseudo limité à 20 caractères, espaces de début et de fin supprimés, vide refusé。
- `window` émet `grenoble-bomber:join` avec `event.detail = { nickname }` après validation. Brancher ici la demande de connexion au salon via le module réseau partagé `public/js/socket.js`。
- `sessionStorage['grenobleBomber.nickname']` conserve le pseudo ; `#message` affiche l’état et prend la classe `error` en cas d’erreur。
- Le bouton affiche pour l’instant un message d’attente. La navigation vers le salon doit attendre la confirmation du serveur。

### Fin / 结束

Code : [public/js/fin.js](../js/fin.js).

- `#end-nickname` lit le pseudo dans `sessionStorage` au chargement。
- `.result-wait` et `.menu .message` attendent le résultat et le message de fin envoyés par le serveur ; le serveur décide du résultat et des points。
- Le bouton de revanche revient actuellement à l’accueil。

### Classement / 积分榜

Code : [public/js/classement.js](../js/classement.js) pour la page autonome ; le composant est aussi présent dans les scripts d’accueil et de fin。

- `players` contient actuellement des données de démonstration (`name`, `wins`, `score`, `avatar`). Remplacer celles-ci par la réponse de l’API des scores du pôle 4 ; retirer alors la mention « données de démonstration »。
- `#score-button` ou `[data-scoreboard-open]` ouvre le tableau ; `C` l’ouvre ou le ferme, `Escape` le ferme. Sur la page autonome, fermer revient à l’accueil。
- `window` émet `grenoble-bomber:scoreboard` avec `{ open: true/false }` quand le tableau change d’état ; le client Canvas peut suspendre ses touches pendant l’ouverture。

## Médias et rendu Canvas / 素材与画布

Les originaux pour le pôle 2 sont dans [public/ressources/](../ressources/) ; les pages de [démonstration](index.html) permettent de vérifier leur rendu. Les règles définitives restent côté serveur. / 原素材供 Canvas 小组使用；测试页面用于检查外观，正式规则仍由服务端处理。

| Emprise lignes × colonnes | Dimensions PNG, largeur × hauteur |
| --- | --- |
| `1×1`, `1×2`, `1×3` | `256×384`, `512×384`, `768×384` px |
| `2×1`, `2×2` | `256×640`, `512×640` px |
| Cône, poubelle `1×1` | `320×384` px |

Les bâtiments sont nommés `numero-lignesxcolonnes.png`. Le nom indique
l’emprise au sol ; les 128 px du toit sont inclus dans le PNG uniquement.

Dessiner sans déformation, pied aligné sur le bas des cases occupées. Personnages et bombes rondes : 256×256 px par image ; bombes cylindriques : 256×384 px. / 等比绘制，底边对齐占格底部；角色、圆弹每帧 256×256，柱弹 256×384。

Le module d’explosion de [public/apercus/jeu/jeu.js](jeu/jeu.js) expose `GrenobleFlame.draw(ctx, x, y, size, mask, frame)` ; haut/droite/bas/gauche = 1/2/4/8, `frame` = 0–7. / 火焰接口：上下文、坐标、尺寸、方向位和帧号，上右下左位值 1/2/4/8。

Crédits / 来源：Guillaume Piolle (Eusebius), [Belledonne depuis la Bastille](https://commons.wikimedia.org/wiki/File:Belledonne_depuis_la_Bastille.jpg), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) (montagnes redessinées / 山景重绘) ; [Grenoble Alpes Tourisme](https://www.grenoble-tourisme.com/fr/decouvrir/le-territoire/grenoble-est-vous/ambiances-de-quartiers/) (rues / 街景参考) ; [Pixel Snapper](https://github.com/Hugo-Dz/spritefusion-pixel-snapper) (traitement / 像素处理).
