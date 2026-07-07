# BatterieLab

Configurateur web pour designer un pack batterie a cellules cylindriques.

## Fonctionnalites

- Architecture configurable en series/paralleles, par exemple `13S8P`.
- Presets cellules `18650`, `21700` ou dimensions custom.
- BMS activable, positionnable et orientable a plat ou sur tranche.
- Vues SVG live du pack en dessus, cote et largeur.
- Controle d'encombrement par rapport au boitier.
- Calculs de cellules, tension nominale, energie, cout, main d'oeuvre, marge et gain.
- Export SVG, export JSON et impression.

## Utilisation

Ouvrir `index.html` directement dans un navigateur, ou lancer un serveur statique:

```sh
python3 -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.
