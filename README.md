# Grenoble Bomber

Projet de Bomberman en équipe. Cette branche fournit les interfaces web,
les ressources graphiques et sonores, ainsi que des exemples pour les tester.
Les connexions réseau, les résultats de partie et les scores réels restent à intégrer.

## Aperçu des interfaces

Avec Python 3, depuis la racine du dépôt (aucune compilation nécessaire) :

```sh
python3 -m http.server 8000 --directory public
```

Ouvrir [l’accueil](http://localhost:8000/), [la fin de partie](http://localhost:8000/fin.html),
[le classement](http://localhost:8000/classement.html) ou [les aperçus des ressources](http://localhost:8000/apercus/).
Ce serveur sert uniquement à prévisualiser les fichiers statiques.

## Documentation

- [Interfaces, ressources, contrôleur de test et standards de génération](documentation/README.md)
- [中文说明](documentation/README-chinois.md)

Le script `npm test` est actuellement un emplacement réservé ; aucun test automatisé n’est configuré dans cette branche.

Équipe : Tasnim ZAHOUANI, Zemiao HU, Rachel PERETTI, Gatien CAILLET, Ziyang GU.
