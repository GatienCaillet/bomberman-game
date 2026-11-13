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
for (const [variable, chemin] of Object.entries({"--image-integree-1":"Sols-地面/paves-sans-joint-无缝石板.png"})) {
  document.documentElement.style.setProperty(variable, 'url("' + grenobleRessource(chemin) + '")');
}

;

// Module catalogue-commerces-店表 / 功能模块
'use strict';
// PNG complets avec bâtiment et commerce intégrés. / 整栋商住图，无需叠加门面。
globalThis.GrenobleShopBuildings = Object.freeze([
  { id: 'market', name: '小超市', kind: 'row2', file: '01-epicerie-杂货-1.5x2.png', base: '02-maison-creme-奶油楼-1.5x2.png', columns: 2, rows: 1 },
  { id: 'fruit', name: '水果店', kind: 'row2', file: '02-primeur-果蔬-1.5x2.png', base: '02-maison-creme-奶油楼-1.5x2.png', columns: 2, rows: 1 },
  { id: 'fashion', name: '时尚店', kind: 'row2Tall', file: '03-boutique-mode-服饰-2.5x2.png', base: '05-immeuble-ocre-赭楼-2.5x2.png', columns: 2, rows: 2 },
  { id: 'bakery', name: '面包店', kind: 'house1', file: '04-boulangerie-面包-1.5x1.png', base: '01-maison-Saint-Laurent-圣屋-1.5x1.png', columns: 1, rows: 1 },
  { id: 'cafe', name: '咖啡店', kind: 'row3', file: '05-cafe-咖啡-1.5x3.png', base: '03-maisons-du-quai-河岸楼-1.5x3.png', columns: 3, rows: 1 },
  { id: 'books', name: '书店', kind: 'house2', file: '06-librairie-书店-2.5x1.png', base: '04-maison-rose-粉楼-2.5x1.png', columns: 1, rows: 2 },
  { id: 'pharmacy', name: '药店', kind: 'row2Tall', file: '07-pharmacie-药店-2.5x2.png', base: '05-immeuble-ocre-赭楼-2.5x2.png', columns: 2, rows: 2 },
  { id: 'flowers', name: '花店', kind: 'house1', file: '08-fleuriste-花店-1.5x1.png', base: '01-maison-Saint-Laurent-圣屋-1.5x1.png', columns: 1, rows: 1 },
]);

;

// Module commerces-商店 / 功能模块
const gallery = document.getElementById('gallery');
    const shopRoot = 'Batiments-建筑/Commerces-商住/';
    const homeRoot = 'Batiments-建筑/Logements-住宅/';
    for (const shop of GrenobleShopBuildings) {
      const figure = document.createElement('figure');
      const height = shop.rows + .5;
      figure.innerHTML = `<div class="stage"><div class="sprite" style="--columns:${shop.columns};--height:${height}"><img data-id="${shop.id}" src="${grenobleRessource(shopRoot + shop.file)}" width="${shop.columns * 256}" height="${height * 256}" alt="${shop.name}与居民楼融合后的完整素材"></div></div><figcaption><strong>${shop.name}</strong><small>${height} × ${shop.columns} 格 · ${shop.columns * 256} × ${height * 256} px</small></figcaption><div class="game-scale"><img data-id="${shop.id}" src="${grenobleRessource(shopRoot + shop.file)}" width="${shop.columns * 32}" height="${height * 32}" alt="${shop.name}的游戏尺寸预览"><span>游戏尺寸<br>每格 32 px</span></div>`;
      gallery.append(figure);
    }
    function setView(showShops) {
      document.getElementById('shops').setAttribute('aria-pressed', String(showShops));
      document.getElementById('homes').setAttribute('aria-pressed', String(!showShops));
      for (const img of gallery.querySelectorAll('img')) {
        const shop = GrenobleShopBuildings.find(shop => shop.id === img.dataset.id);
        img.src = grenobleRessource(showShops ? shopRoot + shop.file : homeRoot + shop.base);
        img.alt = showShops ? shop.name + '与居民楼融合后的完整素材' : shop.name + '对应的原住宅';
      }
    }
    document.getElementById('shops').addEventListener('click', () => setView(true));
    document.getElementById('homes').addEventListener('click', () => setView(false));
    document.getElementById('grid').addEventListener('change', event => document.body.classList.toggle('grid', event.target.checked));
