# Ressources de Grenoble Bomber

Ce dossier contient 57 fichiers médias : 46 PNG, 8 GIF et 3 WAV.
Les noms sont en français, en minuscules et sans accents ni espaces.
Les identifiants numériques existants sont conservés.

## Classement

| Dossier | Contenu |
| --- | --- |
| `batiments/commerces/` | Neuf bâtiments avec commerce intégré |
| `batiments/logements/` | Six bâtiments résidentiels |
| `bombes/` | Bombes fixes, aperçus animés et bandes d’animation |
| `bonus/` | Capacité de bombes, portée des flammes et vitesse |
| `personnages/` | Policier et manifestant, images fixes et animations |
| `obstacles/` | Cône, poubelle, buisson et arbre |
| `sols/` | Pavés sans joint |
| `fonds/` | Paysage de Grenoble pour les menus |
| `decor/` | Cabine du téléphérique |
| `interface/` | Titres et personnages décoratifs |
| `sons/` | Pas, placement et explosion |

## Bonus / 升级道具

Trois bonus sur une plaque carrée en bois, en PNG de 256×256 px chacun.
Le fond est transparent à l’extérieur de la plaque ; le panneau crème est opaque.
Les versions sans plaque restent disponibles sous leur nom d’origine. /
三个道具各自位于方形木板上，板面不透明，板子外侧透明；原来的裸图保留。
Chaque pixel de dessin occupe un bloc de 4×4 px (grille logique 64×64),
sans lissage ni transparence partielle. / 三张均为 256×256 透明 PNG，
每个绘制像素为 4×4 px，无平滑和半透明边缘。

| Fichier dans `bonus/` | Signification / 含义 |
| --- | --- |
| `01-capacite-bombes-plaque.png` | Bombe avec un plus vert : capacité de bombes / 炸弹容量提升 |
| `02-portee-flammes-plaque.png` | Flamme orange et jaune : portée des explosions / 爆炸范围提升 |
| `03-vitesse-plaque.png` | Chaussure verte avec traits de vitesse / 移动速度提升 |

Les afficher au centre d’une case et conserver `ctx.imageSmoothingEnabled = false`.
Ces fichiers fournissent uniquement les visuels ; les règles de bonus restent
à implémenter côté serveur. / 居中绘制于格子内，关闭 Canvas 图像平滑；
这里只提供素材，升级规则仍需由服务端实现。

Prompts et export : [version sur plaque](../../documentation/generation/bonus/instructions-plaques.json),
[version sans plaque](../../documentation/generation/bonus/instructions-generation.json)
et [exporteur macOS](../../documentation/generation/bonus/export-sprites.swift).
Voir les trois bonus au début de la [galerie](../apercus/ressources/ressources.html).

## Utilisation des animations

Dans chaque dossier d’animation, `animation.gif` sert d’aperçu,
`image-01.png` est la première image lorsqu’elle est disponible,
et `bande-animation.png` est une bande horizontale utilisable par le Canvas.

| Bande | Dimensions totales | Images | Dimensions par image |
| --- | --- | --- | --- |
| `personnages/animations/policier/marche-face/` | 1024 × 256 | 4 | 256 × 256 |
| `personnages/animations/policier/marche-profil/` | 2048 × 256 | 8 | 256 × 256 |
| `personnages/animations/policier/repos-face/` | 1024 × 256 | 4 | 256 × 256 |
| `personnages/animations/policier/repos-profil/` | 1024 × 256 | 4 | 256 × 256 |
| `bombes/animations/bombe-ronde/combustion/` | 2048 × 256 | 8 | 256 × 256 |
| `bombes/animations/bombe-cylindrique/combustion/` | 2048 × 384 | 8 | 256 × 384 |

Le manifestant possède actuellement des GIF de repos de face et de marche
de profil ; aucune bande PNG n’est fournie pour ce personnage.

## Dimensions dans la grille

Les fichiers des bâtiments sont nommés `numero-lignesxcolonnes.png` :
`06-2x2.png` désigne le bâtiment numéro 06, occupant deux lignes et deux
colonnes. Le toit ne compte pas dans le nom. Une case mesure 256 × 256 px ;
le PNG comprend 128 px supplémentaires en hauteur pour le toit.
Ainsi, un bâtiment `2x2` mesure 512 × 640 px, et un bâtiment `1x2` mesure
512 × 384 px. Aligner le pied au bas de son emprise sans déformer l’image.

Le cône et la poubelle occupent chacun une case. Leur image de 320 × 384 px
a une hauteur visuelle de 1,2 case.

## Sons et préparation

La [maison abricot et sa pâtisserie](../apercus/batiments/2x2.html) mesurent
chacune 512 × 640 px, pour une emprise de 2 × 2 cases et un toit de 128 px.
Chaque pixel de dessin occupe un bloc uniforme de 4 × 4 px. Hors de la zone
du commerce (`x=32..479`, `y=352..635`), les deux images sont identiques
pixel par pixel. La transparence est identique et binaire.

Les fichiers WAV sont mono à 44,1 kHz : `pas.wav` (0,15 s),
`placement.wav` (0,22 s) et `explosion.wav` (0,72 s).
Les instructions de création sont conservées dans `documentation/generation/`.

Voir [les aperçus](../apercus/index.html),
[la galerie des médias](../apercus/ressources/ressources.html)
et [les interfaces des pages](../apercus/lisez-moi.md).
