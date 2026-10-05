# ISIS Capitalist - Mecanisme du jeu et architecture frontend/backend

Ce document explique le fonctionnement du jeu a partir du code present dans le projet `ISIS-CAPITALIST`. Il decrit les responsabilites du frontend Angular, du backend NestJS, la communication GraphQL entre les deux et le cycle complet d'une action du joueur.

## 1. Architecture generale

Le projet est divise en deux applications :

```text
ISIS-CAPITALIST/
|- frontend/                    Application Angular visible par le joueur
|- Backend/
   `- typescript-starter/       API NestJS et sauvegarde des parties
```

Le frontend ne lit pas directement les fichiers de sauvegarde. Il envoie des requetes HTTP POST vers l'API GraphQL du backend :

```text
Frontend Angular
    |
    | POST http://localhost:3000/graphql
    | Query ou Mutation GraphQL
    v
Backend NestJS
    |
    v
GraphQlResolver
    |
    v
AppService
    |
    +--> userworlds/{utilisateur}-world.json
    `--> origworld.ts si aucune sauvegarde n'existe
```

Le frontend affiche l'etat du monde recu. Le backend reste la source de persistance et contient les regles principales du jeu.

## 2. Le modele du jeu

Le jeu repose sur un objet `World`. Il contient notamment :

| Propriete | Role |
| --- | --- |
| `money` | Argent disponible pour acheter des produits, managers et upgrades. |
| `score` | Score cumule de la partie. Il sert aussi au calcul des anges lors d'un reset. |
| `totalangels` | Nombre total d'anges obtenus au cours des resets. |
| `activeangels` | Anges actuellement disponibles et utilises dans le bonus de revenu. |
| `angelbonus` | Pourcentage de bonus apporte par un ange actif. La valeur initiale est `2`. |
| `lastupdate` | Instant Unix de la derniere mise a jour serveur du monde. |
| `products` | Les six produits fabriques dans le monde. |
| `allunlocks` | Paliers qui demandent que tous les produits atteignent un seuil. |
| `upgrades` | Ameliorations achetees avec de l'argent. |
| `angelupgrades` | Ameliorations achetees avec des anges actifs. |
| `managers` | Personnages qui automatisent la production d'un produit. |

Le schema complet est defini dans [Backend/typescript-starter/src/schema.graphql](Backend/typescript-starter/src/schema.graphql). Les classes TypeScript correspondantes sont generees dans [Backend/typescript-starter/src/graphql.ts](Backend/typescript-starter/src/graphql.ts).

## 3. Produits et production

Chaque produit contient :

- `cout` : prix du prochain exemplaire ;
- `croissance` : coefficient d'augmentation du prix ;
- `revenu` : revenu produit par unite lors d'une production ;
- `vitesse` : duree d'une production ;
- `quantite` : nombre d'exemplaires possedes ;
- `timeleft` : temps restant pour la production en cours ;
- `managerUnlocked` : indique si la production automatique est active ;
- `paliers` : bonus lies a la quantite du produit.

Les six produits et leurs valeurs initiales sont dans [Backend/typescript-starter/src/origworld.ts](Backend/typescript-starter/src/origworld.ts).

### Achat d'une quantite

Le prix augmente apres chaque achat. Pour une quantite `q`, le prix total est une somme geometrique :

```text
prix total = cout + cout * croissance + cout * croissance^2 + ...
```

Le frontend calcule ce montant dans [frontend/src/app/services/economy.ts](frontend/src/app/services/economy.ts), avec `purchaseCost`. Le backend recalcule aussi le prix dans `acheterQtProduit` du resolver. Cette double verification evite de faire confiance au montant fourni par le navigateur.

### Production manuelle

Sans manager, le joueur lance une production avec le bouton du produit. Le frontend affecte une valeur a `timeleft`, puis envoie la mutation `lancerProductionProduit`.

Le composant [frontend/src/app/produit/produit.ts](frontend/src/app/produit/produit.ts) utilise un timer local toutes les 100 millisecondes. `tickProduct` diminue le temps restant. Quand il atteint zero, le frontend ajoute le gain a l'argent et au score affiches.

Le backend conserve aussi `timeleft` et recalcule les productions ecoulees dans `updateWorld`. Cette mise a jour est executee avant chaque query ou mutation importante.

