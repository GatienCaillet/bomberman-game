'use strict';

/*
===============================================================================
  排行榜临时数据 / Données temporaires du classement
===============================================================================

  中文说明
  本文件只保存玩家数据，面板与按钮逻辑位于 js/classement.js。修改下方数据后
  刷新页面即可更新排行榜，也支持直接双击 HTML；players 的排列顺序就是名次。
  当前尚未连接数据库，之后可由后端查询数据库并提供相同结构的数据。

  Présentation
  Ce fichier contient uniquement les données des joueurs ; js/classement.js gère
  le panneau et les boutons. Modifier les données puis actualiser la page, même
  ouverte directement depuis le HTML. L’ordre de players détermine le rang.
  Aucune base n’est encore connectée ; le serveur pourra fournir ces mêmes données.

===============================================================================
*/

window.classementData = {
  label: 'DONNÉES DE DÉMONSTRATION',
  players: [
    {
      name: 'Baguette.exe',
      wins: 12,
      score: '2 450',
    },
    {
      name: 'Capitaine Boum',
      wins: 9,
      score: '1 980',
    },
    {
      name: 'La Poubelle',
      wins: 7,
      score: '1 640',
    },
    {
      name: 'Cône-nan',
      wins: 5,
      score: '1 210',
    },
    {
      name: 'Maman, je lag !',
      wins: 3,
      score: '890',
    },
  ],
};
