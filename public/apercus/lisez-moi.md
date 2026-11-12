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

Code commun : [public/js/classement.js](../js/classement.js), styles : [public/classement.css](../classement.css), données : [public/data/classement-data.js](../data/classement-data.js)。

- 所有页面共用一份排行榜组件和样式；首页、结束页及游戏脚本不再保存排名数据或面板模板。
- 修改 `public/data/classement-data.js` 后刷新页面，即可更新排名。这个文件只保存 `window.classementData` 数据对象，面板逻辑仍在 `classement.js`。
- `label` 是表格上方的小标签，`players` 是玩家数组。每个玩家包含 `name`（昵称）、`wins`（胜场）、`score`（显示用的分数），不使用玩家头像。数组顺序就是名次，组件只负责读取和展示。
- 按钮使用 `#score-button` 或添加 `data-scoreboard-open` 即可打开面板；其他脚本也可调用 `window.Scoreboard.open()` 或 `window.Scoreboard.close()`。页面需先加载共用 CSS 和脚本，嵌套目录注意调整相对路径。
- 独立页面的 `<body data-scoreboard-auto-open>` 会在加载后默认显示同一个面板，背景上不再放置其他页面装饰；关闭后返回首页。
- 面板支持 `C` 切换、关闭按钮、点击遮罩和 `Escape` 关闭。输入框中键入 C 或使用组合键时不会触发快捷键。
- 保留 `grenoble-bomber:scoreboard` 状态事件，`event.detail = { open: true/false }`；Canvas 可据此清空或暂停自己的按键处理。
- HTML 必须先加载 `data/classement-data.js`，再加载 `js/classement.js`。数据通过普通脚本标签加载，无需 `fetch()`；双击 HTML 和通过本地 HTTP 访问均可使用。
- 后续接数据库时，由后端 API 提供同样的 `label`、`players` 数据，再赋给 `window.classementData`；已有按钮、方法和状态事件无需更名。当前尚未连接数据库。

数据文件示例：

```js
window.classementData = {
  "label": "CLASSEMENT DES JOUEURS",
  "players": [
    {
      "name": "玩家昵称",
      "wins": 12,
      "score": "2 450"
    }
  ]
};
```

### Contrôleur clavier / 键盘控制器

文件：[public/js/controller.md](../js/controller.md)。使用前将扩展名 `.md` 改为 `.js`，
再打开[HTML 案例](jeu/jeu.html)，页面已引用 `controller.js`。 /
Renommer l’extension `.md` en `.js` avant d’ouvrir l’exemple HTML, qui référence déjà `controller.js`.

新手阅读时，先看这三个函数，再看键盘和接口：

| 函数 | 作用 |
| --- | --- |
| `updatePlayer(now)` | 根据方向和经过的时间更新位置 |
| `placeObject(kind)` | 在脚下放炸弹或障碍物，并记录归属 |
| `updateBombs(now)` | 推进炸弹动画，到时移除并通知游戏 |

角色对应关系集中在文件顶部；炸弹图片、尺寸和居中方式在 `jeu.css`。
C / Escape 由 `classement.js` 统一处理，控制器只监听排行榜开关来停止移动。