### Production automatique

Lorsqu'un manager est engage, `managerUnlocked` passe a `true`. Le produit produit ensuite automatiquement. Le frontend simule la progression avec `tickProduct`, tandis que le backend calcule les productions manquantes depuis `lastupdate`.

Pour un produit automatise, le serveur calcule :

```text
productions terminees = floor((temps ecoule + timeleft) / vitesse)
nouveau timeleft = (temps ecoule + timeleft) modulo vitesse
```

## 4. Calcul des gains

La methode `addProduction` du backend applique la formule suivante :

```text
gain = nombre de productions
       * quantite du produit
       * revenu du produit
       * (1 + activeangels * angelbonus / 100)
```

Le gain est ajoute a `money` et a `score`.

Exemple : avec 10 exemplaires, un revenu de 5, 20 productions, 10 anges actifs et un bonus de 2 % par ange :

```text
gain = 20 * 10 * 5 * (1 + 10 * 2 / 100)
     = 1 200
```

## 5. Anges et reset

Les anges sont obtenus avec la mutation `resetWorld`. Le backend calcule les anges supplementaires a partir du score :

```text
anges supplementaires =
max(0, floor(150 * sqrt(score / 1 000 000)) - totalangels)
```

Le reset :

1. met a jour les productions encore dues ;
2. calcule les anges supplementaires ;
3. recree le monde depuis `origworld` ;
4. conserve le score ;
5. augmente `totalangels` et `activeangels` ;
6. sauvegarde le nouveau monde.

Les anges actifs augmentent automatiquement les revenus. Ils peuvent aussi etre depenses dans une mutation `acheterAngelUpgrade`. Dans ce cas, ils sont retires de `activeangels`, mais pas de `totalangels`.

## 6. Paliers, upgrades et managers

Un `Palier` est reutilise pour representer plusieurs types de bonus. Ses champs principaux sont :

- `seuil` : condition ou cout ;
- `idcible` : produit vise ; `0` signifie tous les produits et `-1` signifie le bonus global des anges ;
- `ratio` : puissance du bonus ;
- `typeratio` : `gain`, `vitesse` ou `ange` ;
- `unlocked` : etat du palier.

### Unlocks automatiques

Apres un achat, le backend appelle `checkUnlocks`.

- Un palier de produit est active lorsque `product.quantite >= palier.seuil`.
- Un `allunlock` est active lorsque chaque produit atteint le seuil.

Le bonus est alors applique une seule fois.

### Cash upgrades

`acheterCashUpgrade` verifie le nom de l'upgrade, son etat et le montant disponible. Le prix est retire de `money`, puis `applyUpgrade` applique le bonus au produit cible ou a tous les produits.

### Angel upgrades

`acheterAngelUpgrade` fonctionne de la meme facon, mais le cout est retire de `activeangels`. Une amelioration peut augmenter le revenu, reduire la duree de production ou augmenter `angelbonus`.

### Managers

`engagerManager` cherche le manager par son nom, utilise `idcible` pour retrouver son produit, puis active le manager. Le produit passe alors en production automatique.

## 7. Backend : role des fichiers

### [main.ts](Backend/typescript-starter/src/main.ts)

Point d'entree de NestJS. Il :

- cree l'application avec `AppModule` ;
- rend le dossier `public` accessible pour les images ;
- active CORS pour autoriser le frontend ;
- ecoute sur le port `3000` par defaut.

### [app.module.ts](Backend/typescript-starter/src/app.module.ts)

Assemble l'application :

- active GraphQL avec Apollo ;
- indique que le schema se trouve dans les fichiers `.graphql` ;
- genere `graphql.ts` ;
- declare `AppController`, `AppService` et `GraphQlResolver`.

### [schema.graphql](Backend/typescript-starter/src/schema.graphql)

Decrit le contrat public de l'API : types `World`, `Product`, `Palier`, la query `getWorld` et les six mutations du jeu.

### [resolver.ts](Backend/typescript-starter/src/resolver.ts)

Reçoit les operations GraphQL. Il ne doit pas contenir toute la logique technique de calcul : il charge le monde, appelle `AppService`, sauvegarde et retourne le resultat.

### [app.service.ts](Backend/typescript-starter/src/app.service.ts)

