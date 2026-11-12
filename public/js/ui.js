'use strict';

// ============================================================================
// 1. 欢迎页输入与显示入口 / Accueil : éléments de saisie et d’affichage
// ============================================================================
// 对应 index.html 中的表单、输入框和提示区域。
// Correspond au formulaire, au champ de saisie et à la zone de message dans index.html.
const form = document.querySelector('#join-form');
const nickname = document.querySelector('#nickname');
const message = document.querySelector('#message');

// ============================================================================
// 2. 显示调用：showMessage() 更新 #message / Affichage : actualiser #message
// ============================================================================
/**
 * 更新表单下方的状态消息。 / Actualiser le message sous le formulaire.
 * @param {string} text 要显示的文字。 / Texte à afficher.
 * @param {boolean} [isError=false] 是否显示错误样式。 / Appliquer le style d’erreur.
 */
function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

// ============================================================================
// 3. 输入调用：监听 #nickname 的 input 事件 / Saisie : écouter l’événement input
// ============================================================================
// 重新输入时清除旧提示和错误标记。
// Effacer l’ancien message et l’état d’erreur lors d’une nouvelle saisie.
nickname.addEventListener('input', () => {
  nickname.removeAttribute('aria-invalid');
  showMessage('');
});

// ============================================================================
// 4. 按钮调用：开始按钮提交 #join-form / Démarrage : soumettre #join-form
// ============================================================================
// 当前只校验、保存昵称并发送事件；真正启动游戏由接入的游戏模块处理。
// Valider et enregistrer le pseudo ; le module de jeu doit traiter l’événement reçu.
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const playerName = nickname.value.trim();
  if (!playerName) {
    nickname.setAttribute('aria-invalid', 'true');
    showMessage('Entre un pseudo pour commencer.', true);
    nickname.focus();
    return;
  }

  nickname.value = playerName;
  nickname.removeAttribute('aria-invalid');
  // ==== 结束页的数据入口：保存昵称 / Données pour la page de fin : enregistrer le pseudo ====
  try {
    sessionStorage.setItem('grenobleBomber.nickname', playerName);
  } catch {
    // 存储失败仍通过事件传递昵称。 / Transmettre le pseudo par événement même sans stockage.
  }
  // ==== 游戏模块调用通知：{ nickname } / Notification au module de jeu : { nickname } ====
  window.dispatchEvent(
    new CustomEvent('grenoble-bomber:join', { detail: { nickname: playerName } })
  );
  // ==== 欢迎页显示调用：更新状态提示 / Affichage de l’accueil : actualiser le message ====
  showMessage(`Prêt, ${playerName} ! La partie sera disponible après intégration.`);
});
