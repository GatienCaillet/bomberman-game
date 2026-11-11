'use strict';

// Images et sons servis depuis public/ressources/.
const assetBase = '../../ressources/';
function grenobleRessource(chemin) {
  return assetBase + chemin;
}
document.querySelectorAll('[data-ressource]').forEach(element => {
  element.src = grenobleRessource(element.dataset.ressource);
});
for (const [variable, chemin] of Object.entries({})) {
  document.documentElement.style.setProperty(variable, 'url("' + grenobleRessource(chemin) + '")');
}
