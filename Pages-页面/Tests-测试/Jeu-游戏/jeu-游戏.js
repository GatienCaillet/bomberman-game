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

// Module classement-积分 / 功能模块
(() => {
 'use strict';
 const standalone=false;
 const asset=grenobleRessource;
 const home="../../Livraison-交付给miaomiao/Accueil-欢迎/accueil-欢迎.html";
 const players=[
  {name:'Baguette.exe',wins:12,score:'2 450',avatar:'Interface-界面/Personnages-comiques-趣角/policier-cone-锥帽警.png'},
  {name:'Capitaine Boum',wins:9,score:'1 980',avatar:'Personnages-角色/Animations-动画/Policier-警察/Repos-face-正站/image-01-首帧.png'},
  {name:'La Poubelle',wins:7,score:'1 640',avatar:'Interface-界面/Personnages-comiques-趣角/cache-poubelle-桶中人.png'},
  {name:'Cône-nan',wins:5,score:'1 210',avatar:'Obstacles-障碍/Destructibles-可破坏/03-cone-路锥.png'},
  {name:'Maman, je lag !',wins:3,score:'890',avatar:'Personnages-角色/Animations-动画/Manifestant-抗议者/Repos-face-正站/image-01-首帧.png'},
 ];
 const overlay=document.createElement('div');overlay.className='score-overlay'+(standalone?' score-overlay--standalone':'');overlay.hidden=true;
 overlay.innerHTML=`<section class="score-panel" role="${standalone?'region':'dialog'}" ${standalone?'':'aria-modal="true"'} aria-labelledby="score-title">
  <button class="score-close" type="button" aria-label="${standalone?'Retour à l’accueil':'Fermer le classement'}">${standalone?'←':'×'}</button>
  <h2 id="score-title" class="score-heading"><span class="score-sr-only">Classement</span><img class="score-title-art" src="${asset('Interface-界面/Titres-标题/03-titre-classement-积分.png')}" alt=""></h2>
  <p class="score-kicker">LES LÉGENDES DU TROTTOIR</p>
  <p class="score-subtitle">Beaucoup de panache. Un peu de dégâts.</p>
  <div class="score-demo">DONNÉES DE DÉMONSTRATION</div>
  <div class="score-table-wrap"><table class="score-table"><caption class="score-sr-only">Classement de démonstration des joueurs</caption><thead><tr><th scope="col">RANG</th><th scope="col">JOUEUR</th><th scope="col">VICTOIRES</th><th scope="col">SCORE</th></tr></thead><tbody>${players.map((p,i)=>`<tr><td class="rank rank-${i+1}"><span>${String(i+1).padStart(2,'0')}</span></td><td><span class="score-player"><img src="${asset(p.avatar)}" alt=""><span>${p.name}${i===0?'<small>LE CÔNE D’OR</small>':''}</span></span></td><td>${p.wins}</td><td class="score-value">${p.score}</td></tr>`).join('')}</tbody></table></div>
  <p class="score-hint">${standalone?'Échap · retour à l’accueil':'C ou Échap · fermer'}</p>
 </section>`;
 (standalone?document.getElementById('scoreboard-root')||document.body:document.body).append(overlay);
 const closeButton=overlay.querySelector('.score-close');let previousFocus=null;
 function open(){if(!overlay.hidden)return;previousFocus=document.activeElement;overlay.hidden=false;if(!standalone)document.documentElement.classList.add('score-dialog-open');window.dispatchEvent(new CustomEvent('grenoble-bomber:scoreboard',{detail:{open:true}}));closeButton.focus({preventScroll:true});}
 function close(){if(standalone){window.location.href=home;return;}overlay.hidden=true;document.documentElement.classList.remove('score-dialog-open');window.dispatchEvent(new CustomEvent('grenoble-bomber:scoreboard',{detail:{open:false}}));previousFocus?.focus?.({preventScroll:true});}
 closeButton.addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay&&!standalone)close();});
 document.querySelectorAll('[data-scoreboard-open],#score-button').forEach(button=>button.addEventListener('click',open));
 window.addEventListener('keydown',event=>{
  const editing=event.target instanceof HTMLElement&&(event.target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName));
  if(!overlay.hidden&&(event.code==='KeyC'||event.code==='Escape')){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)close();return;}
  if(!overlay.hidden){
   if(event.code==='Tab'&&!standalone){event.preventDefault();closeButton.focus();}
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyV','KeyR'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();}return;
  }
  if(event.code==='KeyC'&&!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)open();}
 },true);
 if(standalone)open();
})();

