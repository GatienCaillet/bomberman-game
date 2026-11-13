'use strict';

/*
===============================================================================
  共用排行榜 / Composant de classement commun
===============================================================================

  中文说明
  从 data/classement-data.js 读取玩家数据，按文件顺序展示；面板外观由
  classement.css 控制。代码依次分为：0 路径、1 面板、2 数据与渲染、
  3 打开关闭、4 对外入口。原有按钮标记、Scoreboard 方法和状态事件保持兼容。

  Présentation
  Lire les joueurs depuis data/classement-data.js et respecter leur ordre ;
  classement.css définit l’apparence. Organisation : 0 chemins, 1 panneau,
  2 données et rendu, 3 ouverture et fermeture, 4 interface publique.
  Conserver les boutons, les méthodes Scoreboard et les événements existants.

===============================================================================
*/

(() => {
  // ========================================================================
  // 0. 路径与显示模式 / Chemins et mode d’affichage
  // ========================================================================

  // 相对于当前脚本定位 public 目录，兼容嵌套页面。
  // Localiser public depuis ce script pour prendre en charge les pages imbriquées.
  const publicBase = new URL('../', document.currentScript.src);
  const assetBase = new URL('ressources/', publicBase);
  const titleImageURL = new URL('interface/titres/03-titre-classement.png', assetBase);

  // 独立排行榜页默认打开；其他页面等待按钮或脚本调用。
  // Ouvrir automatiquement sur la page dédiée ; ailleurs, attendre un déclencheur.
  const autoOpen = document.body.hasAttribute('data-scoreboard-auto-open');

  // ========================================================================
  // 1. 面板结构与内部状态 / Structure du panneau et état interne
  // ========================================================================

  const overlay = document.createElement('div');
  overlay.className = 'score-overlay';
  overlay.hidden = true;

  // 面板先创建并插入当前页面，打开时只需取消隐藏并填充数据。
  // Créer le panneau dans la page ; à l’ouverture, l’afficher et remplir les données.
  overlay.innerHTML = `
    <section class="score-panel" role="dialog" aria-modal="true" aria-labelledby="score-title">
      <button class="score-close" type="button" aria-label="Fermer le classement">×</button>

      <h2 id="score-title" class="score-heading">
        <span class="score-sr-only">Classement</span>
        <img class="score-title-art" src="${titleImageURL}" alt="" />
      </h2>

      <p class="score-kicker">LES LÉGENDES DU TROTTOIR</p>
      <p class="score-subtitle">Beaucoup de panache. Un peu de dégâts.</p>
      <div class="score-demo"></div>

      <div class="score-table-wrap">
        <table class="score-table">
          <caption class="score-sr-only">Classement des joueurs</caption>
          <thead>
            <tr>
              <th scope="col">RANG</th>
              <th scope="col">JOUEUR</th>
              <th scope="col">VICTOIRES</th>
              <th scope="col">SCORE</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <p class="score-hint">C ou Échap · fermer</p>
    </section>
  `;
  document.body.append(overlay);

  const tableBody = overlay.querySelector('tbody');
  const dataLabel = overlay.querySelector('.score-demo');
  const closeButton = overlay.querySelector('.score-close');

  // 关闭后将焦点还给打开面板的元素。
  // Restaurer le focus sur l’élément qui a ouvert le panneau.
  let previousFocus = null;

  // ========================================================================
  // 2. 数据读取与表格渲染 / Lecture des données et rendu du tableau
  // ========================================================================

  // HTML 已先加载数据文件，这里直接读取，不再发送网络请求。
  // Le HTML a déjà chargé les données ; les lire directement, sans requête réseau.
  function readScores() {
    const data = window.classementData;

    if (!data || !Array.isArray(data.players)) {
      throw new Error('Données du classement absentes ou invalides.');
    }

    return data;
  }

  // 一位玩家对应一行；数组位置决定名次，不在前端重新排序。
  // Une ligne par joueur ; la position dans le fichier détermine le rang.
  function renderPlayers(players) {
    const playerRows = players.map((player, index) => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td class="rank rank-${index + 1}"><span></span></td>
        <td>
          <span class="score-player">
            <span></span>
          </span>
        </td>
        <td></td>
        <td class="score-value"></td>
      `;

      // 四列依次是名次、玩家、胜场和分数。
      // Les quatre colonnes sont le rang, le joueur, les victoires et le score.
      const rankNumber = row.querySelector('.rank span');
      const playerName = row.querySelector('.score-player > span');
      const winsCell = row.cells[2];
      const scoreCell = row.cells[3];

      rankNumber.textContent = String(index + 1).padStart(2, '0');
      playerName.textContent = player.name;
      winsCell.textContent = player.wins;
      scoreCell.textContent = player.score;

      // 第一名保留原有称号；外部文字使用 textContent 填入。
      // Conserver le titre du premier ; insérer les textes externes avec textContent.
      if (index === 0) {
        const firstPlaceTitle = document.createElement('small');
        firstPlaceTitle.textContent = 'LE CÔNE D’OR';
        playerName.append(firstPlaceTitle);
      }

      return row;
    });

    tableBody.replaceChildren(...playerRows);

    if (players.length === 0) {
      showStatus('Aucun joueur pour le moment.');
    }
  }

  // 空列表或错误时，用一条横跨四列的提示替代表格内容。
  // Remplacer le tableau par un message sur quatre colonnes si nécessaire.
  function showStatus(message) {
    const row = document.createElement('tr');
    const cell = row.insertCell();

    cell.colSpan = 4;
    cell.textContent = message;
    tableBody.replaceChildren(row);
  }

  // ========================================================================
  // 3. 打开与关闭 / Ouverture et fermeture
  // ========================================================================

  // 保留原有 Promise 返回形式，其他模块的调用方式不变。
  // Conserver le retour Promise pour les appels des autres modules.
  async function open() {
    if (!overlay.hidden) {
      return;
    }

    // 显示面板、锁定背景滚动，再通知其他模块。
    // Afficher le panneau, bloquer le défilement et informer les autres modules.
    previousFocus = document.activeElement;
    overlay.hidden = false;
    document.documentElement.classList.add('score-dialog-open');
    window.dispatchEvent(new CustomEvent('grenoble-bomber:scoreboard', { detail: { open: true } }));
    closeButton.focus({ preventScroll: true });
    try {
      const data = readScores();
      dataLabel.textContent = data.label || 'CLASSEMENT DES JOUEURS';
      renderPlayers(data.players);
    } catch {
      showStatus('Classement indisponible. Actualise la page pour réessayer.');
    }
  }

  function close() {
    overlay.hidden = true;
    document.documentElement.classList.remove('score-dialog-open');
    window.dispatchEvent(
      new CustomEvent('grenoble-bomber:scoreboard', { detail: { open: false } })
    );

    // 独立页面返回首页；弹窗模式将焦点还给打开它的元素。
    // Revenir à l’accueil sur la page dédiée ; sinon restaurer le focus précédent.
    if (autoOpen) {
      window.location.href = new URL('index.html', publicBase).href;
    } else {
      previousFocus?.focus?.({ preventScroll: true });
    }
  }

  // ========================================================================
  // 4. 对外接口与事件入口 / Interface publique et événements
  // ========================================================================

  // ==== 外部脚本的显示调用：Scoreboard.open() / Scoreboard.close() ====
  // ==== Appels d’affichage depuis un autre script : Scoreboard.open() / Scoreboard.close() ====
  window.Scoreboard = { open, close };

  // ==== 欢迎页和结束页的按钮调用：#score-button 或 [data-scoreboard-open] ====
  // ==== Boutons de l’accueil et de la fin : #score-button ou [data-scoreboard-open] ====
  // 点击按钮或按钮内图标时，调用同一个 open()。
  // Un clic sur le bouton ou son icône appelle la même fonction open().
  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-scoreboard-open], #score-button');

    if (openButton) {
      event.preventDefault();
      open();
    }
  });

  closeButton.addEventListener('click', close);

  // 只点击遮罩空白处时关闭，点击面板内容不关闭。
  // Fermer uniquement lors d’un clic sur le fond, pas sur le contenu du panneau.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  // C 切换、Escape 关闭；输入昵称或使用组合键时不触发 C 快捷键。
  // C bascule le panneau, Échap le ferme ; ignorer C pendant la saisie ou avec un modificateur.
  window.addEventListener(
    'keydown',
    (event) => {
      const target = event.target;
      const isEditing =
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      const isToggleKey =
        event.code === 'KeyC' && !isEditing && !event.ctrlKey && !event.metaKey && !event.altKey;

      if (isToggleKey) {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!event.repeat) {
          if (overlay.hidden) {
            open();
          } else {
            close();
          }
        }
        return;
      }

      if (overlay.hidden) {
        return;
      }

      if (event.code === 'Escape' && !event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }

      // 面板内只有关闭按钮可获得键盘焦点。
      // Le bouton de fermeture est le seul élément focalisable du panneau.
      if (event.code === 'Tab') {
        event.preventDefault();
        closeButton.focus();
      }
    },
    true
  );

  if (autoOpen) {
    open();
  }
})();
