
Soutenance : 4 janvier 2027
Rendu la semaine du 28 décembre

Trello : accès via le groupe / 通过小组获取访问权限

Proposition d’organisation de rôles
(choisissez celui qui vous intéresse (2 max)

Tasnim, Zemiao, Rachel, Gatien, Ziyang
Règles de base
Serveur autoritaire : Toutes les règles du jeu tournent sur le serveur. Les clients envoient leurs intentions ("aller à gauche", "poser une bombe") et reçoivent l'état du jeu en retour.
Deux contrats de communication (fixés en semaine 1 et validés par tous) :
Les événements Socket.io et le format JSON (join_room, player_input, game_state, game_over...), définis par les pôles 3 et 5.
Les routes d'API et le format JSON (ex: GET /api/scores, GET /api/games/recent), définies par le pôle 4. Le pôle 1 construit le Scoreboard avec de fausses données en attendant que l'API soit prête.
Un module réseau client partagé (socket.js), écrit et géré par le pôle 5. Les pôles 1 et 2 l'importent, de façon à n'avoir qu'une seule connexion active.
Point d'intégration hebdomadaire : Une personne (à tour de rôle) fusionne les branches et teste le jeu sur au moins 2 machines différentes.

5 Pôles

Pôle Interface Web, Assets et Présentation (Frontend UI/UX)
Ziyang
Technologies : HTML5, CSS3, JavaScript (DOM), Web Audio.
Missions :
Création de la page du Scoreboard en HTML/CSS/JS classique (pas dans le canvas, exigence stricte).
Écrans d'accueil, saisie du pseudo, lobby (liste des salons via socket.js) et écran de fin de partie.
Affichage des infos autour du jeu (vies, bonus, timer).
Recherche et préparation (dessin) des assets (sprites, tuiles, sons) à fournir au pôle 2.
Musique et effets sonores.
Monter la vidéo de gameplay pour la soutenance (dernière semaine).

2. Pôle Rendu Canvas et Contrôles (Client)
   Zemiao
   Technologies : HTML <canvas></canvas> 2D, JavaScript (boucle d'animation).
   Missions :
   Afficher la grille, les murs, les obstacles, les joueurs, les bombes et les explosions.
   Animer les sprites (personnages). (< en gros mettre les images ensemble et les animer)
   Capturer les touches du clavier et envoyer les intentions via socket.js.
   Afficher l'état du jeu tel qu'il est reçu du serveur.
   Aucune règle de jeu dans ce pôle.
   Objectif bonus : Lisser les mouvements (interpolation) entre les mises à jour du serveur une fois que l'affichage de base fonctionne.
3. Pôle Logique de Jeu (Serveur)
   Gatien
   Technologies : JavaScript (Algorithmique).
   Missions :
   Gérer les déplacements, les collisions, le minuteur des bombes, la propagation des explosions, la mort des joueurs et les conditions de victoire.
   Implémenter la variante du jeu : les augmentations
   Coder le tout dans un module GameState composé de fonctions pures (sans appel réseau à l'intérieur), pour que ce soit facilement testable.
4. Pôle Base de Données, API et Tests
   Tasnim
   Technologies : Node.js, Express, MongoDB (Mongoose), JSON, outils de test (ex: Jest).
   Missions :
   Créer les schémas MongoDB : joueurs et parties.
   Créer les routes d'API pour le Scoreboard.
   Écrire la fonction de sauvegarde des résultats, appelée par le serveur à la fin d'un match.
   Dès la semaine 2 : écrire les tests unitaires des fonctions du GameState (collisions, explosions).
   Écrire les tests de l'API.
   Rédiger le fichier README.md (prérequis, installation, configuration, lancement).
5. Serveur Temps Réel
   Rachel
   Technologies : Node.js, Socket.io (WebSockets).
   Missions :
   Gérer les salons (rooms), les joueurs connectés, et le lancement des parties.
   Boucle de jeu côté serveur : recevoir les inputs, appeler le GameState, et diffuser (broadcast) l'état plusieurs fois par seconde.
   Gérer les déconnexions et la latence.
   Créer le module client partagé
   —-------------------------------------------------------------------------------------------------------------

Binômes de relecture (3↔4, 5↔2, et 1 valide le format de l'API avec le 4) pour que chacun puisse expliquer plus que son propre code.

Étapes clés (À adapter selon la date limite)
Le code doit être rendu une semaine avant la soutenance
Semaine 1 : Contrats d'interfaces, choix de la variante, règles pour le dépôt/les branches, et squelette du projet.
Semaines 2 à 3 : Un salon jouable (mouvements et bombes), Scoreboard connecté à l'API.
Semaines 4 à 5 : Jeu complet, intégration de la variante, sons, peaufinage.
2 dernières semaines : Correction de bugs, README.md, vidéo, répétition de la présentation, rendu final.
Pour la Soutenance
Format : 5 minutes strictes de présentation, puis 20 minutes de questions sur l'implémentation.
Chaque membre explique précisément ce qu'il a fait (la coordination, les tests et l'intégration rapportent des points).
Tout le monde doit comprendre le flux principal : Input → Serveur → GameState → État du jeu → Rendu Canvas.
Justification MongoDB : Un document par partie avec les résultats des joueurs imbriqués, et une agrégation pour le classement (total de victoires, meilleur score).
Diffuser la courte vidéo préparée au lieu de faire une démo en direct.

Bonus (Uniquement s'il reste du temps, hors plan principal)
Docker et docker-compose (Node + MongoDB).
Pipeline CI/CD (GitHub Actions) pour vérifier le code (lint) et lancer les tests.
Déploiement du serveur en ligne.
