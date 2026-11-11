'use strict';

// Images et sons servis depuis public/ressources/.
const assetBase = 'ressources/';
function grenobleRessource(chemin) {
  return assetBase + chemin;
}
document.querySelectorAll('[data-ressource]').forEach(element => {
  element.src = grenobleRessource(element.dataset.ressource);
});
for (const [variable, chemin] of Object.entries({"--image-integree-1":"fonds/grenoble-accueil.png"})) {
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
   cabin.src=grenobleRessource('decor/16-telepherique-grenoble.png');
   cabin.dataset.ressource='decor/16-telepherique-grenoble.png';cabin.className='cableway-cabin';cabin.alt='';cabin.draggable=false;
   carriage.append(cabin);train.append(carriage);
  }
  cableway.append(train);
 }
 const art={
  police:['personnages/animations/policier/repos-face/animation.gif','personnages/animations/policier/repos-face/image-01.png',118],
  protester:['personnages/animations/manifestant/repos-face/animation.gif','personnages/animations/manifestant/repos-face/image-01.png',118],
  walkingPolice:['personnages/animations/policier/marche-profil/animation.gif','personnages/animations/policier/marche-profil/image-01.png',112],
  walkingProtester:['personnages/animations/manifestant/marche-profil/animation.gif','personnages/animations/manifestant/marche-profil/image-01.png',112],
  bomb:['bombes/animations/bombe-ronde/combustion/animation.gif','bombes/animations/bombe-ronde/combustion/image-01.png',65],
  cylinder:['bombes/animations/bombe-cylindrique/combustion/animation.gif','bombes/animations/bombe-cylindrique/combustion/image-01.png',52],
  cone:['obstacles/destructibles/03-cone.png',null,59],bin:['obstacles/destructibles/04-poubelle.png',null,59],
  tree:['obstacles/vegetation/02-arbre.png',null,72],shrub:['obstacles/vegetation/01-buisson.png',null,57],
  bakery:['batiments/commerces/04-1x1.png',null,70],fruit:['batiments/commerces/02-1x2.png',null,104],
  conePolice:['interface/personnages-comiques/policier-cone.png',null,85],binProtester:['interface/personnages-comiques/cache-poubelle.png',null,111],
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

// Module fin-结束 / 功能模块
(() => {
 'use strict';
 try { const name=sessionStorage.getItem('grenobleBomber.nickname');if(name)document.getElementById('end-nickname').textContent=name; } catch {}
})();

;

// Module classement-积分 / 功能模块
(() => {
 'use strict';
 const standalone=false;
 const asset=grenobleRessource;
 const home="index.html";
 const players=[
  {name:'Baguette.exe',wins:12,score:'2 450',avatar:'interface/personnages-comiques/policier-cone.png'},
  {name:'Capitaine Boum',wins:9,score:'1 980',avatar:'personnages/animations/policier/repos-face/image-01.png'},
  {name:'La Poubelle',wins:7,score:'1 640',avatar:'interface/personnages-comiques/cache-poubelle.png'},
  {name:'Cône-nan',wins:5,score:'1 210',avatar:'obstacles/destructibles/03-cone.png'},
  {name:'Maman, je lag !',wins:3,score:'890',avatar:'personnages/animations/manifestant/repos-face/image-01.png'},
 ];
 const overlay=document.createElement('div');overlay.className='score-overlay'+(standalone?' score-overlay--standalone':'');overlay.hidden=true;
 overlay.innerHTML=`<section class="score-panel" role="${standalone?'region':'dialog'}" ${standalone?'':'aria-modal="true"'} aria-labelledby="score-title">
  <button class="score-close" type="button" aria-label="${standalone?'Retour à l’accueil':'Fermer le classement'}">${standalone?'←':'×'}</button>
  <h2 id="score-title" class="score-heading"><span class="score-sr-only">Classement</span><img class="score-title-art" src="${asset('interface/titres/03-titre-classement.png')}" alt=""></h2>
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