- 案例使用平铺地面、角色、炸弹和障碍物；地面、角色写在 `jeu/jeu.html`，放置物由控制器直接创建，CSS 负责布局，不使用 Canvas 或随机地图。
- 带 `data-controller-demo` 的场景会自动连接控制器，不需要另写初始化脚本。HTML 中的 `--x`、`--y` 指定位置，`--h` 指定高度；`--cols`、`--rows` 指定场景格数。
- 方向键或 WASD 连续移动，空格放炸弹，V 放角色对应的障碍物，C 切换排行榜。默认移动一格用时 180 毫秒；最后按下的方向立即接管，松开后恢复仍按住的方向，全部松开立即停下，不等待格子边界。炸弹和障碍物落在脚下最近的整数格；炸弹弹体位于该格正中间，引线向上延伸。
- 炸弹的 8 帧动画默认持续 3 秒，到时移除并触发爆炸回调。此案例不模拟爆炸范围或积分规则；V 只演示障碍物放置，实际碰撞规则由接入方提供。
- 成功移动、成功放弹和计时结束时分别播放 `ressources/sons/pas.wav`、`placement.wav` 和 `explosion.wav`。撞墙或在已有炸弹的格子重复放弹不会播放对应音效；音频播放失败不影响操作。
- `setSpeed(ms)` 设置每格用时，下一帧生效；切换方向不会改变实际速度。`setBombLifetime(ms)` 只影响之后放下的炸弹。`setCollision(fn)` 接收整数格坐标和角色资料 `(x, y, player)`，返回 `true` 才允许进入；角色偏离格线时会检查脚下覆盖的所有格子。
- `window.GameController.init({ onMove, onBomb, onObstacle, onReset })` 连接游戏已有函数。`onMove(keys, player)` 接收按下顺序排列的方向键和角色资料；动作回调也收到 `player`，每次按下只调用一次。`init()` 会替换 HTML 演示的输入回调；要继续使用演示并监听放置，请使用 `onPlace()`。
- `window.GameController.clear()` 清空移动输入并立即停下；窗口失焦、页面隐藏、聚焦输入框或收到排行榜打开事件时也会自动清空。清空后需重新按下方向键才会继续移动。
- 一个 `requestAnimationFrame` 循环负责移动与炸弹帧；CSS 不叠加位置过渡。三个音效各复用一个音频对象。`Scoreboard.open()/close()` 和既有状态事件不变。
- 当前页面先加载排名数据，再加载 `controller.js` 和 `classement.js`；场景直接在 HTML 中修改即可。其他游戏仍可通过 `init()` 连接自己的函数，重复初始化不会增加键盘监听器。

### 角色与归属接口 / Personnages et propriétaires

- `setPlayer({ id, character })` 绑定玩家，`getPlayer()` 返回 `{ id, character, bomb, obstacle }` 的副本。HTML 可用 `data-player-id`、`data-character` 设置初始绑定。
- 预设：`policier` → `bombe-cylindrique` / `cone`；`manifestant` → `bombe-ronde` / `poubelle`。对应关系在控制器顶部的 `characters` 中集中修改。示威者目前仅有侧面行走和正面待机动画，其他方向复用已有素材。
- `onPlace(fn)` 在成功放置后接收 `{ kind, ownerId, character, type, x, y }`，其中 `kind` 为 `bomb` 或 `obstacle`；重复占用不会触发。元素也带有 `data-owner-id`、`data-character`、`data-type`。
- `onBombExplode(fn)` 接收 `(x, y, bomb)`；第三项与放置记录一致，保存放置当时的归属。切换角色或玩家不会改变已放物体的类型和归属。正式放置许可、碰撞和爆炸范围仍由游戏模块决定。

```js
GameController.setPlayer({ id: 'player-2', character: 'manifestant' });
GameController.onPlace((item) => {
  console.log(item.ownerId, item.kind, item.type, item.x, item.y);
});
GameController.onBombExplode((x, y, bomb) => {
  console.log(bomb.ownerId, bomb.type, x, y);
});
```

Le mouvement est continu (180 ms par case) : la dernière direction pressée prend
immédiatement la priorité ; au relâchement, la direction encore maintenue reprend.
Espace pose une bombe centrée sur la case, V pose l’obstacle associé. `setPlayer()`
et `getPlayer()` gèrent l’identité et l’équipement ; `onPlace()` et le troisième
argument de `onBombExplode()` conservent le propriétaire d’origine. Une boucle anime
le joueur et les bombes. Les règles définitives restent à fournir par le module de jeu.

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

Crédits / 来源：Guillaume Piolle (Eusebius), [Belledonne depuis la Bastille](https://commons.wikimedia.org/wiki/File:Belledonne_depuis_la_Bastille.jpg), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) (montagnes redessinées / 山景重绘) ; [Grenoble Alpes Tourisme](https://www.grenoble-tourisme.com/fr/decouvrir/le-territoire/grenoble-est-vous/ambiances-de-quartiers/) (rues / 街景参考) ; [Pixel Snapper](https://github.com/Hugo-Dz/spritefusion-pixel-snapper) (traitement / 像素处理).
