# ISIS Capitalist — Saveurs de Tunisie

Jeu de gestion réalisé avec Angular et NestJS. Le monde contient six produits tunisiens, leurs managers, des paliers, des améliorations et des anges.

## Lancer le projet

Dans un premier terminal, depuis la racine :

```powershell
cd Backend/typescript-starter
npm install
npm run start:dev
```

Dans un second terminal :

```powershell
cd Frontend
npm install
npm start
```

Interface : `http://localhost:4200`. API GraphQL : `http://localhost:3000/graphql`. Les images sont servies par le backend.

Le pseudo identifie une partie dans `Backend/typescript-starter/userworlds`. Il est mémorisé dans le navigateur. Une nouvelle partie commence avec 100 DT et une Chechia.

## Comprendre et vérifier

Le guide `GUIDE-JEU-FRONTEND-BACKEND.md` explique les fichiers, les formules et le parcours d’une action. `CORRECTIONS-JUSTIFICATIONS.md` détaille les choix et la conversion des anciennes sauvegardes.

Depuis `Frontend` : `npm run codegen`, `npm run build`, `npm test -- --watch=false`.

Depuis `Backend/typescript-starter` : `npm run build`, `npm test`.

Les tests portent notamment sur le paiement des managers, les cycles de production en millisecondes, les bonus, le reset et les changements de joueur. Les classes backend et opérations frontend GraphQL sont générées à partir du schéma commun.

Les anciennes sauvegardes sont converties une seule fois au premier chargement : leurs achats et compteurs restent présents, les cycles automatiques reprennent au début d’un cycle. Les gains de l’intervalle ancien ambigu ne sont pas reconstitués. Pour démontrer les nouvelles règles, utiliser un nouveau pseudo.
