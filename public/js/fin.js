'use strict';

// ============================================================================
// 结束页显示调用：读取昵称并填入页面 / Fin : lire et afficher le pseudo
// ============================================================================
(() => {
  'use strict';
  try {
    // ==== 数据来源：欢迎页保存的昵称 / Source : pseudo enregistré sur la page d’accueil ====
    const name = sessionStorage.getItem('grenobleBomber.nickname');
    // ==== 显示入口：更新 #end-nickname / Affichage : actualiser #end-nickname ====
    if (name) document.getElementById('end-nickname').textContent = name;
  } catch {}
})();

// ==== 其他结果显示入口：.result-wait 和 .menu .message，等待服务器集成 ====
// ==== Autres zones de résultat : .result-wait et .menu .message, à relier au serveur ====
// ==== 排行榜按钮由 classement.js 统一绑定 / Bouton du classement géré par classement.js ====
