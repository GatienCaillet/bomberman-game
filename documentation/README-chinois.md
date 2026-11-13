# Grenoble Bomber 界面与素材

[Version française](README.md) · [本地预览启动方式](../README.md#aperçu-des-interfaces)

欢迎页、结束页和排行榜的视觉已完成，网络、比赛结果和真实积分仍待对接。
本说明汇总原项目组织、预览和素材文档中需要保留的开发信息。

## 待对接接口

欢迎页和结束页共用 [style.css](../public/style.css)，排行榜组件使用 [classement.css](../public/classement.css)。
界面与 Canvas 应共用 [socket.js](../public/js/socket.js) 提供的网络连接；该文件目前仅为占位。
下面的事件是在 `window` 上发送的 DOM 事件，尚未连接服务器。

| 界面 | 文件与接入点 |
| --- | --- |
| 欢迎页 | [index.html](../public/index.html)、[ui.js](../public/js/ui.js)：`#nickname` 必填、最多 20 字符、去除首尾空格。`grenoble-bomber:join` 发送 `{ nickname }`。`#message` 显示状态，`error` 类标记错误。开始按钮等待房间功能接入。 |
| 结束页 | [fin.html](../public/fin.html)、[fin.js](../public/js/fin.js)：`#end-nickname` 读取欢迎页写入的 `sessionStorage['grenobleBomber.nickname']`。用服务器数据更新 `.result-wait` 和 `.menu .message`。再玩按钮返回首页。 |
| 排行榜 | [classement.html](../public/classement.html)、[classement.js](../public/js/classement.js)：首页、结束页和独立页面共用一个面板。 |

排行榜通过 [classement-data.js](../public/data/classement-data.js) 读取 `window.classementData`，
此文件必须先于 `classement.js` 加载。数据结构为 `{ label, players: [{ name, wins, score }] }`，
数组顺序就是名次。目前使用演示数据，之后替换为 API 返回的数据。

- `window.Scoreboard.open()` / `close()`：供其他脚本打开或关闭面板。
- `#score-button` 或 `[data-scoreboard-open]`：打开排行榜；C 切换、Escape 关闭。
- `body` 上的 `data-scoreboard-auto-open`：独立页面加载时自动打开面板。
- `grenoble-bomber:scoreboard` 发送 `{ open: true/false }`，Canvas 可据此暂停游戏按键。

## 素材与绘制规范

[public/ressources/](../public/ressources/) 目前有 **54 个媒体文件：43 个 PNG、8 个 GIF、3 个 WAV**。
在[全部素材图库](../public/apercus/ressources/ressources.html)和[预览入口](../public/apercus/index.html)检查外观、试听音效。

| 目录 | 内容 |
| --- | --- |
| `batiments/logements/`、`batiments/commerces/` | 6 栋住宅、9 栋带商铺建筑，包括新增 2×2 杏色住宅与甜品店 |
| `personnages/` | 警察与示威者的静态图和动画 |
| `bombes/` | 圆弹、柱弹、GIF 预览及 PNG 动画帧条 |
| `bonus/` | 3 张 256×256 木板道具牌：`01-capacite-bombes-plaque.png`（容量）、`02-portee-flammes-plaque.png`（范围）、`03-vitesse-plaque.png`（速度） |
| `obstacles/` | 路锥、垃圾桶、树和灌木 |
| `sols/`、`fonds/`、`decor/`、`interface/` | 地面、格勒诺布尔背景、缆车、标题及装饰人物 |
| `sons/` | 脚步 `pas.wav`、放置 `placement.wav`、爆炸 `explosion.wav` |

每格为 256×256 像素。建筑按 `序号-占地行数x列数.png` 命名，屋顶不计入占地；
PNG 顶部额外包含 128 像素屋顶。因此 `1x2` 为 512×384，`2x2` 为 512×640。
绘制时保持比例，将图片底边对齐占地底边。路锥和垃圾桶的原图均为 320×384。

动画目录中的 `animation.gif` 用于预览，`image-01.png` 是可用时提供的首帧，
`bande-animation.png` 是供 Canvas 读取的横向帧条：

| PNG 帧条 | 总尺寸 | 帧数 | 单帧尺寸 |
| --- | --- | --- | --- |
| `personnages/animations/policier/marche-face/` | 1024×256 | 4 | 256×256 |
| `personnages/animations/policier/marche-profil/` | 2048×256 | 8 | 256×256 |
| `personnages/animations/policier/repos-face/` | 1024×256 | 4 | 256×256 |
| `personnages/animations/policier/repos-profil/` | 1024×256 | 4 | 256×256 |
| `bombes/animations/bombe-ronde/combustion/` | 2048×256 | 8 | 256×256 |
| `bombes/animations/bombe-cylindrique/combustion/` | 2048×384 | 8 | 256×384 |

示威者目前只有正面待机和侧面行走 GIF，没有 PNG 帧条。
Canvas 绘制时设置 `ctx.imageSmoothingEnabled = false`，保持像素边缘清晰。

## 控制器：素材流畅性测试案例

[controller.md](../public/js/controller.md) 是一个 **JavaScript 控制器案例**，
用于测试素材在移动、动画和交互时的流畅性。为了不影响其他人的开发，
特意保留为 `.md`，不接入正式游戏。如果其他人想复用这段代码，
将扩展名改为 `.js` 即可使用；[HTML 案例](../public/apercus/jeu/jeu.html)已引用 `controller.js`。
改名之前，案例页只显示场景，控制器尚未启用。

- 方向键或 WASD 连续移动，空格放炸弹，V 放障碍物；C / Escape 控制排行榜。
- `GameController.setPlayer({ id, character })` / `getPlayer()` 管理玩家；`policier` 对应柱弹和路锥，`manifestant` 对应圆弹和垃圾桶。
- `setSpeed(ms)`、`setBombLifetime(ms)`、`setCollision(fn)` 配置速度、炸弹持续时间和碰撞；`clear()` 停止输入。
- `onPlace(fn)` 接收 `{ kind, ownerId, character, type, x, y }`；`onBombExplode(fn)` 接收 `(x, y, bomb)`，保留原始归属。
- `init({ onMove, onBomb, onObstacle, onReset })` 将输入接入其他模块，会替换案例的默认回调。

案例使用 DOM 和现有音效，不模拟火焰传播、伤害及积分；正式规则和操作许可由服务器决定。

## 保留提示词：统一素材生成标准

[generation/](generation/) 中的提示词需要保留：它们规定素材生成标准，
包括图像清晰度、像素尺度、尺寸、比例、配色和透明背景，便于以后补充或修改素材时沿用。
删除这些提示词会丢失原有参数，后续容易出现图像清晰度不统一、风格或比例不一致等问题。

| 提示词 | 对应素材 |
| --- | --- |
| [住宅生成](generation/batiments/logements/instructions-generation.json)、[比例调整](generation/batiments/logements/instructions-proportions.json)、[2×2 建筑](generation/batiments/batiments-2x2.json) | 住宅与楼房 |
| [商铺](generation/batiments/commerces/instructions-generation.json) | 带商店的建筑 |
| [界面](generation/interface/instructions-generation.json) | 菜单视觉元素 |
| [障碍物](generation/obstacles/destructibles/instructions-obstacles.json) | 路锥、垃圾桶 |
| [升级道具](generation/bonus/instructions-generation.json)、[木板版本](generation/bonus/instructions-plaques.json) | 炸弹容量、范围、速度 |

道具另附 [macOS 导出脚本](generation/bonus/export-sprites.swift)。
补充素材时，复用对应分类的生成参数，并在预览页面检查效果。