;

// Module explosion-爆炸 / 功能模块
// Connexions sur 4 bits : haut=1, droite=2, bas=4, gauche=8 ; bords identiques. / 四位表示上右下左，边缘统一。
window.GrenobleFlame = {
  draw(ctx, x, y, size, mask, frame) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 64, size / 64);
    const layers = [
      { color: '#77272c', half: 13, core: 21 },
      { color: '#e9472c', half: 10, core: 17 },
      { color: '#ff962f', half: 7, core: 13 },
      { color: '#fff1a5', half: 4, core: 8 }
    ];
    for (const {color, half, core} of layers) {
      ctx.fillStyle = color;
      // Centre anguleux et section constante aux raccords. / 中心棱角、接口等宽。
      ctx.fillRect(32 - core, 24, core * 2, 16);
      ctx.fillRect(24, 32 - core, 16, core * 2);
      ctx.fillRect(32 - core + 3, 32 - core + 3, core * 2 - 6, core * 2 - 6);
      if (mask & 1) ctx.fillRect(32 - half, 0, half * 2, 32);
      if (mask & 2) ctx.fillRect(32, 32 - half, 32, half * 2);
      if (mask & 4) ctx.fillRect(32 - half, 32, half * 2, 32);
      if (mask & 8) ctx.fillRect(0, 32 - half, 32, half * 2);
    }
    // Animer seulement le cœur pour préserver les raccords entre cases. / 仅动内部，格间无缝。
    const flicker = [0, 2, 4, 2, 0, -2, -4, -2][frame % 8];
    ctx.fillStyle = '#fff9d3';
    ctx.fillRect(28 + flicker, 28, 8, 8);
    ctx.fillRect(30 + flicker, 24, 4, 16);
    ctx.restore();
  }
};

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

// Module jeu-游戏 / 功能模块
'use strict';

const TILE = 32, COLS = 17, ROWS = 11;
const MOVE_MS = 165, FUSE_MS = 2300, BLAST_MS = 720, RANGE = 2;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
// Chaque pixel logique est agrandi avec le même facteur entier. / 逻辑像素统一整倍放大。
function resizeCanvas() {
  const scale=Math.max(1,Math.floor(Math.min(window.innerWidth/canvas.width,window.innerHeight/canvas.height)));
  canvas.style.width=`${canvas.width*scale}px`;canvas.style.height=`${canvas.height*scale}px`;
}
window.addEventListener('resize',resizeCanvas);resizeCanvas();

