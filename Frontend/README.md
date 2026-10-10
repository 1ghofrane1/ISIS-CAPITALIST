# Frontend Angular

Depuis ce dossier :

```powershell
npm install
npm start
```

Le backend doit tourner sur `http://localhost:3000`. L’interface se trouve sur `http://localhost:4200`.

`App` affiche le monde et les fenêtres. `Produit` affiche et anime un produit. `GameService` contient les signals, les actions et les appels GraphQL avec Apollo Orbit. `economy.ts` calcule les coûts et la quantité MAX.

Commandes :

- `npm run codegen` : génère les types et documents depuis le schéma backend et `queries.graphql`.
- `npm run build` : compile l’application.
- `npm test -- --watch=false` : exécute les tests.

Les durées sont en millisecondes ; seul le pipe d’affichage les convertit en secondes. Le formulaire joueur utilise `form` et `FormField`. Une mutation en cours bloque les nouveaux achats et changements de joueur.

Les guides complets sont à la racine du projet : `GUIDE-JEU-FRONTEND-BACKEND.md` et `CORRECTIONS-JUSTIFICATIONS.md`.

L’adresse du backend se configure dans `src/app/graphql/backend-url.ts` ; elle est partagée par GraphQL et les images.
