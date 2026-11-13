'use strict';

// Module initialisation-初始化 / 功能模块
// Les médias intégrés sont lus dans le HTML de cette page. / 从同页 HTML 读取内嵌素材。
const GrenobleAssets = Object.freeze(JSON.parse(document.getElementById('ressources-integrees').textContent));
function grenobleRessource(chemin) {
  if (!Object.hasOwn(GrenobleAssets, chemin)) throw new Error('Ressource intégrée absente / 缺少内嵌素材 : ' + chemin);
  return GrenobleAssets[chemin];
}
document.querySelectorAll('[data-ressource]').forEach(element => {
  element.src = grenobleRessource(element.dataset.ressource);
});
for (const [variable, chemin] of Object.entries({})) {
  document.documentElement.style.setProperty(variable, 'url("' + grenobleRessource(chemin) + '")');
}

;

// Module batiments-建筑 / 功能模块
document.getElementById('grid').addEventListener('change', event => document.body.classList.toggle('no-grid', !event.target.checked));
