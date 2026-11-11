'use strict';

document.getElementById('echelle').addEventListener('change', event => {
  document.documentElement.style.setProperty('--tuile', `${event.target.value}px`);
});
document.getElementById('grille').addEventListener('change', event => {
  document.body.classList.toggle('sans-grille', !event.target.checked);
});

const logement = document.getElementById('logement');
const commerce = document.getElementById('commerce');
const verification = document.getElementById('verification');

Promise.all([logement.decode(), commerce.decode()]).then(() => {
  for (const image of [logement, commerce]) {
    if (image.naturalWidth !== 512 || image.naturalHeight !== 640) throw new Error('Dimensions inattendues.');
  }
  const donnees = [logement, commerce].map(image => {
    const toile = document.createElement('canvas');
    toile.width = 512;
    toile.height = 640;
    const contexte = toile.getContext('2d');
    contexte.drawImage(image, 0, 0);
    return contexte.getImageData(0, 0, 512, 640).data;
  });
  let differencesExterieures = 0;
  let erreursGrille = 0;
  for (let y = 0; y < 640; y++) {
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const origine = (Math.floor(y / 4) * 4 * 512 + Math.floor(x / 4) * 4) * 4;
      const dansCommerce = x >= 32 && x < 480 && y >= 352 && y < 636;
      for (let c = 0; c < 4; c++) {
        if (!dansCommerce && donnees[0][i + c] !== donnees[1][i + c]) differencesExterieures++;
        for (const pixels of donnees) if (pixels[i + c] !== pixels[origine + c]) erreursGrille++;
      }
    }
  }
  if (differencesExterieures || erreursGrille) throw new Error('Écart de pixels détecté.');
  verification.textContent = '像素核对通过：两张均为 512×640 px，所有绘画像素均为 4×4 块；店面范围外的屋顶、上层窗户、外墙两侧和底边完全一致（差异为 0）。';
}).catch(error => {
  verification.classList.add('erreur');
  verification.textContent = `核对未完成：${error.message}`;
});