Contient la logique metier :

- lecture et ecriture des fichiers JSON ;
- calcul de l'evolution temporelle ;
- calcul des gains ;
- reset ;
- unlocks et bonus ;
- application des upgrades.

### [origworld.ts](Backend/typescript-starter/src/origworld.ts)

Decrit le monde initial d'un nouveau joueur : six produits, paliers, upgrades, angel upgrades et managers.

### [app.controller.ts](Backend/typescript-starter/src/app.controller.ts)

Contient la route HTTP `GET /` qui retourne `Hello World!`. Cette route vient du starter NestJS et n'est pas la route principale du jeu.

### Tests

- [src/app.controller.spec.ts](Backend/typescript-starter/src/app.controller.spec.ts) teste la route logique `getHello` du controller.
- [test/app.e2e-spec.ts](Backend/typescript-starter/test/app.e2e-spec.ts) demarre NestJS et teste la route HTTP `/`.

## 8. Frontend : role des fichiers

### [app.ts](frontend/src/app/app.ts)

Composant racine Angular. Il :

- injecte `GameService` ;
- ouvre les fenetres managers, unlocks, cash upgrades et anges ;
- prepare les listes affichees dans les modales ;
- affiche les notifications avec Angular Material.

### [app.html](frontend/src/app/app.html)

Interface principale :

- tresorerie ;
- score ;
- anges actifs ;
- liste des produits ;
- boutons d'achat et de production ;
- modales des upgrades, managers et unlocks ;
- formulaire de changement d'utilisateur.

### [produit.ts](frontend/src/app/produit/produit.ts)

Composant d'un produit. Il calcule :

- la quantite a acheter ;
- le cout ;
- la possibilite d'achat ;
- la progression de production ;
- le gain attendu ;
- l'etat manuel ou automatique de la production.

### [game.service.ts](frontend/src/app/services/game.service.ts)

Service central du frontend. Il contient :

- l'utilisateur courant ;
- le monde courant dans un signal Angular ;
- les appels HTTP GraphQL ;
- les achats ;
- le lancement des productions ;
- l'embauche des managers ;
- les cash upgrades et angel upgrades ;
- le reset ;
- les notifications et erreurs ;
- la simulation locale des timers.

Le serveur GraphQL est configure par :

```ts
http://localhost:3000
```

Les appels sont envoyes vers :

```text
http://localhost:3000/graphql
```

### [economy.ts](frontend/src/app/services/economy.ts)

Contient les calculs purs du frontend :

- `purchaseCost` calcule le prix d'une quantite ;
- `maxAffordable` calcule la plus grande quantite achetable avec l'argent disponible.

Ces fonctions n'appellent pas le backend et ne modifient pas le monde.

### [game.models.ts](frontend/src/app/models/game.models.ts)

Construit les types utilises dans l'interface a partir des types generes par GraphQL. Par exemple :

```ts
export type World = NonNullable<GetWorldQuery['getWorld']>;
export type Product = World['products'][number];
```

Le frontend reutilise donc automatiquement la structure du schema GraphQL.

### [queries.graphql](frontend/src/app/graphql/queries.graphql)

Contient les operations envoyees au backend :

- `GetWorld` ;
- `AcheterQtProduit` ;
- `LancerProductionProduit` ;
- `EngagerManager` ;
- `AcheterCashUpgrade` ;
- `AcheterAngelUpgrade` ;
- `ResetWorld`.

### [operations.ts](frontend/src/app/graphql/operations.ts)

Fichier genere par GraphQL Code Generator. Il contient les types TypeScript et les documents GraphQL prets a etre envoyes par `HttpClient`. Il ne faut normalement pas le modifier a la main.

### Pipes

- [big-value.pipe.ts](frontend/src/app/pipes/big-value.pipe.ts) formate les grands nombres pour l'interface.
- [duration.pipe.ts](frontend/src/app/pipes/duration.pipe.ts) transforme une duree en affichage lisible.

## 9. Exemple complet : acheter un produit

### Etape 1 : action dans l'interface

Le joueur clique sur le bouton d'achat dans le composant `Produit`.

```ts
buy(): void {
  this.game.buyProduct(this.prod().id);
}
```

### Etape 2 : calcul frontend

