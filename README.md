# BatterieLab

Configurateur web pour designer un pack batterie a cellules cylindriques.

## Fonctionnalites

- Architecture configurable en series/paralleles, par exemple `13S8P`.
- Presets cellules `18650`, `21700` ou dimensions custom.
- Arrangement des cellules en grille droite ou en quinconce serre.
- Tensions nominale et pleine charge configurables par cellule.
- Calcul du courant de decharge max pack avec limitation par le courant continu du BMS.
- Estimation du poids total depuis le poids des cellules, du BMS et du boitier/accessoires.
- BMS activable, positionnable et orientable a plat ou sur tranche.
- Vues SVG live du pack en dessus, cote et largeur, avec cotes et calques configurables.
- Representation coherente des groupes paralleles, des ponts serie, du nickel, du faisceau d'equilibrage et des sorties P+/P-.
- Controle d'encombrement par axe et ajustement automatique du boitier.
- Calculs de cellules, tension nominale, energie, cout, main d'oeuvre, marge et gain.
- Generation d'un devis client avec coordonnees, logo, frais d'envoi, mentions, conditions et lien PayPal.
- Sauvegardes locales nommees, avec export/import JSON de la base de sauvegardes.
- Espace de travail separe entre conception et apercu du devis.
- Export SVG, export JSON, PDF de devis et impression.

## Utilisation

Ouvrir `index.html` directement dans un navigateur, ou lancer un serveur statique:

```sh
python3 -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Mode service

Pour les devis publics et l'envoi email, lancer l'application comme service Node/Docker:

```sh
npm install
npm start
```

Le service expose:

- `/` : configurateur
- `/api/quotes` : creation d'un devis public
- `/api/quote-pdf` : generation directe d'un PDF de devis
- `/devis/:id` : page publique client

En Docker/Portainer, utiliser `Dockerfile` ou `docker-compose.yml`, avec un volume persistant monte sur `/data`.

Variables utiles:

- `PUBLIC_BASE_URL` : URL publique dediee, par exemple `https://batterielab.example.com`
- `MAIL_FROM` : expediteur email
- `MAIL_REPLY_TO` : adresse de reponse
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` : configuration SMTP

Si SMTP n'est pas configure, le lien public est cree mais l'email n'est pas envoye.

Recommandation de deploiement: proteger l'interface de configuration et `/api/quotes` par le reverse proxy si le service est expose publiquement. Les pages `/devis/:id` peuvent rester publiques pour les clients.
