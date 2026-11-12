# Grenoble Bomber — Ziyang 的界面与素材说明

[Version française](README.md)

欢迎页、结束页和排行榜的视觉已完成。
网络、比赛结果和真实积分数据仍待对接。

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 8000 --directory public
```

打开[欢迎页](http://localhost:8000/)或[预览总入口](http://localhost:8000/apercus/)。

## 待对接接口

界面和 Canvas 应通过 Rachel 负责实现的
[public/js/socket.js](../public/js/socket.js) 共用同一个网络连接；该文件目前仅为占位。
下面的事件都是在 `window` 上发送的页面 DOM 事件，目前尚未连接服务器。

### 欢迎页

文件：[index.html](../public/index.html)、[ui.js](../public/js/ui.js)。

- `#nickname`：昵称必填，最多 20 个字符，去除首尾空格。
- `grenoble-bomber:join`：`event.detail = { nickname }`。读取昵称后，向服务器申请进入房间。
- `sessionStorage['grenobleBomber.nickname']`：保存昵称。
- `#message`：显示状态；添加 `error` 类表示错误。

开始按钮目前不会跳转。收到服务器确认后，再进入房间。

### 结束页

文件：[fin.html](../public/fin.html)、[fin.js](../public/js/fin.js)。

- `#end-nickname`：显示保存的昵称。
- `.result-wait` 和 `.menu .message`：分别显示比赛结果和结束提示，收到服务器数据后更新它们的 `textContent`。
- 再玩按钮目前返回欢迎页。

### 排行榜

文件：[classement.html](../public/classement.html)、[classement.js](../public/js/classement.js)。
欢迎页、结束页和独立排行榜页都加载同一个组件。

- [public/data/classement-data.js](../public/data/classement-data.js) 定义 `window.classementData`，包含 `label` 和 `players`；每位玩家使用 `name`、`wins`、`score` 字段，不使用头像，数组顺序就是名次。
- 数据文件先于 `js/classement.js` 加载。修改数据后刷新页面即可更新；双击 HTML 也能使用，无需 `fetch()`。之后对接 Tasnim 的 API 时，保留上述数据字段和下面的调用入口。
- `window.Scoreboard.open()` / `window.Scoreboard.close()`：供其他脚本调用；`body` 上的 `data-scoreboard-auto-open` 让独立页面默认显示面板。
- `#score-button` 或 `[data-scoreboard-open]`：打开排行榜；`C` 切换开关，`Escape` 关闭。
- `grenoble-bomber:scoreboard`：`event.detail = { open: true/false }`。Canvas 可据此在排行榜打开时屏蔽游戏按键。

## 素材位置

图片和音效位于 [public/ressources/](../public/ressources/)，页面直接从这个目录读取。

| 目录 | 内容 |
| --- | --- |
| `batiments/logements/` | 住宅建筑 |
| `batiments/commerces/` | 带商店的完整建筑 |
| `personnages/` | 角色及动画 |
| `bombes/` | 静态炸弹及动画 |
| `bonus/` | 炸弹容量、爆炸范围、移动速度三种木板道具牌（256×256，板外透明，保留原裸图） |
| `obstacles/` | 路锥、垃圾桶、树和灌木 |
| `sols/`、`fonds/`、`decor/`、`interface/` | 地面、背景、缆车和标题等界面素材 |
| `sons/` | 脚步、放置和爆炸音效 |

建筑文件按“序号-占地行数x列数.png”命名，例如 `06-2x2.png`。
名称只计算占地，屋顶不计入。每格为 256×256 像素；
`2x2` 建筑加上顶部 128 像素的屋顶后，整张图片为 512×640 像素。
绘制时保持比例，将图片底边对齐到占用格子的底边。

`bande-animation.png` 是供 Canvas 读取的横向动画帧条；GIF 用于预览动画。
具体尺寸和可用帧条见[素材说明](../public/ressources/lisez-moi.md)。

## 角色控制器案例

文件：[controller.md](../public/js/controller.md)。这个文件是角色控制器的案例，
加载动画和简单操作，用于测试。使用前将 `controller.md` 重命名为 `controller.js`，
再打开 [HTML 案例](../public/apercus/jeu/jeu.html)；页面已引用这个 JS 路径。

- 方向键或 WASD 连续移动；最后按下的方向立即接管，松开后恢复仍按住的方向，全部松开立即停止。
- 空格在脚下最近的格子放炸弹，V 放障碍物；炸弹弹体居中，默认 3 秒后移除并触发爆炸回调。移动、放置和爆炸使用现有音效。
- 警察（`policier`）对应柱弹和路锥；示威者（`manifestant`）对应圆弹和垃圾桶。C 切换排行榜，Escape 关闭，由 `classement.js` 处理。
- `GameController.setPlayer({ id, character })` 绑定玩家，`getPlayer()` 读取绑定；`onPlace(fn)` 和 `onBombExplode(fn)` 提供包含 `ownerId` 的放置记录及爆炸回调。已放物体保留放置当时的归属。
- `setCollision(fn)` 留出碰撞接口；案例包含棋盘边界检查，不模拟火焰传播、伤害或积分规则。正式规则由服务器处理，案例尚未连接网络。

详细接口与阅读顺序见[预览说明](../public/apercus/lisez-moi.md)。
