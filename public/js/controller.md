/*
角色控制器案例 / Exemple de contrôleur de personnage

中文说明
这个文件是角色控制器的案例，加载动画和简单操作，用于测试。
将 md 改为 js，即可使用。

Présentation en français
Ce fichier est un exemple de contrôleur de personnage : il charge les animations
et propose des commandes simples pour les tests.
Remplacer l’extension .md par .js pour l’utiliser.

操作：方向键 / WASD 移动，空格放炸弹，V 放障碍物，C 切换排行榜。
Commandes : flèches / WASD pour se déplacer, Espace pour poser une bombe,
V pour poser un obstacle, C pour ouvrir ou fermer le classement.
*/

'use strict';

(() => {
  // 1. 参数与接口 / Réglages et interface
  // 时间单位为毫秒；stepMs 越小，移动越快。
  // Durées en millisecondes ; un stepMs plus petit accélère le joueur.
  const DEFAULT_STEP_MS = 180;
  const DEFAULT_BOMB_MS = 3000;
  const BOMB_FRAMES = 8;
  const assets = new URL('../ressources/', document.currentScript.src);
  // 统一配置角色的炸弹、障碍物和动画。
  // Associer à chaque personnage ses bombes, obstacles et animations.
  const characters = {
    policier: {
      bomb: 'bombe-cylindrique', obstacle: 'cone',
      idle: { face: 'repos-face', profil: 'repos-profil' },
      walk: { face: 'marche-face', profil: 'marche-profil' },
    },
    manifestant: {
      bomb: 'bombe-ronde', obstacle: 'poubelle',
      idle: { face: 'repos-face', profil: 'repos-face' },
      walk: { face: 'marche-profil', profil: 'marche-profil' },
    },
  };
  const obstacleFiles = { cone: '03-cone.png', poubelle: '04-poubelle.png' };
  let stepMs = DEFAULT_STEP_MS;
  let bombMs = DEFAULT_BOMB_MS;
  let canEnter = () => true;
  let onExplode = null;
  let onPlace = null;
  let identity = { id: 'player-1', character: 'policier' };
  let handlers = null;
  let heldKeys = [];

  window.GameController = {
    init,
    clear,
    setPlayer,
    getPlayer,
    // 每格用时，下一帧生效。 / Durée par case, dès la prochaine image.
    setSpeed(ms) {
      stepMs = Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_STEP_MS;
    },
    // 只影响新炸弹。 / Seulement les prochaines bombes.
    setBombLifetime(ms) {
      bombMs = Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_BOMB_MS;
    },
    // rule(x, y, player) 返回 true 才允许进入该整数格。
    // rule(x, y, player) doit renvoyer true pour autoriser l’entrée dans cette case entière.
    setCollision(rule) {
      canEnter = typeof rule === 'function' ? rule : () => true;
    },
    // callback(x, y, bomb) 收到爆炸位置和放置时保存的归属。
    // callback(x, y, bomb) reçoit la position et le propriétaire enregistré à la pose.
    onBombExplode(callback) {
      onExplode = typeof callback === 'function' ? callback : null;
    },
    // callback(item) 在成功放置后收到种类、坐标、角色和 ownerId。
    // callback(item) reçoit le type, la position, le personnage et ownerId après une pose réussie.
    onPlace(callback) {
      onPlace = typeof callback === 'function' ? callback : null;
    },
  };

  // 返回角色资料的副本，避免外部修改当前绑定。 / Renvoyer une copie des informations du joueur.
  function getPlayer() {
    const { bomb, obstacle } = characters[identity.character];
    return { ...identity, bomb, obstacle };
  }

  // 切换玩家前停止旧输入；已放物体保留原来的类型和归属。
  // Arrêter les anciennes commandes ; les objets posés gardent leur type et leur propriétaire.
  function setPlayer({ id = identity.id, character = identity.character } = {}) {
    if (!Object.hasOwn(characters, character)) throw new Error(`Unknown character: ${character}`);
    clear();
    identity = { id, character };
    return getPlayer();
  }

  // 外部回调报错时，演示仍继续运行。 / Une erreur dans un callback ne bloque pas la démo.
  function notify(callback, ...args) {
    try {
      callback?.(...args);
    } catch (error) {
      console.error('GameController:', error);
    }
  }

  // 2. 键盘输入 / Clavier
  // [dx, dy] 表示方向：x 向右增加，y 向下增加。
  // [dx, dy] indique la direction : x augmente vers la droite, y vers le bas.
  const directions = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };
  const actions = { Space: 'onBomb', KeyV: 'onObstacle', KeyR: 'onReset' };

  // 接入游戏已有的回调，并通知新旧模块清空移动输入。
  // Relier les callbacks du jeu et réinitialiser les commandes des anciens et nouveaux modules.
  function init(callbacks = {}) {
    clear();
    handlers = callbacks;
    handlers.onMove?.([], getPlayer());
  }

  // 空按键列表表示停止移动。 / Une liste de touches vide signifie arrêter le déplacement.
  function clear() {
    heldKeys = [];
    handlers?.onMove?.([], getPlayer());
  }

  function isEditing(target) {
    return target instanceof HTMLElement &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }

  // 输入文字或使用系统快捷键时让出控制；忽略系统的长按重复事件。
  // Laisser la saisie et les raccourcis système fonctionner ; ignorer la répétition automatique.
  window.addEventListener('keydown', (event) => {
    if (!handlers) return;
    if (isEditing(event.target) || event.isComposing ||
        event.ctrlKey || event.metaKey || event.altKey) {
      clear();
      return;
    }

    // C / Escape 由 classement.js 处理，面板打开时暂停游戏按键。
    // classement.js gère C / Échap ; suspendre les commandes de jeu pendant son affichage.
    if (document.documentElement.classList.contains('score-dialog-open')) return;
    if (!(directions[event.code] || actions[event.code])) return;
    event.preventDefault();
    if (event.repeat) return;

    if (directions[event.code]) {
      if (heldKeys.includes(event.code)) return;
      // 按下顺序决定优先级，列表最后一个方向优先。
      // La dernière direction ajoutée à la liste est prioritaire.
      heldKeys.push(event.code);
      handlers.onMove?.([...heldKeys], getPlayer());
    } else {
      handlers[actions[event.code]]?.(getPlayer());
    }
  }, true);

  // 松开一个键后保留其他按键，从而恢复仍按住的方向。
  // Retirer seulement la touche relâchée pour reprendre une direction encore maintenue.
  window.addEventListener('keyup', (event) => {
    if (!heldKeys.includes(event.code)) return;
    heldKeys = heldKeys.filter((key) => key !== event.code);
    handlers?.onMove?.([...heldKeys], getPlayer());
  });
  // 失焦、隐藏、编辑文字或打开排行榜时停止，避免角色一直走。
  // Arrêter lors d’une perte de focus, d’un onglet masqué, d’une saisie ou de l’ouverture du classement.
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
  });
  document.addEventListener('focusin', (event) => {
    if (isEditing(event.target)) clear();
  });
  window.addEventListener('grenoble-bomber:scoreboard', (event) => {
    if (event.detail?.open) clear();
  });

  // 3. 音效：复用三个音频，播放失败不影响游戏。
  // Sons : réutiliser trois fichiers audio ; un échec de lecture ne bloque pas le jeu.
  function createSound(name, volume) {
    const audio = new Audio(new URL(`sons/${name}.wav`, assets).href);
    audio.volume = volume;
    return () => {
      if (document.hidden) return;
      try {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch {
        // 媒体未就绪时跳过。 / Ignorer un média indisponible.
      }
    };
  }

  // 4. HTML 演示 / Démonstration HTML
  // 从 HTML / CSS 读取棋盘大小与角色初始位置。 / Lire la grille et la position initiale depuis le HTML / CSS.
  function initDemo(board) {
    const player = board.querySelector('#player');
    const style = getComputedStyle(board);
    const cols = Number(style.getPropertyValue('--cols'));
    const rows = Number(style.getPropertyValue('--rows'));
    if (!player ||
        !Number.isInteger(cols) || cols < 1 || !Number.isInteger(rows) || rows < 1) return;

    setPlayer({
      id: player.dataset.playerId || identity.id,
      character: player.dataset.character || identity.character,
    });
    const playStep = createSound('pas', 0.35);
    const playPlacement = createSound('placement', 0.5);
    const playExplosion = createSound('explosion', 0.5);
    // 用「种类:x,y」记录放置物，保证同种物件不重复占格。
    // Identifier chaque objet par « type:x,y » pour éviter deux objets du même type sur une case.
    const objects = new Map();
    // x / y 可为小数，用于连续移动；放置物时才取最近的整数格。
    // x / y peuvent être décimaux ; arrondir seulement pour choisir une case de pose.
    let x = Number(player.style.getPropertyValue('--x'));
    let y = Number(player.style.getPropertyValue('--y'));
    let activeKey = null;
    let facing = directions.ArrowDown;
    let lastUpdate = performance.now();
    let lastFootstep = -Infinity;

    // 按状态和朝向选动画；路径相同时不重启 GIF，向左时水平翻转。
    // Choisir l’animation selon l’état et la direction ; conserver le GIF courant et inverser vers la gauche.
    function updateAnimation(walking) {
      const [dx] = facing;
      const preset = characters[identity.character];
      const action = walking ? 'walk' : 'idle';
      const view = dx ? 'profil' : 'face';
      const name = preset[action][view];
      const src = new URL(`personnages/animations/${identity.character}/${name}/animation.gif`, assets).href;
      if (player.src !== src) player.src = src;
      player.dataset.playerId = identity.id;
      player.dataset.character = identity.character;
      player.style.transform = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
    }

    // 角色占一格；偏离格线时，检查脚下覆盖的所有格子。
    // Vérifier toutes les cases couvertes par le joueur.
    function canOccupy(nextX, nextY) {
      const actor = getPlayer();
      for (let cx = Math.floor(nextX); cx <= Math.ceil(nextX); cx++) {
        for (let cy = Math.floor(nextY); cy <= Math.ceil(nextY); cy++) {
          if (!canEnter(cx, cy, actor)) return false;
        }
      }
      return true;
    }

    // 位移 = 经过时间 / 每格用时，因此转向不必等待走完整格。
    // Distance = temps écoulé / durée par case : un virage n’attend pas la fin d’une case.
    function updatePlayer(now) {
      // 限制失帧后的单次距离，避免恢复页面时跳跃或跨过碰撞格。
      // Limiter le déplacement après une interruption d’affichage.
      const elapsed = Math.max(0, Math.min(now - lastUpdate, 50));
      lastUpdate = Math.max(lastUpdate, now);
      const direction = directions[activeKey];
      let walking = false;
      if (direction) {
        facing = direction;
        const [dx, dy] = direction;
        const distance = Math.min(elapsed / stepMs, 1);
        const nextX = Math.max(0, Math.min(cols - 1, x + dx * distance));
        const nextY = Math.max(0, Math.min(rows - 1, y + dy * distance));
        if (canOccupy(nextX, nextY)) {
          walking = nextX !== x || nextY !== y;
          x = nextX;
          y = nextY;
        }
      }
      player.style.setProperty('--x', x);
      player.style.setProperty('--y', y);
      updateAnimation(walking);
      // 脚步声只在实际移动时按间隔播放，不在每一帧重复播放。
      // Espacer les bruits de pas pendant le déplacement au lieu de les rejouer à chaque image.
      if (walking && now - lastFootstep >= stepMs) {
        lastFootstep = now;
        playStep();
      }
    }

    function placeObject(kind) {
      // 取脚下最近的格子，避免移动途中把炸弹放在格子之间。
      // Poser sur la case la plus proche des pieds.
      const bx = Math.round(x);
      const by = Math.round(y);
      const cell = `${kind}:${bx},${by}`;
      if (objects.has(cell)) return;
      const actor = getPlayer();
      // 保存放置这一刻的角色与归属，后续切换玩家不会影响这份记录。
      // Conserver le personnage et le propriétaire au moment de la pose, même après un changement de joueur.
      const data = {
        kind, ownerId: actor.id, character: actor.character,
        type: actor[kind], x: bx, y: by,
      };
      const element = document.createElement(kind === 'bomb' ? 'div' : 'img');
      // CSS 根据 class 和 data-type 选择炸弹图片、尺寸和居中方式。
      // Le CSS utilise class et data-type pour choisir l’image, la taille et le centrage de la bombe.
      element.className = `scene-object ${kind}`;
      if (kind === 'bomb') {
        element.setAttribute('role', 'img');
        element.setAttribute('aria-label', '炸弹');
      } else {
        element.src = new URL(`obstacles/destructibles/${obstacleFiles[data.type]}`, assets).href;
        element.alt = data.type;
      }
      Object.assign(element.dataset, { ownerId: actor.id, character: actor.character, type: data.type });
      element.style.setProperty('--x', bx);
      element.style.setProperty('--y', by);
      board.append(element);
      objects.set(cell, { element, data, startedAt: performance.now(), duration: bombMs });
      playPlacement();
      notify(onPlace, { ...data });
    }

    // 按时间推进 8 帧；计时结束后先移除炸弹，再通知游戏处理爆炸。
    // Avancer les 8 images selon le temps ; retirer la bombe avant de notifier le jeu de son explosion.
    function updateBombs(now) {
      for (const [cell, bomb] of objects) {
        if (bomb.data.kind !== 'bomb') continue;
        const progress = Math.max(0, (now - bomb.startedAt) / bomb.duration);
        if (progress < 1) {
          bomb.element.style.setProperty('--frame', Math.floor(progress * BOMB_FRAMES));
          continue;
        }
        objects.delete(cell);
        bomb.element.remove();
        playExplosion();
        notify(onExplode, bomb.data.x, bomb.data.y, { ...bomb.data });
      }
    }

    // 一个循环负责移动与炸弹。 / Une boucle pour le joueur et les bombes.
    function update(now) {
      requestAnimationFrame(update);
      updatePlayer(now);
      updateBombs(now);
    }

    init({
      onMove(keys) {
        // 先计算旧方向到当前时刻的位移，再让最后按下的方向接管。
        // Calculer le déplacement précédent, puis donner la priorité à la dernière touche maintenue.
        updatePlayer(performance.now());
        activeKey = keys.at(-1);
        if (!activeKey) updateAnimation(false);
      },
      onBomb: () => placeObject('bomb'),
      onObstacle: () => placeObject('obstacle'),
    });
    requestAnimationFrame(update);
  }

  // 仅有 data-controller-demo 且尚未接入其他游戏时自动启动。
  // Démarrer automatiquement avec data-controller-demo, sauf si un autre jeu a déjà appelé init().
  function startDemo() {
    const board = document.querySelector('[data-controller-demo]');
    if (board && !handlers) initDemo(board);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDemo, { once: true });
  } else {
    startDemo();
  }
})();
