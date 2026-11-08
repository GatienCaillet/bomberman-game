# Grenoble Bomber — Livraison / 交付说明

Les trois pages sont prêtes visuellement ; réseau, résultats et scores restent à connecter. / 三页视觉已完成，网络、结果和积分待接。

## Démarrer / 启动

Depuis la racine du projet : / 在项目根目录运行：

```sh
python3 -m http.server 8000
```

Ouvrir [l’aperçu général / 总入口](http://localhost:8000/Pages-页面/Tests-测试/apercu-预览.html). Aucun paquet à installer. / 无需安装依赖。

## À transmettre / 交付内容

- [Accueil / 欢迎](Livraison-交付给miaomiao/Accueil-欢迎/accueil-欢迎.html)
- [Fin / 结束](Livraison-交付给miaomiao/Fin-结束/fin-结束.html)
- [Classement / 积分榜](Livraison-交付给miaomiao/Classement-积分/classement-积分.html)

Copier tout le dossier `Livraison-交付给miaomiao/` pour conserver les liens. Chaque page garde son HTML, CSS et JS ensemble ; ses médias sont intégrés au HTML. / 整体复制交付目录，保留页面链接；每页 HTML、CSS、JS 同目录，素材已内嵌。

## Interfaces / 页面接口

Ajouter l’intégration dans le JS de chaque page. L’UI et le Canvas utiliseront le même `socket.js`, à fournir par Rachel. / 对接代码写在各页 JS 中；界面和 Canvas 共用 Rachel 提供的 `socket.js`，当前尚未包含。

### Accueil / 欢迎

Code : [accueil-欢迎.js](Livraison-交付给miaomiao/Accueil-欢迎/accueil-欢迎.js), module `accueil-欢迎`.

- `#nickname` : pseudo, 20 caractères maximum, espaces retirés, vide refusé. / 昵称限 20 字符，去首尾空格，不能为空。
- `window` émet `grenoble-bomber:join`, avec `event.detail = { nickname }`. Écouter cet événement pour envoyer la demande au serveur. / 监听此事件，将昵称交给网络客户端。
- `sessionStorage['grenobleBomber.nickname']` conserve le pseudo ; `#message` affiche l’état, classe `error` en cas d’erreur. / 保存昵称；提示写入 `#message`，错误加 `error` 类。

Cet événement DOM reste dans la page. Après confirmation serveur, ajouter l’accès au salon ; le bouton ne navigue pas encore. / 此事件仅在本页生效；服务端确认后再接房间跳转，目前按钮不跳页。

### Fin / 结束

Code : [fin-结束.js](Livraison-交付给miaomiao/Fin-结束/fin-结束.js), module `fin-结束`.

- `#end-nickname` : pseudo lu depuis le stockage au chargement. / 加载时读取已存昵称。
- `.result-wait` : résultat ; `.menu .message` : message de fin. Mettre à jour leur `textContent` après réception du résultat serveur. / 收到服务端结果后，分别写入胜负和结束提示。
- `.pixel-button--red` : revanche, revient actuellement à l’accueil. / 再玩按钮目前回欢迎页。

La réception du résultat et son transfert vers cette page restent à développer. Le serveur décide du résultat et des points. / 结果接收、跨页传递待开发；胜负和计分由服务端决定。

### Classement / 积分榜

Code : module `classement-积分` dans le JS de chaque page ; [version autonome / 独立页](Livraison-交付给miaomiao/Classement-积分/classement-积分.js).

- `players` contient les données de démonstration : `name`, `wins`, `score` (texte formaté), `avatar` (clé de média intégré). / 演示数据为昵称、胜场、格式化分数和内嵌头像键。
- À connecter : récupérer les scores auprès de l’API de Tasnim, puis adapter le rendu de `.score-table tbody`. L’API fournit l’ordre ; retirer la mention de démonstration. / 接 Tasnim 的 API，按返回顺序渲染表体，去掉演示标识。
- `#score-button` ou `[data-scoreboard-open]` ouvre le tableau ; `C` bascule, `Escape` ferme. La page autonome revient à l’accueil. / 按钮或 C 开关，Esc 关闭；独立页关闭时回欢迎页。
- `grenoble-bomber:scoreboard`, sur `window`, signale `{ open: true/false }` après ouverture ou fermeture. / 开关后发送状态通知，可用于清空游戏按键；不暂停游戏。

## Ressources / 素材

Les originaux pour Zemiao sont dans [Ressources-素材/](../Ressources-素材/). Le [test Canvas / 游戏测试](Tests-测试/Jeu-游戏/jeu-游戏.html) sert à vérifier le rendu ; les règles définitives restent côté serveur. / 原素材交给 Zemiao；游戏测试用于验图，正式规则在服务端。

| Hauteur × largeur / 高×宽 | Emprise lignes × colonnes / 占格行×列 |
| --- | --- |
| `1.5×1`, `1.5×2`, `1.5×3` | `1×1`, `1×2`, `1×3` |
| `2.5×1`, `2.5×2` | `2×1`, `2×2` |
| Cône, poubelle / 路锥、桶 `1.2×1` | `1×1` |

Dessiner sans déformation, pied aligné sur le bas des cases occupées. Personnages et bombes rondes : 256×256 px par image ; bombes cylindriques : 256×384 px. / 等比绘制，底边对齐占格底部；角色、圆弹每帧 256×256，柱弹 256×384。

Explosion : module `explosion-爆炸` de [jeu-游戏.js](Tests-测试/Jeu-游戏/jeu-游戏.js), `GrenobleFlame.draw(ctx, x, y, size, mask, frame)` ; haut/droite/bas/gauche = 1/2/4/8, `frame` = 0–7. / 火焰接口：上下文、坐标、尺寸、方向位和帧号，上右下左位值 1/2/4/8。

Pour modifier un média d’une page, remplacer sa valeur Base64 dans `ressources-integrees` du HTML. Changer l’original ne met pas la page à jour. / 页面换图：替换 HTML 中同名键的 Base64；修改原素材不会自动同步。

Crédits / 来源：Guillaume Piolle (Eusebius), [Belledonne depuis la Bastille](https://commons.wikimedia.org/wiki/File:Belledonne_depuis_la_Bastille.jpg), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) (montagnes redessinées / 山景重绘) ; [Grenoble Alpes Tourisme](https://www.grenoble-tourisme.com/fr/decouvrir/le-territoire/grenoble-est-vous/ambiances-de-quartiers/) (rues / 街景参考) ; [Pixel Snapper](https://github.com/Hugo-Dz/spritefusion-pixel-snapper) (traitement / 像素处理).
