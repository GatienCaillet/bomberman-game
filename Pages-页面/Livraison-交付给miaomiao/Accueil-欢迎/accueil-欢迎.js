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
for (const [variable, chemin] of Object.entries({"--image-integree-1":"Fonds-背景/grenoble-accueil-格城.png"})) {
  document.documentElement.style.setProperty(variable, 'url("' + grenobleRessource(chemin) + '")');
}

;

// Module scene-场景 / 功能模块
(() => {
 'use strict';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 for(const cableway of document.querySelectorAll('[data-cableway]')){
  const train=document.createElement('div');train.className='cableway-train';
  for(let i=0;i<4;i++){
   const carriage=document.createElement('div');carriage.className='cableway-car';
   const cabin=document.createElement('img');
   cabin.src=grenobleRessource('Decor-装饰/16-telepherique-Grenoble-格城缆车.png');
   cabin.dataset.ressource='Decor-装饰/16-telepherique-Grenoble-格城缆车.png';cabin.className='cableway-cabin';cabin.alt='';cabin.draggable=false;
   carriage.append(cabin);train.append(carriage);
  }
  cableway.append(train);
 }
 const art={
  police:['Personnages-角色/Animations-动画/Policier-警察/Repos-face-正站/animation-动画.gif','Personnages-角色/Animations-动画/Policier-警察/Repos-face-正站/image-01-首帧.png',118],
  protester:['Personnages-角色/Animations-动画/Manifestant-抗议者/Repos-face-正站/animation-动画.gif','Personnages-角色/Animations-动画/Manifestant-抗议者/Repos-face-正站/image-01-首帧.png',118],
  walkingPolice:['Personnages-角色/Animations-动画/Policier-警察/Marche-profil-侧走/animation-动画.gif','Personnages-角色/Animations-动画/Policier-警察/Marche-profil-侧走/image-01-首帧.png',112],
  walkingProtester:['Personnages-角色/Animations-动画/Manifestant-抗议者/Marche-profil-侧走/animation-动画.gif','Personnages-角色/Animations-动画/Manifestant-抗议者/Marche-profil-侧走/image-01-首帧.png',112],
  bomb:['Bombes-炸弹/Animations-动画/Bombe-ronde-圆弹/Combustion-燃烧/animation-动画.gif','Bombes-炸弹/Animations-动画/Bombe-ronde-圆弹/Combustion-燃烧/image-01-首帧.png',65],
  cylinder:['Bombes-炸弹/Animations-动画/Bombe-cylindrique-柱弹/Combustion-燃烧/animation-动画.gif','Bombes-炸弹/Animations-动画/Bombe-cylindrique-柱弹/Combustion-燃烧/image-01-首帧.png',52],
  cone:['Obstacles-障碍/Destructibles-可破坏/03-cone-路锥.png',null,59],bin:['Obstacles-障碍/Destructibles-可破坏/04-poubelle-垃圾桶.png',null,59],
  tree:['Obstacles-障碍/Vegetation-植物/02-arbre-树.png',null,72],shrub:['Obstacles-障碍/Vegetation-植物/01-buisson-灌木.png',null,57],
  bakery:['Batiments-建筑/Commerces-商住/04-boulangerie-面包-1.5x1.png',null,70],fruit:['Batiments-建筑/Commerces-商住/02-primeur-果蔬-1.5x2.png',null,104],
  conePolice:['Interface-界面/Personnages-comiques-趣角/policier-cone-锥帽警.png',null,85],binProtester:['Interface-界面/Personnages-comiques-趣角/cache-poubelle-桶中人.png',null,111],
 };
 // Des emplacements réguliers rythment les deux rangées ; le fond est décalé d’une demi-case. / 两排等距，后排错开半位。
 const patterns={
  welcome:{back:['bakery','tree','walkingPolice','shrub','fruit','tree','walkingProtester','shrub','bakery','tree','walkingPolice','shrub'],front:['police','bomb','binProtester','cone','protester','cylinder','conePolice','bin','police','bomb','protester','cone']},
  end:{back:['tree','bakery','walkingProtester','shrub','tree','fruit','walkingPolice','shrub','tree','bakery','walkingProtester','shrub'],front:['protester','cone','conePolice','bomb','police','bin','binProtester','cylinder','protester','cone','police','bomb']},
  scores:{back:['bakery','tree','walkingPolice','shrub','fruit','tree','walkingProtester','shrub','bakery','tree','walkingPolice','shrub'],front:['conePolice','bomb','protester','cone','police','bin','binProtester','cylinder','protester','cone','police','bomb']},
 };
 function render(){
  for(const stage of document.querySelectorAll('[data-parade]')){
   stage.replaceChildren();const pattern=patterns[stage.dataset.parade]||patterns.welcome;
   for(const layer of ['back','front']){
    const row=document.createElement('div');row.className='parade-row parade-row--'+layer;
    pattern[layer].forEach((key,index)=>{
     const [moving,still,size]=art[key],slot=document.createElement('div'),img=document.createElement('img');slot.className='parade-slot';
     img.dataset.ressource=reduced.matches&&still?still:moving;img.src=grenobleRessource(img.dataset.ressource);img.alt='';img.draggable=false;
     img.className='parade-sprite'+(index%4===2?' parade-sprite--flip':'')+(!still?' parade-sprite--bob':'');
     img.style.setProperty('--size',size+'px');img.style.setProperty('--delay',(-index*.31)+'s');slot.append(img);row.append(slot);
    });stage.append(row);
   }
  }
 }
 render();reduced.addEventListener('change',render);
})();

;

// Module accueil-欢迎 / 功能模块
const form = document.querySelector('#join-form');
const nickname = document.querySelector('#nickname');
const message = document.querySelector('#message');

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

nickname.addEventListener('input', () => {
  nickname.removeAttribute('aria-invalid');
  showMessage('');
});

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
  try {
    sessionStorage.setItem('grenobleBomber.nickname', playerName);
  } catch {
    // L’événement transmet le pseudo au jeu intégré même sans stockage local. / 存储失败仍传昵称。
  }
  window.dispatchEvent(new CustomEvent('grenoble-bomber:join', { detail: { nickname: playerName } }));
  showMessage(`Prêt, ${playerName} ! La partie sera disponible après intégration.`);
});

;

// Module classement-积分 / 功能模块
(() => {
 'use strict';
 const standalone=false;
 const asset=grenobleRessource;
 const home="accueil-欢迎.html";
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
