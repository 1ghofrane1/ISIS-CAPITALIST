# ISIS Capitalist - Frontend

Client Angular à base de signaux pour le monde **Saveurs de Tunisie**.

## Prérequis

- Node.js 24+
- Le backend NestJS lancé sur `http://localhost:3000`

## Lancement

Depuis `Backend/typescript-starter` :

```bash
npm install
npm run start
```

Puis depuis `Frontend` :

```bash
npm install
npm run codegen
npm start
```

L'application est accessible sur `http://localhost:4200`.

## Commandes utiles

```bash
npm run codegen       # régénère les types et opérations GraphQL
npm run build         # produit le bundle de production
npm test -- --watch=false
```

Le codegen lit directement le schéma du backend dans
`../Backend/typescript-starter/src/schema.graphql`.

## Fonctionnalités

- chargement et rafraîchissement d'un monde par identifiant joueur ;
- sauvegarde locale du pseudo ;
- production manuelle et automatisée par les managers ;
- achats `x1`, `x10`, `x100` et `MAX` avec coût géométrique ;
- unlocks produit et globaux ;
- Cash Upgrades et Angel Upgrades ;
- investisseurs, calcul des anges et reset ;
- badges d'actions disponibles, notifications et interface responsive.