`GameService.buyProduct` :

1. retrouve le produit ;
2. determine la quantite ;
3. calcule le prix ;
4. verifie l'argent ;
5. met a jour immediatement le signal `world` ;
6. envoie `AcheterQtProduit` au serveur.

### Etape 3 : requete GraphQL

```graphql
mutation AcheterQtProduit($user: String!, $id: Int!, $quantite: Int!) {
  acheterQtProduit(user: $user, id: $id, quantite: $quantite) {
    id
  }
}
```

### Etape 4 : traitement backend

Le resolver :

1. lit le fichier du joueur ;
2. met a jour les productions ecoulees ;
3. retrouve le produit ;
4. recalcule le prix ;
5. verifie l'argent ;
6. modifie la quantite et le cout ;
7. active les unlocks ;
8. sauvegarde le JSON.

### Etape 5 : resultat

Le frontend conserve son affichage optimiste. En cas d'erreur, `sendMutation` affiche une notification puis recharge le monde depuis le serveur afin de remettre l'interface dans un etat coherent.

## 10. Exemple complet : synchroniser un monde

Au lancement, `GameService` choisit un nom dans `localStorage`, puis appelle `refreshWorld`.

```text
GameService.refreshWorld()
    |
    `- GetWorld(user)
          |
          v
      GraphQlResolver.getWorld
          |
          +--> readUserWorld(user)
          +--> updateWorld(world)
          +--> saveWorld(user, world)
          `--> retourne World
```

Le frontend place ensuite le resultat dans le signal :

```ts
this.world.set(this.normaliseWorld(data.getWorld));
```

Angular met automatiquement a jour les composants qui lisent `game.world()`.

## 11. Points importants du code actuel

### Simulation optimiste

Le frontend modifie parfois l'affichage avant que le backend confirme l'action. Cela rend l'interface immediate. Si le serveur refuse l'action, le frontend recharge le monde.

### Double calcul de la production

Le frontend anime les productions en temps reel avec `tickProduct`. Le backend recalcule egalement les productions depuis `lastupdate`. Le serveur est donc capable de rattraper le temps ecoule lorsque le joueur revient ou envoie une nouvelle action.

### Difference dans le calcul des anges

Le backend utilise actuellement `score / 1_000_000` dans `resetWorld`, alors que le frontend utilise `score / 1_000_000_000_000_000` dans `claimableAngels`. Le nombre d'anges annonce par l'interface peut donc differer du nombre effectivement donne par le serveur. Ce point devra etre harmonise dans le code si un comportement identique est attendu.

### Cout des managers

Le frontend retire localement le cout du manager dans `hireManager`. Dans le resolver backend, `engagerManager` active le manager mais ne retire pas `manager.seuil` de `world.money`. Le frontend et le backend ne modelisent donc pas exactement le meme cout. Ce point est a verifier avant de considerer la logique finale.

### Persistance par fichiers

Les parties sont stockees dans des fichiers JSON et non dans une base de donnees :

```text
Backend/typescript-starter/userworlds/{user}-world.json
```

Cette solution est simple pour le projet pedagogique, mais elle est moins adaptee a plusieurs serveurs ou a beaucoup de joueurs.

## 12. Commandes utiles

Backend :

```powershell
cd Backend/typescript-starter
npm install
npm run start:dev
```

Frontend :

```powershell
cd frontend
npm install
npm run codegen
npm start
```

Adresses habituelles :

```text
Frontend : http://localhost:4200
Backend  : http://localhost:3000
GraphQL  : http://localhost:3000/graphql
```

Le backend doit etre demarre avant d'utiliser le frontend, car le frontend envoie ses requetes a `http://localhost:3000/graphql`.

## 13. Resume final

- Le schema GraphQL definit le contrat entre les deux applications.
- `queries.graphql` definit les operations utilisees par Angular.
- `operations.ts` fournit les types et documents generes.
- `GameService` pilote l'interface et envoie les requetes.
- `resolver.ts` recoit les requetes GraphQL.
- `AppService` applique les regles du jeu et gere les fichiers JSON.
- `origworld.ts` fournit le monde initial.
- `userworlds` conserve la partie de chaque joueur.
- Le frontend affiche et anime l'etat ; le backend valide, calcule et sauvegarde.