// Dimensions : hauteur × largeur, demi-case du toit comprise. / 高×宽，含半格屋顶。
const buildings = {
  house1: { file: '01-maison-Saint-Laurent-圣屋-1.5x1.png', columns: 1, rows: 1 },
  row2: { file: '02-maison-creme-奶油楼-1.5x2.png', columns: 2, rows: 1 },
  row3: { file: '03-maisons-du-quai-河岸楼-1.5x3.png', columns: 3, rows: 1 },
  house2: { file: '04-maison-rose-粉楼-2.5x1.png', columns: 1, rows: 2 },
  row2Tall: { file: '05-immeuble-ocre-赭楼-2.5x2.png', columns: 2, rows: 2 },
};
function buildingFootprint(kind, x, y) {
  const { columns, rows } = buildings[kind];
  return Array.from({ length: columns * rows }, (_, i) =>
    [x + i % columns, y - Math.floor(i / columns)]);
}
const files = {
  ground: 'Sols-地面/paves-sans-joint-无缝石板.png', cone: 'Obstacles-障碍/Destructibles-可破坏/03-cone-路锥.png', bin: 'Obstacles-障碍/Destructibles-可破坏/04-poubelle-垃圾桶.png',
  shrub: 'Obstacles-障碍/Vegetation-植物/01-buisson-灌木.png', tree: 'Obstacles-障碍/Vegetation-植物/02-arbre-树.png',
  ...Object.fromEntries(Object.entries(buildings).map(([kind, spec]) =>
    [kind, 'Batiments-建筑/Logements-住宅/' + spec.file])),
  ...Object.fromEntries(GrenobleShopBuildings.map(shop =>
    ['shop_' + shop.id, 'Batiments-建筑/Commerces-商住/' + shop.file])),
  idleFront: 'Personnages-角色/Animations-动画/Policier-警察/Repos-face-正站/bande-animation-帧条.png', walkFront: 'Personnages-角色/Animations-动画/Policier-警察/Marche-face-正走/bande-animation-帧条.png',
  idleSide: 'Personnages-角色/Animations-动画/Policier-警察/Repos-profil-侧站/bande-animation-帧条.png', walkSide: 'Personnages-角色/Animations-动画/Policier-警察/Marche-profil-侧走/bande-animation-帧条.png',
  bombPolice: 'Bombes-炸弹/Animations-动画/Bombe-cylindrique-柱弹/Combustion-燃烧/bande-animation-帧条.png',
  bombProtester: 'Bombes-炸弹/Animations-动画/Bombe-ronde-圆弹/Combustion-燃烧/bande-animation-帧条.png'
};
const images = {};
// Contours visibles précalculés (alpha ≥ 128), utilisables aussi en file:// sans lecture des pixels. / 预存可见边界，支持本地打开。
const obstacleBounds = {
  cone: { x: 0, y: 0, width: 320, height: 384 },
  bin: { x: 0, y: 0, width: 320, height: 384 },
  shrub: { x: 0, y: 0, width: 256, height: 384 },
  tree: { x: 0, y: 0, width: 256, height: 384 },
  ...Object.fromEntries(Object.entries(buildings).map(([kind, spec]) =>
    [kind, { x: 0, y: 0, width: spec.columns * 256, height: (spec.rows + .5) * 256 }])),
};
const loaded = Promise.all(Object.entries(files).map(([key, path]) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => { images[key] = img; resolve(); };
  img.onerror = () => reject(new Error(`无法加载素材：${path}`));
  img.src = grenobleRessource(path);
})));

const game = { map: [], objects: [], bombs: [], flames: [], player: null, keys: [], lastStep: 0 };
const sounds = Object.fromEntries([
  ['step', 'pas-脚步.wav', 0.35], ['place', 'placement-放置.wav', 0.55], ['explode', 'explosion-爆炸.wav', 0.6]
].map(([name, file, volume]) => [name, {
  index: 0,
  voices: Array.from({ length: 4 }, () => {
    const audio = new Audio(grenobleRessource('Sons-音效/' + file));
    audio.preload = 'auto'; audio.volume = volume;
    return audio;
  })
}]));
function playSound(name) {
  const sound = sounds[name], voice = sound.voices[sound.index++ % sound.voices.length];
  voice.currentTime = 0;
  const result = voice.play();
  if (result) result.catch(() => {});
}
const directions = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1]
};

const FIXED = new Set(['shrub', 'tree', ...Object.keys(buildings),
  ...Object.keys(buildings).map(kind => kind + 'Part')]);
