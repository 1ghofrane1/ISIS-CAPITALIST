# Backend NestJS

Ce dossier provient du starter NestJS et contient maintenant l’API du jeu ISIS Capitalist.

```powershell
npm install
npm run start:dev
```

API : `http://localhost:3000/graphql`. Images : `public/icones`. Sauvegardes : `userworlds/{pseudo}-world.json`.

- `schema.graphql` : contrat commun, utilisé pour générer `graphql.ts`.
- `origworld.ts` : données et valeurs de départ du monde.
- `resolver.ts` : validation des actions, paiement et sauvegarde.
- `app.service.ts` : chargement, calcul temporel, gains, bonus, anges et migration des anciennes parties.

`npm run build` compile ; `npm test` exécute les tests.

Le serveur actualise les gains avant chaque action. Il n’utilise pas de timer par joueur. Les durées sont en millisecondes. Le JSON garde `lastupdateMs` pour les calculs et `saveVersion=2` pour identifier les parties converties ; ces champs restent privés et ne changent pas le schéma GraphQL.

Les guides complets sont à la racine : `GUIDE-JEU-FRONTEND-BACKEND.md` et `CORRECTIONS-JUSTIFICATIONS.md`.
