# Grenoble Bomber — Ziyang 的界面与素材说明

欢迎页、结束页和排行榜的视觉已完成。
网络、比赛结果和真实积分数据仍待对接。

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 8000 --directory public
```

打开[欢迎页](http://localhost:8000/)或[预览总入口](http://localhost:8000/apercus/)。

## 待对接接口

界面和 Canvas 应通过 Rachel 提供的
[public/js/socket.js](../public/js/socket.js) 共用同一个网络连接。
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
欢迎页和结束页的脚本中也包含排行榜组件。

- `players`：目前是演示数据，字段为 `name`、`wins`、`score`、`avatar`；头像路径相对于 `public/ressources/`。
- 对接 Tasnim 的 API 后，用真实数据渲染 `.score-table tbody`，移除“演示数据”标识。
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
| `obstacles/` | 路锥、垃圾桶、树和灌木 |
| `sols/`、`fonds/`、`decor/`、`interface/` | 地面、背景、缆车和标题等界面素材 |
| `sons/` | 脚步、放置和爆炸音效 |

建筑文件按“序号-占地行数x列数.png”命名，例如 `06-2x2.png`。
名称只计算占地，屋顶不计入。每格为 256×256 像素；
`2x2` 建筑加上顶部 128 像素的屋顶后，整张图片为 512×640 像素。
绘制时保持比例，将图片底边对齐到占用格子的底边。

`bande-animation.png` 是供 Canvas 读取的横向动画帧条；GIF 用于预览动画。
具体尺寸和可用帧条见[素材说明](../public/ressources/lisez-moi.md)。

[Canvas 测试版本](../public/apercus/jeu/jeu.html)仅用于检查素材像素的一致性。
其脚本提供火焰接口 `GrenobleFlame.draw(ctx, x, y, size, mask, frame)`：
上、右、下、左对应方向位 `1/2/4/8`，`frame` 为 `0` 到 `7`。
正式游戏规则由服务器处理。