function isFixed(cell) { return FIXED.has(typeof cell === 'object' && cell ? cell.kind : cell); }
function inPlayArea(x,y) { return x>0 && x<COLS-1 && y>0 && y<ROWS-1; }
function makeMap() {
  const map=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  const spawn=new Set(['1,1','2,1','1,2']);
  const neighbors=(x,y)=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
  const streetsConnected=()=>{
    const queue=[[1,1]],seen=new Set(['1,1']);
    for(let i=0;i<queue.length;i++) for(const [x,y] of neighbors(...queue[i])) {
      const key=`${x},${y}`;
      if(inPlayArea(x,y) && !map[y][x] && !seen.has(key)) {seen.add(key);queue.push([x,y]);}
    }
    let free=0;for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(!map[y][x])free++;
    return seen.size===free;
  };
  function shuffledCells(){
    const cells=[];for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)cells.push([x,y]);
    for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
    return cells;
  }
  // Placer les cinq formats de bâtiment avant les doublons et la végétation. / 先放齐五种楼型。
  const fixedTypes=['row2Tall','row3','row2','house2','house1','row2Tall','row2','house2','house1','house1','tree','tree','tree','shrub','shrub','shrub'];
  for(const type of fixedTypes){
    for(const [x,y] of shuffledCells()){
      const parts=buildings[type]?buildingFootprint(type,x,y):[[x,y]];
      if(parts.some(([px,py])=>!inPlayArea(px,py)||spawn.has(`${px},${py}`)||map[py][px]))continue;
      // Laisser une case entre les silhouettes des objets fixes. / 固定物间留一格。
      if(parts.some(([px,py])=>neighbors(px,py).some(([nx,ny])=>isFixed(map[ny]?.[nx]))))continue;
      map[y][x]=type;
      for(const [px,py] of parts.slice(1))map[py][px]=type+'Part';
      if(streetsConnected())break;
      for(const [px,py] of parts)map[py][px]=null;
    }
  }
  // Placer les obstacles destructibles en conservant des rues toutes reliées. / 障碍不切断通路。
  let placed=0;
  for(const [x,y] of shuffledCells()){
    if(placed>=23)break;
    if(map[y][x]||spawn.has(`${x},${y}`))continue;
    // Éviter les accessoires sous le débord arrière des bâtiments et arbres ; le joueur peut y circuler. / 静物避开后檐，角色可通行。
    if(isFixed(map[y+1]?.[x]))continue;
    map[y][x]=Math.random()<.5?'cone':'bin';
    if(streetsConnected())placed++;else map[y][x]=null;
  }
  return map;
}
function reset() {
  const layout=makeMap();
  game.map=Array.from({length:ROWS},()=>Array(COLS).fill(null));game.objects=[];
  const houses=[];
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++) {
    const kind=layout[y][x];
    if(!kind||kind.endsWith('Part'))continue;
    const footprint=buildings[kind]?buildingFootprint(kind,x,y):[[x,y]];
    const object=addObject(kind,x,y,footprint);
    if(buildings[kind])houses.push(object);
  }
  for(let i=houses.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[houses[i],houses[j]]=[houses[j],houses[i]];}
  // Associer chaque commerce à un logement de même format ; le PNG contient déjà la devanture. / 门店匹配楼型，整图绘制。
  const shops=[...GrenobleShopBuildings];
  for(let i=shops.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shops[i],shops[j]]=[shops[j],shops[i]];}
  for(const shop of shops){
    const house=houses.find(object=>object.kind===shop.kind&&!object.shop);
    if(house)house.shop='shop_'+shop.id;
  }
  game.bombs = []; game.flames = []; game.keys = [];
  game.player = { x: 1, y: 1, fromX: 1, fromY: 1, started: 0, moving: false, facing: 'front', flip: false, dx: 0, dy: 1 };
}
// Les cases occupées partagent le même objet ; x/y désignent sa case basse pour le tri en profondeur. / 多格同物，底格排序；图像可越出碰撞区。
function addObject(kind,x,y,footprint=[[x,y]]) {
  const xs=footprint.map(p=>p[0]),ys=footprint.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const width=(maxX-minX+1)*TILE;
  const bounds=obstacleBounds[kind];
  const height=width*bounds.height/bounds.width;
  const object={kind,x,y,footprint,shop:null,visual:{left:minX*TILE,top:(maxY+1)*TILE-height,width,height},depth:(maxY+1)*TILE};
  game.objects.push(object);
  for(const [cx,cy] of footprint)game.map[cy][cx]=object;
  return object;
}
function removeObject(object) {
  for(const [x,y] of object.footprint)if(game.map[y][x]===object)game.map[y][x]=null;
  const index=game.objects.indexOf(object);if(index>=0)game.objects.splice(index,1);
}
function hasBomb(x, y) { return game.bombs.some(b => b.x === x && b.y === y); }
function passable(x, y) {
  return inPlayArea(x,y) && !game.map[y][x] && !hasBomb(x, y);
}
function placeBomb(now) {
  const p = game.player;
  if (!p) return;
  // Pendant la marche, poser la bombe dans la case la plus proche du joueur. / 行走时在最近格放弹。
  const usePrevious = p.moving && now - p.started < MOVE_MS / 2;
  const x = usePrevious ? p.fromX : p.x, y = usePrevious ? p.fromY : p.y;
  if (!hasBomb(x, y)) {
    const kind = Math.random() < 0.5 ? 'police' : 'protester';
    game.bombs.push({ x, y, placed: now, kind });
    playSound('place');
  }
}
function placeObstacle() {
  const p = game.player;
  const x = p.x + p.dx, y = p.y + p.dy;
  if (!passable(x, y) || (p.moving && x === p.fromX && y === p.fromY)) return;
  addObject(Math.random() < 0.5 ? 'cone' : 'bin',x,y);
  playSound('place');
}
function explode(bomb, now) {
  const index = game.bombs.indexOf(bomb);
  if (index === -1) return;
  game.bombs.splice(index, 1);
  playSound('explode');
  game.flames.push({ x: bomb.x, y: bomb.y, kind: 'center', start: now });
  for (const [dx, dy, end, middle] of [[-1,0,'left','horizontal'],[1,0,'right','horizontal'],[0,-1,'up','vertical'],[0,1,'down','vertical']]) {
    const cells = [];
    for (let distance = 1; distance <= RANGE; distance++) {
      const x = bomb.x + dx * distance, y = bomb.y + dy * distance;
      if (!inPlayArea(x,y) || isFixed(game.map[y][x])) break;
      const obstacle = game.map[y][x];
      cells.push([x, y]);
      const hitBomb = game.bombs.find(b => b.x === x && b.y === y);
      if (hitBomb) explode(hitBomb, now);
      if (obstacle) { removeObject(obstacle); break; }
    }
    cells.forEach(([x, y], i) => game.flames.push({ x, y, kind: i === cells.length - 1 ? end : middle, start: now }));
  }
}
function update(now) {
  const p = game.player;
  if (p.moving && now - p.started >= MOVE_MS) p.moving = false;
  if (!p.moving && game.keys.length) {
    const [dx, dy] = directions[game.keys[game.keys.length - 1]];
    p.dx = dx; p.dy = dy;
    if (dx) { p.facing = 'side'; p.flip = dx < 0; }
    else p.facing = 'front';
    if (passable(p.x + dx, p.y + dy)) {
      p.fromX = p.x; p.fromY = p.y; p.x += dx; p.y += dy; p.started = now; p.moving = true;
      if (now - game.lastStep >= 250) { playSound('step'); game.lastStep = now; }
    }
  }
  for (const bomb of [...game.bombs]) if (now - bomb.placed >= FUSE_MS) explode(bomb, now);
  game.flames = game.flames.filter(f => now - f.start < BLAST_MS);
}
function drawStrip(img, frame, x, y, size = TILE, flip = false) {
  ctx.save();
  if (flip) { ctx.translate(x + size, y); ctx.scale(-1, 1); x = 0; y = 0; }
  ctx.drawImage(img, frame * 256, 0, 256, 256, Math.round(x), Math.round(y), size, size);
  ctx.restore();
}
// Un cadrage fixe englobe toutes les images et orientations pour stabiliser taille et pieds. / 固定裁框，角色不缩跳。
const CHARACTER_CROP = { x: 64, y: 44, width: 128, height: 192 };
function drawCharacter(img, frame, x, feetY, flip = false) {
  const crop = CHARACTER_CROP;
  const width = TILE, height = Math.round(width * crop.height / crop.width);
  ctx.save();
  if (flip) { ctx.translate(Math.round(x) + width, 0); ctx.scale(-1, 1); x = 0; }
  ctx.drawImage(img, frame * 256 + crop.x, crop.y, crop.width, crop.height,
    Math.round(x), Math.round(feetY) - height, width, height);
  ctx.restore();
}
function drawTiledImage(img, sx, sy, sw, sh, x, y, width, height, flipX, flipY) {
  ctx.save();
  ctx.translate(x + (flipX ? width : 0), y + (flipY ? height : 0));
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  ctx.restore();
}
const flameCache = new Map();
function drawPixelFlame(x,y,mask,frame) {
  const key=`${mask},${frame}`;
  if (!flameCache.has(key)) {
    const tile=document.createElement('canvas');tile.width=tile.height=64;
    GrenobleFlame.draw(tile.getContext('2d'),0,0,64,mask,frame);
    flameCache.set(key,tile);
  }
  ctx.drawImage(flameCache.get(key),x,y,TILE,TILE);
}
function drawGrid() {
  // Tracer la grille au-dessus des images pour contrôler emprise et débord. / 格线置顶检查占格。
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 48, 48, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= COLS; x++) {
    const lineX = Math.min(x * TILE, canvas.width - 1) + 0.5;
    ctx.moveTo(lineX, 0); ctx.lineTo(lineX, canvas.height);
  }
  for (let y = 0; y <= ROWS; y++) {
    const lineY = Math.min(y * TILE, canvas.height - 1) + 0.5;
    ctx.moveTo(0, lineY); ctx.lineTo(canvas.width, lineY);
  }
  ctx.stroke();
  ctx.restore();
}
function draw(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Répéter une seule texture pavée périodique, sans raccords en miroir. / 同一石板纹理无缝重复。
  const groundSize = images.ground.naturalWidth;
  for(let y=0;y<canvas.height;y+=groundSize)for(let x=0;x<canvas.width;x+=groundSize)
    ctx.drawImage(images.ground,x,y,groundSize,groundSize);
  const actors=[];
  const flameCells = new Map(game.flames.map(f => [`${f.x},${f.y}`, f]));
  for (const f of flameCells.values()) {
    const mask = (flameCells.has(`${f.x},${f.y - 1}`) ? 1 : 0) |
      (flameCells.has(`${f.x + 1},${f.y}`) ? 2 : 0) |
      (flameCells.has(`${f.x},${f.y + 1}`) ? 4 : 0) |
      (flameCells.has(`${f.x - 1},${f.y}`) ? 8 : 0);
    actors.push({depth:(f.y+1)*TILE-.01,draw(){drawPixelFlame(f.x*TILE,f.y*TILE,mask,Math.floor(now/90)%8);}});
  }
  // Dessiner chaque entité une seule fois, même sur plusieurs cases. / 多格物体只绘一次。
  for(const object of game.objects) {
    const {kind,shop,visual,depth}=object;
    actors.push({depth,draw(){
      const bounds = obstacleBounds[kind];
      // Conserver les proportions en remplissant la largeur et ancrer le bas à la profondeur de l’objet. / 等比填宽、底边锚定，正确遮挡。
      ctx.drawImage(images[shop||kind], bounds.x, bounds.y, bounds.width, bounds.height,
        visual.left, visual.top, visual.width, visual.height);
    }});
  }
  for (const b of game.bombs) {
    const frame = Math.min(7, Math.floor((now-b.placed)/FUSE_MS*8));
    const police = b.kind !== 'protester', image = police ? images.bombPolice : images.bombProtester;
    const sourceHeight = police ? 384 : 256, height = police ? TILE*1.5 : TILE;
    actors.push({depth:(b.y+1)*TILE, draw() {
      ctx.drawImage(image,frame*256,0,256,sourceHeight,b.x*TILE,(b.y+1)*TILE-height,TILE,height);
    }});
  }
  const p = game.player;
  const t = p.moving ? Math.min(1, (now-p.started)/MOVE_MS) : 1;
  const x = (p.fromX+(p.x-p.fromX)*t)*TILE, y = (p.fromY+(p.y-p.fromY)*t)*TILE;
  const side = p.facing === 'side';
  const sprite = p.moving ? (side ? images.walkSide : images.walkFront) : (side ? images.idleSide : images.idleFront);
  const count = p.moving && side ? 8 : 4, frame = Math.floor(now/(p.moving ? 90 : 240)) % count;
  actors.push({depth:y+TILE, draw() { drawCharacter(sprite,frame,x,y+TILE,p.flip&&side); }});
  actors.sort((a,b) => a.depth-b.depth);
  for (const actor of actors) actor.draw();
  drawGrid();
}
function loop(now) { update(now); draw(now); requestAnimationFrame(loop); }
window.addEventListener('keydown', event => {
  if (event.code in directions) {
    event.preventDefault();
    if (!game.keys.includes(event.code)) game.keys.push(event.code);
  } else if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) placeBomb(performance.now());
  } else if (event.code === 'KeyV') {
    event.preventDefault();
    if (!event.repeat) placeObstacle();
  } else if (event.code === 'KeyR' && !event.repeat) reset();
});
window.addEventListener('keyup', event => { game.keys = game.keys.filter(key => key !== event.code); });
window.addEventListener('blur', () => { game.keys = []; });
window.addEventListener('grenoble-bomber:scoreboard', event => { if (event.detail.open) game.keys = []; });
reset();
loaded.then(() => requestAnimationFrame(loop)).catch(error => console.error(error));
