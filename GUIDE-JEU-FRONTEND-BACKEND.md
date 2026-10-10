# Comprendre ISIS Capitalist : le code et les mécanismes

Guide en français fondé sur le projet examiné le 10 octobre 2026 dans `C:\Users\Ghofrane\ISIS-CAPITALIST`.

**Version actualisée après corrections.** Les règles ci-dessous décrivent le code corrigé. Le document 04 détaille les changements, leurs raisons et les vérifications.

## 1. Ce que vous construisez

Vous construisez un jeu de gestion dans lequel le joueur achète des exemplaires de produits, lance des productions et réinvestit les gains. Un manager automatise un produit. Des seuils et des améliorations augmentent ses performances. Un reset permet d’obtenir des anges, qui rendent la partie suivante plus rentable.

Le monde « Saveurs de Tunisie » est le contenu de votre jeu : Chechia, Chicha, Harissa, Fricassee, Boga et Djeba. Le programme doit toutefois fonctionner avec un autre monde ayant les mêmes champs GraphQL. C’est le sens de l’interopérabilité demandée.

Le travail ne demande pas une boutique réelle, une base de données ou une authentification complète. Les DT sont une monnaie de jeu. Le pseudo sélectionne un fichier de sauvegarde.

## 2. Architecture : qui fait quoi ?

```text
Joueur
  │ clic, achat, pseudo, reset
  ▼
Angular : App et Produit
  │ utilisent les données et les actions de GameService
  ▼
GameService
  ├─ affiche/simule la partie avec des signaux
  └─ envoie une requête HTTP contenant du GraphQL
          │ POST http://localhost:3000/graphql
          ▼
Serveur NestJS + Apollo
          ▼
GraphQlResolver
  │ choisit l'action et ses arguments
  ▼
AppService
  ├─ règles du jeu et calcul du temps
  ├─ origworld : monde initial
  └─ userworlds/{pseudo}-world.json : partie sauvegardée
```

**Frontend :** c’est l’application qui tourne dans le navigateur. Elle affiche la partie, anime les barres et réagit aux clics.

**Backend :** c’est le programme Node.js qui reçoit les requêtes. Il recalcule le monde et écrit les sauvegardes.

**HTTP :** c’est le moyen de transport. **GraphQL :** c’est la façon de décrire l’opération et les données demandées. **JSON :** c’est le format des réponses et des fichiers de sauvegarde.

Le backend garde l’état persistant. Au rechargement, le frontend se recale sur lui. Si le navigateur affiche une somme différente de celle du serveur, la somme du serveur revient au prochain chargement. C’est précisément ce qui rend les différences de règles importantes.

## 3. Carte des fichiers à connaître

Les liens ouvrent les fichiers du projet original. Les liens ouvrent les fichiers ; les méthodes sont décrites ci-dessous.

| Fichier | Responsabilité |
|---|---|
| [main.ts backend](C:/Users/Ghofrane/ISIS-CAPITALIST/Backend/typescript-starter/src/main.ts) | Démarre NestJS, sert les images, autorise les requêtes entre origines et écoute le port 3000. |
| [app.module.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Backend/typescript-starter/src/app.module.ts) | Assemble le service, le resolver, le contrôleur et GraphQL. Contient aussi un module de télémétrie du starter. |
| [schema.graphql](C:/Users/Ghofrane/ISIS-CAPITALIST/Backend/typescript-starter/src/schema.graphql) | Contrat de l’API : objets, champs, query et mutations. |
| [graphql.ts backend](C:/Users/Ghofrane/ISIS-CAPITALIST/Backend/typescript-starter/src/graphql.ts) | Classes et types générés depuis le schéma. |
| [origworld.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Backend/typescript-starter/src/origworld.ts) | Données de départ et paramètres du monde tunisien. |
| [resolver.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Backend/typescript-starter/src/resolver.ts) | Points d’entrée des opérations du joueur. |
| [app.service.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Backend/typescript-starter/src/app.service.ts) | Sauvegardes, calcul temporel, bonus et reset. |
| [app.controller.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Backend/typescript-starter/src/app.controller.ts) | Route HTTP « Hello World » du starter ; ce n’est pas le jeu. |
| [main.ts frontend](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/main.ts) | Lance l’application Angular. |
| [app.config.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/app.config.ts) | Configure Apollo Orbit, son transport HTTP et les animations Material. |
| [app.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/app.ts) | Gère les fenêtres et les listes à afficher ; montre les notifications. |
| [app.html](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/app.html) | Structure générale : bandeau, menu, statistiques, produits et fenêtres. |
| [produit.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/produit/produit.ts) | Une fiche produit, ses valeurs dérivées et son timer. |
| [produit.html](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/produit/produit.html) | Image, quantité, progression, achat et temps restant d’un produit. |
| [game.service.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/services/game.service.ts) | État partagé, simulation, achats et appels au backend. |
| [economy.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/services/economy.ts) | Prix d’un lot et nombre maximal achetable. |
| [game.models.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/models/game.models.ts) | Types utilisés par le frontend. |
| [queries.graphql](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/graphql/queries.graphql) | Opérations GraphQL lisibles écrites pour le client. |
| [operations.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/graphql/operations.ts) | Types et documents GraphQL générés ; les longs objets ne sont pas à apprendre par cœur. |
| [codegen.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/codegen.ts) | Indique au générateur le schéma, les opérations et le fichier à produire. |
| [big-value.pipe.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/pipes/big-value.pipe.ts) | Rend les grands nombres lisibles. |
| [duration.pipe.ts](C:/Users/Ghofrane/ISIS-CAPITALIST/Frontend/src/app/pipes/duration.pipe.ts) | Rend lisibles les durées fournies en millisecondes. |

Les fichiers CSS donnent l’apparence. Les fichiers `package.json` listent les dépendances et les commandes. Les fichiers `tsconfig` configurent TypeScript. `angular.json` décrit les tâches Angular. Les dossiers `node_modules`, `dist` et `.angular` sont respectivement les dépendances, les fichiers compilés et le cache de travail.

## 4. Modèle de données : World, Product et Palier

### World : la partie complète

| Champ | Signification |
|---|---|
| `name`, `logo` | Identité visuelle du monde. |
| `money` | Argent disponible à cet instant. Diminue lors des achats. |
| `score` | Total des revenus gagnés, conservé au reset. Dépenser de l’argent ne le diminue pas. |
| `totalangels` | Total des anges déjà obtenus lors des resets. |
| `activeangels` | Anges encore disponibles : ils donnent le bonus et servent à acheter des Angel Upgrades. |
| `angelbonus` | Bonus en pourcentage apporté par un ange actif. Valeur initiale : 2. |
| `lastupdate` | Instant utilisé par le serveur pour savoir combien de temps s’est écoulé. Timestamp Unix en secondes pour GraphQL ; le JSON conserve aussi `lastupdateMs` pour les calculs précis. |
| `products` | Liste des six produits. |
| `managers` | Managers et leur état. |
| `upgrades` | Améliorations achetables avec l’argent. |
| `angelupgrades` | Améliorations achetables avec des anges. |
| `allunlocks` | Bonus obtenus lorsque tous les produits atteignent un seuil. |

Exemple pour comprendre `money` et `score` : on gagne 100 DT, puis on dépense 60. Le gain ajoute 100 aux deux champs ; l’achat enlève 60 seulement à `money`. Le score reste 100.

L’argent initial de 100 DT est un choix de votre monde, pas un revenu produit : le score initial reste donc zéro.

### Product : un type d’investissement

| Champ | Signification |
|---|---|
| `id` | Identifiant stable du produit. |
| `name`, `logo` | Nom et image. |
| `cout` | Prix du prochain exemplaire à acheter. |
| `croissance` | Multiplicateur du prix après chaque exemplaire acheté. 1,07 signifie une hausse de 7 %. |
| `revenu` | Gain d’un exemplaire pour un cycle terminé, avant bonus des anges. Les bonus de revenu modifient directement ce champ. |
| `vitesse` | Durée d’un cycle. Une valeur plus petite signifie une production plus rapide. |
| `quantite` | Nombre d’exemplaires possédés. |
| `timeleft` | Temps restant avant la fin du cycle, selon la convention attendue. |
| `managerUnlocked` | Production automatisée ou non. |
| `paliers` | Seuils propres au produit. |

**Ne pas confondre quantité et nombre de cycles.** Avec 4 Chechias et un revenu de 1, un cycle rapporte 4 DT. Si trois cycles sont terminés, le gain est 12 DT.

### Palier : un objet réutilisé dans plusieurs contextes

| Champ | Signification |
|---|---|
| `name`, `logo` | Nom et illustration du manager ou bonus. |
| `seuil` | Quantité à atteindre pour un unlock ; prix en argent pour un manager/Cash Upgrade ; prix en anges pour un Angel Upgrade. |
| `idcible` | ID d’un produit ; 0 pour tous les produits ; -1 pour le bonus global des anges. |
| `ratio` | Multiplicateur de revenu/vitesse, ou points ajoutés au bonus des anges. Non utilisé pour les managers. |
| `typeratio` | `gain`, `vitesse` ou `ange`. |
| `unlocked` | Indique si cet élément est déjà acquis/déclenché. |

Le même format permet de transmettre plusieurs listes sans inventer un schéma différent pour chacune. Le sens du seuil dépend donc de la liste dans laquelle le palier se trouve.

## 5. Lire le TypeScript sans se perdre

| Syntaxe rencontrée | Comment la comprendre |
|---|---|
| `class` | Un ensemble de données et de méthodes. |
| `interface` / `type` | Une description des valeurs acceptées par TypeScript ; ce n’est pas une validation automatique des JSON reçus. |
| `private` | Partie interne de la classe. |
| `readonly` | Empêche de remplacer la propriété par une autre référence ; un signal readonly peut toujours changer de valeur via `.set()`. |
| `async` / `await` | Une fonction attend le résultat d’une opération asynchrone, par exemple une réponse réseau. |
| `Promise<T>` | Un résultat futur qui aura le type `T`. |
| `void` | La méthode ne retourne pas de valeur utile. Devant un appel asynchrone, `void` indique que la promesse n’est pas attendue à cet endroit. |
| `?.` | Accès seulement si la valeur existe. |
| `??` | Valeur de secours si la précédente est `null` ou `undefined`, sans remplacer un zéro valide. |
| `find` | Retrouve un élément. |
| `filter` | Garde les éléments correspondant à une condition. |
| `map` | Transforme chaque élément d’une liste. |
| `every` | Vérifie que tous les éléments respectent la condition. |
| `...objet` / `...liste` | Copie les propriétés ou les éléments dans une nouvelle structure ; copie superficielle. |
| `structuredClone(world)` | Copie indépendante des objets et tableaux imbriqués de ce monde. |
| `Math.floor` | Arrondit vers l’entier inférieur. |
| `%` | Reste d’une division ; utile pour compter les cycles et le reliquat. |
| `TData`, `TVariables` | Paramètres de type : une méthode peut servir à plusieurs réponses et variables sans perdre leur typage. |

Exemples du modèle frontend :

```ts
type World = NonNullable<GetWorldQuery['getWorld']>;
type Product = World['products'][number];
```

`GetWorldQuery['getWorld']` sélectionne le type du monde dans la réponse générée. `NonNullable` retire les possibilités `null` et `undefined` pour décrire un monde effectivement chargé. Le signal `world` reste pour sa part `World | null`, car le chargement peut ne pas être terminé.

`World['products'][number]` désigne le type d’un élément du tableau de produits. `Pick<Product, 'cout' | 'croissance'>` ne garde que les champs nécessaires au calcul économique.

## 6. Angular Signals : pourquoi l’affichage se met à jour

Un signal est une valeur dont Angular peut suivre les lecteurs.

```ts
world = signal<World | null>(null);
world();              // lit la valeur actuelle
world.set(nouveau);   // remplace la valeur
world.update(ancien => ({ ...ancien!, money: 100 }));
```

Le dernier exemple illustre la syntaxe ; dans le code réel, il faut vérifier que le monde existe, comme le fait le service. `!` dit au compilateur qu’une valeur existe ; il ne protège pas au moment de l’exécution.

Le template affiche `game.world()?.money`. Lorsqu’un nouveau monde est placé dans le signal, Angular actualise l’argent et les composants qui en dépendent.

**computed :** calcule une valeur à partir d’autres signaux. Le badge manager compte les managers non acquis dont le prix est inférieur ou égal à l’argent disponible. Quand l’argent change, le badge est recalculé.

**effect :** exécute une action lorsque les signaux qu’il lit changent. Dans `App`, un effet lit `snackMessage` et ouvre une notification Material.

**input.required :** reçoit une donnée du composant parent. Chaque `Produit` reçoit son produit et le mode d’achat. `App` répète le composant dans un `@for` en suivant `product.id`, afin d’associer chaque fiche au même produit lors des mises à jour.

**inject :** récupère une dépendance fournie par Angular. `GameService` est partagé via `providedIn: 'root'`. `App` et les six composants `Produit` travaillent donc sur le même monde.

**OnPush :** stratégie de détection des changements utilisée par les composants. Les signaux lus dans les templates et les inputs permettent de demander les mises à jour nécessaires. C’est pourquoi créer de nouvelles références d’objets/liste est utile : modifier silencieusement une propriété de l’objet contenu dans un signal n’est pas équivalent à mettre à jour ce signal.

## 7. Chargement initial et changement de joueur

Quand Angular crée `GameService`, son constructeur :

1. cherche `username` dans le stockage local du navigateur ;
2. utilise ce pseudo, ou génère `Captain` suivi d’un nombre ;
3. initialise `loginModel.username` et le joueur `user` ;
4. mémorise le pseudo ;
5. appelle `refreshWorld(false)`.

`refreshWorld` envoie `GetWorld` avec le joueur, récupère la réponse, la normalise et place le monde dans le signal. `loading` sert à afficher la synchronisation et `connectionError` à signaler un problème.

Sur le serveur, `getWorld` fait :

```text
lire la sauvegarde → calculer le temps écoulé → sauvegarder → retourner le monde
```

La query écrit donc une sauvegarde, comme le demande le sujet. Cela mémorise également les gains hors connexion qui viennent d’être calculés.

`loginModel.username` contient la saisie ; `form(loginModel)` crée le formulaire et `[formField]` relie le champ HTML. `user` désigne la partie chargée. `commitName` demande le nouveau monde puis valide `user` et le stockage local seulement après succès. Pendant une requête ou mutation, `busy` bloque une autre action. Un chargement refusé conserve l’ancien joueur et son monde.

Le stockage local conserve le pseudo, pas toute la partie. La partie est conservée dans les fichiers du backend. Deux navigateurs utilisant le même pseudo accèdent donc au même fichier ; aucune preuve d’identité n’est demandée.

## 8. GraphQL : contrat, query, mutation et génération

Une query demande des données. Une mutation représente une action qui change le monde. Elles empruntent ici le même endpoint HTTP.

```graphql
query GetWorld($user: String!) {
  getWorld(user: $user) {
    name
    money
  }
}
```

`$user` est une variable. `String!` impose une chaîne non nulle. La réponse contient seulement les champs sélectionnés. La vraie query du projet demande tous les champs utiles à la simulation.

```graphql
mutation AcheterQtProduit($user: String!, $id: Int!, $quantite: Int!) {
  acheterQtProduit(user: $user, id: $id, quantite: $quantite) {
    id
  }
}
```

Les variables peuvent être `user="demo"`, `id=1`, `quantite=3`. Le serveur reçoit une demande d’achat, pas un montant d’argent fourni par le navigateur. Il recalcule le coût à partir de sa sauvegarde.

Apollo Orbit transporte les documents générés en HTTP. `worldQuery` est une requête créée avec `apollo.signal.query`. Les achats, productions, managers, upgrades et reset utilisent chacun `apollo.signal.mutation` puis `mutate({ variables })`.

```typescript
readonly acheterProduitsMutation = this.apollo.signal.mutation(
  AcheterQtProduitDocument, { fetchPolicy: 'no-cache' },
);
// Au moment de l’achat :
await this.acheterProduitsMutation.mutate({
  variables: { user: this.user(), id: productId, quantite: quantity },
});
```

Le monde est un `linkedSignal` dérivé des données de la query. Il reste modifiable pour l’animation et les achats locaux. `no-cache` évite que les petites réponses de mutation fusionnent avec le monde simulé. `lazy: true` permet de charger explicitement un joueur ; les rechargements automatiques sont désactivés pour garder une synchronisation contrôlée.

Apollo expose les données et erreurs sous forme de signals et permet d’attendre une mutation avec `await`. GraphQL valide les types et les noms ; le resolver doit encore vérifier les règles telles que l’argent disponible et les doublons.

Les mutations du frontend ne demandent que `id` ou `name`. **Elles ne rechargent pas tout le monde après chaque succès.** Le frontend garde son calcul local. En cas d’erreur, il avertit le joueur et recharge le monde.

La génération évite de réécrire manuellement tous les types :

- Backend : schéma → classes de `graphql.ts`, via la configuration NestJS.
- Frontend : schéma + opérations de `queries.graphql` → types et documents de `operations.ts`, via Codegen.

Les objets volumineux de `operations.ts` décrivent l’arbre d’une requête GraphQL. Ce sont des résultats de génération normale. On modifie les fichiers sources du générateur, puis on relance Codegen.

## 9. Acheter des produits : logique et calculs

Supposons que le coût du prochain exemplaire soit `c`, sa croissance `r`, et que l’on achète `n` exemplaires.

```text
coût total = c + c×r + c×r² + ... + c×r^(n−1)
```

Si `r ≠ 1`, la somme géométrique donne :

```text
coût total = c × (r^n − 1) / (r − 1)
nouveau coût du prochain exemplaire = c × r^n
```

Si `r=1`, chaque exemplaire coûte la même chose et le total est simplement `c×n`.

Exemple réel de Chechia : coût 4, croissance 1,07 et quantité initiale 1.

```text
achat de 3 : 4 + 4,28 + 4,5796 = 12,8596 DT
argent : 100 − 12,8596 = 87,1404 DT
quantité : 1 + 3 = 4
prix suivant : 4 × 1,07³ = 4,900172 DT
```

`purchaseCost` utilise la formule directe. Le resolver backend additionne les prix dans une boucle. Les deux méthodes représentent le même calcul, avec de possibles petites différences d’arrondi des nombres flottants.

### Le mode MAX

Le programme cherche le plus grand entier `n` tel que le coût total soit inférieur ou égal à l’argent `M`.

Pour une croissance supérieure à 1, on inverse la formule :

```text
n ≤ log(1 + M×(r−1)/c) / log(r)
```

`maxAffordable` prend la partie entière, puis vérifie le résultat avec `purchaseCost` et l’ajuste d’une unité si nécessaire. Ces vérifications compensent les erreurs d’arrondi numériques. Pour votre monde, toutes les croissances sont supérieures à 1.

### Cycle complet d’un achat

1. Le bouton dans `Produit` appelle `buy()`.
2. `buy()` appelle `game.buyProduct(id)`.
3. Le service choisit 1, 10, 100 ou MAX et calcule le prix.
4. Il vérifie l’argent, copie le monde, retire le prix, augmente la quantité et le coût suivant.
5. Il vérifie les nouveaux seuils, puis remplace le signal `world`.
6. Il envoie la mutation au backend.
7. Le backend lit sa partie et calcule les productions dues **avant l’achat**.
8. Il recalcule le prix, vérifie l’argent, applique l’achat et les seuils, puis sauvegarde.

Le frontend s’actualise avant la confirmation réseau : c’est une **mise à jour optimiste**. Elle rend le clic immédiat. Si la transmission échoue, `sendMutation` avertit le joueur et appelle `refreshWorld` pour récupérer l’état du serveur. Un succès conserve l’état local : les règles doivent donc être identiques.

## 10. Production manuelle, automatique et hors connexion

### Production manuelle

Le frontend autorise le clic si le produit est possédé, sans manager, et au repos. `startProduction` place son temps restant à la durée du cycle et envoie la mutation. Le backend place également `timeleft` à `vitesse`.

Le composant `Produit` crée un timer toutes les 100 ms. À chaque passage :

```text
instant actuel = performance.now()
temps écoulé = instant actuel − instant du passage précédent
```

Cette différence est directement transmise en millisecondes à `tickProduct`. Les champs `vitesse` et `timeleft` utilisent la même unité. Une valeur 500 correspond donc à une demi-seconde.

Il ne faut pas simplement enlever 0,1 s à chaque passage : un navigateur occupé peut appeler le timer en retard. La mesure du temps réel permet de rattraper ce retard.

`tickProduct` réduit `timeleft`. À la fin d’un cycle manuel, il ajoute une seule production et met le temps restant à zéro. Un long délai ne produit pas plusieurs fois un produit sans manager.

`ngOnDestroy` arrête le timer lorsque le composant disparaît. Sinon, un composant supprimé continuerait à déclencher des mises à jour inutiles.

### Production automatique : raisonnement attendu

Prenons une durée `D`, un temps restant `R` et un temps écoulé `E`. Toutes les valeurs doivent avoir la même unité.

Si `E < R` : aucun cycle terminé, nouveau reste `R−E`.

Sinon :

```text
temps après la fin du premier cycle = E − R
cycles terminés = 1 + floor((E − R) / D)
reste écoulé dans le nouveau cycle = (E − R) modulo D
temps restant = D − ce reste
```

À une frontière exacte, le prochain cycle automatique débute avec un temps restant égal à `D`.

Exemple : cycle de 10 s, 2 s restantes, 25 s écoulées.

```text
après le premier cycle : 25 − 2 = 23 s
cycles terminés : 1 + floor(23 / 10) = 3
reste déjà écoulé : 3 s
temps restant : 10 − 3 = 7 s
```

Avec 4 unités, un revenu de 5 et aucun ange, ces trois cycles rapportent `3×4×5 = 60`.

**Ce raisonnement est maintenant le même dans le frontend et le backend.** Les formules de cette section s’appliquent avec des unités identiques : dans le code, ce sont des millisecondes.

### Hors connexion : aucun timer serveur n’est nécessaire

Le backend ne fait pas tourner une boucle pour chaque joueur. À la prochaine requête, il lit `lastupdate`, mesure l’absence et calcule d’un coup les cycles qui auraient été terminés par les managers. Il ajoute les revenus et mémorise la nouvelle date.

Sans manager, seule une production déjà démarrée peut finir pendant l’absence. Avec manager, plusieurs cycles peuvent être comptés.

`performance.now()` sert au navigateur pour mesurer des intervalles locaux. `Date.now()` représente une date pouvant être conservée dans une sauvegarde. Il ne faut pas comparer directement ces deux horloges.

Le backend utilise `Date.now()` et conserve `lastupdateMs` dans le JSON pour ne pas perdre les fractions de seconde entre les actions. `lastupdate` reste en secondes dans l’API : le type GraphQL `Int` ne peut pas contenir une date Unix en millisecondes. Ces métadonnées privées ne changent pas le schéma fourni.

### La barre de progression

```text
progression en % = (1 − timeleft / vitesse) × 100
```

Début : il reste toute la durée, donc 0 %. Milieu : il reste la moitié, donc 50 %. Fin : 100 %, puis retour au repos ou nouveau cycle.

La barre est une représentation du temps ; elle ne doit pas devenir une seconde source indépendante de calcul des revenus.

## 11. Managers, unlocks et upgrades

### Manager

Un manager automatise un seul produit : il ne multiplie pas son revenu. Ses deux indicateurs sont `manager.unlocked` et `product.managerUnlocked`.

Le frontend et le backend vérifient le prix, prélèvent l’argent, activent les indicateurs et démarrent un cycle si le produit est possédé et au repos. Le serveur refuse aussi un manager déjà engagé. Un cycle manuel en cours conserve son temps restant.

### Unlock propre au produit

Après un achat, on parcourt les paliers de ce produit. Si la quantité a atteint le seuil et que `unlocked` est faux, on active le palier et applique son bonus.

Ce contrôle doit supporter un achat de plusieurs unités qui franchit plusieurs seuils. Par exemple, un passage de 19 à 80 peut déclencher le palier 20 et le palier 75.

### Allunlock

On vérifie que **tous** les produits atteignent le seuil avec `every`. Si une quantité reste sous le seuil, le bonus n’est pas obtenu. Le bonus s’applique aux produits ciblés une seule fois.

### Cash Upgrade et Angel Upgrade

Un Cash Upgrade prélève `money`. Un Angel Upgrade prélève `activeangels`, ce qui réduit aussi le bonus général apporté par les anges restants. Les deux deviennent `unlocked` et ne doivent pas être achetés une seconde fois.

L’application du bonus peut être réutilisée pour les unlocks et les upgrades ; c’est la différence entre « quand obtenir le bonus » et « quel effet appliquer ».

| Type | Règle attendue | Exemple |
|---|---|---|
| `gain` | `revenu *= ratio` | Revenu 5, ratio 3 → revenu 15. |
| `vitesse` | `vitesse /= ratio` | Durée 2000 ms, ratio 2 → 1000 ms. |
| `ange` | `angelbonus += ratio` | Bonus de 3 %, ratio 2 → 5 % par ange. |

Pour accélérer un cycle déjà commencé, on peut conserver sa fraction de progression. Durée 10 000 ms, reste 8 000 ms : 20 % terminés. Après un bonus ×2, durée 5 000 ms, reste 4 000 ms : toujours 20 %, mais fin plus proche. Les deux côtés conservent cette fraction. Avec des durées entières, un éventuel arrondi est limité à une milliseconde.

Les revenus des produits sont déjà modifiés lorsqu’un bonus de gain est activé. Il ne faut donc pas multiplier à nouveau par tous les upgrades dans la formule finale du revenu : cela appliquerait le bonus deux fois.

## 12. Anges et reset : explication complète

Les anges dépendent du **score cumulé**, pas du solde disponible.

```text
total théorique = floor(150 × sqrt(score / 10^15))
nouveaux anges = max(0, total théorique − totalangels)
```

Pourquoi soustraire `totalangels` ? Parce que le score contient les revenus de toutes les parties, et certains anges ont déjà été réclamés. Sans soustraction, chaque reset donnerait une seconde fois les mêmes anges.

Exemple : score 10¹⁵, 100 anges déjà obtenus, dont 30 dépensés.

```text
total théorique = 150
nouveaux anges = 150 − 100 = 50
avant reset : totalangels=100, activeangels=70
après reset : totalangels=150, activeangels=120
```

Les 30 anges dépensés restent dépensés. Le reset conserve le score, recrée le monde initial, conserve les anges actifs restants et ajoute les nouveaux aux deux compteurs. Produits, argent, managers et upgrades repartent aux paramètres d’origine.

Le bonus individuel revient à celui du monde original lorsque ses upgrades sont réinitialisés. Votre monde initial redonne 100 DT et une Chechia ; « reset » signifie revenir à cet état, pas forcément à zéro argent et zéro produit.

Le frontend envoie la mutation `ResetWorld`, puis fait un refresh. Son bouton est désactivé si aucun nouvel ange n’est récupérable.

Le frontend et le backend utilisent maintenant le même dénominateur, 10¹⁵. Le reset conserve le score, ajoute les nouveaux anges au total et aux actifs, puis reprend les produits, managers et upgrades du monde initial.

### Formule du revenu avec anges

```text
gain = cycles terminés × quantité × revenu
       × (1 + activeangels × angelbonus / 100)
```

Avec 4 produits, revenu 5, trois cycles, 10 anges et 2 % par ange :

```text
gain de base : 3 × 4 × 5 = 60
bonus anges : 1 + 10 × 2 / 100 = 1,2
gain final : 60 × 1,2 = 72
```

Un bonus de +20 % donne un multiplicateur de 1,2, pas de 20 ni de 0,2. Cinquante anges à 2 % donnent +100 %, donc doublent le revenu.

## 13. Backend : rôle de chaque méthode

### AppService

| Méthode | Ce qu’elle fait | Point à connaître |
|---|---|---|
| `getHello` | Retourne « Hello World ». | Starter, sans règle de jeu. |
| `readUserWorld` | Lit le JSON, crée un monde si le fichier manque, convertit une ancienne version. | Ne remplace pas les parties valides à zéro ; signale les fichiers illisibles. |
| `migrateWorld` | Reconstruit les durées depuis les produits et bonus acquis, puis inscrit la version 2. | Conversion unique ; les anciens cycles automatiques reprennent au début d’un cycle. |
| `saveWorld` | Crée le dossier si nécessaire et écrit le JSON. | Écriture synchrone ; simple pour ce projet. |
| `updateWorld` | Calcule les cycles depuis `lastupdateMs`, puis actualise la date. | Manuel : au maximum un gain ; manager : plusieurs cycles et reste conservé. |
| `resetWorld` | Recrée le monde initial et conserve score/anges. | Nouveaux anges calculés avec 10¹⁵. |
| `checkUnlocks` | Vérifie les paliers propres au produit et les seuils globaux. | `unlocked` empêche de réappliquer le même bonus. |
| `applyUpgrade` | Sélectionne les produits cibles ou le monde pour les anges. | ID 0 = tous ; -1 = bonus ange. |
| `newWorld`, `worldPath` | Créent une copie indépendante et construisent le chemin de sauvegarde. | Refus des noms contenant un chemin. |
| `addProduction` | Calcule le gain et l’ajoute à money et score. | Le bonus des anges est appliqué ici. |

`JSON.parse` transforme du texte en objet. `JSON.stringify` fait l’inverse. Une assertion `as World` aide TypeScript, mais ne garantit pas qu’un fichier JSON corrompu respecte ce type.

`structuredClone(origworld)` est un bon choix : deux nouveaux joueurs ne doivent pas partager le même objet mutable en mémoire. Modifier la partie d’un joueur ne doit pas modifier le modèle de départ d’un autre.

### GraphQlResolver

Les décorateurs `@Query`, `@Mutation` et `@Args` relient le code aux opérations du schéma. NestJS fournit `AppService` au constructeur.

| Opération | Traitement principal |
|---|---|
| `getWorld(user)` | Lit, actualise, sauvegarde, retourne le monde. |
| `acheterQtProduit(user,id,quantite)` | Retrouve le produit, valide quantité et argent, calcule le coût, applique l’achat et les unlocks, sauvegarde. |
| `lancerProductionProduit(user,id)` | Refuse quantité nulle, cycle actif ou manager ; démarre un cycle valide. |
| `engagerManager(user,name)` | Vérifie les fonds et le doublon, prélève le prix et active l’automatisation. |
| `acheterCashUpgrade(user,name)` | Vérifie existence, doublon et argent ; prélève, applique, sauvegarde. |
| `acheterAngelUpgrade(user,name)` | Même logique avec les anges actifs. |
| `resetWorld(user)` | Actualise les revenus, demande le reset au service, sauvegarde. |

Presque toutes ces méthodes commencent par `updateWorld(readUserWorld(user))`. C’est nécessaire : si l’on achète 10 unités après 30 secondes d’absence, les 30 secondes passées doivent être rémunérées avec l’ancienne quantité, puis l’achat change la production future.

## 14. Frontend : rôle de chaque méthode

### App et Produit

`App.activeModal` vaut `null` ou le nom d’une fenêtre : managers, unlocks, cash, investors ou angels. `openModal` change ce signal ; `closeModal` le remet à `null`. Escape ferme aussi la fenêtre. Le template utilise `@switch` pour choisir le contenu.

Les listes `lockedManagers`, `lockedCashUpgrades` et `lockedAngelUpgrades` éliminent les éléments acquis. `lockedUnlocks` rassemble les paliers des produits et les paliers globaux, ajoute leur cible et les trie par seuil.

Dans `Produit`, les valeurs calculées sont : quantité à acheter, coût, possibilité d’acheter, progression, gain d’un cycle et indicateur de production. Les actions `buy` et `startProduction` délèguent au service. Le composant est donc surtout responsable de l’affichage et du timer, pas de la sauvegarde.

### GameService

| Méthodes / signaux | Responsabilité |
|---|---|
| `server`, `user`, `loginModel`, `loginForm`, `world` | Adresse des images, joueur validé, saisie/formulaire et monde modifiable. |
| `loading`, `busy`, `connectionError` | Chargement, protection des actions et erreur de connexion. |
| `purchaseMode` | Mode partagé x1/x10/x100/MAX. |
| `managerBadge`, `cashUpgradeBadge`, `angelUpgradeBadge` | Nombre d’achats actuellement accessibles. |
| `claimableAngels` | Prévision des nouveaux anges avec la formule du sujet. |
| `setLoginName`, `commitName`, `refreshWorld`, `loadWorld` | Saisie, récupération du monde puis validation du pseudo. |
| `cyclePurchaseMode`, `purchaseModeLabel` | Passage au mode suivant et texte du bouton. |
| `quantityToBuy`, `costToBuy`, `canBuy` | Choix de la quantité, coût et disponibilité. |
| `buyProduct` | Achat local, seuils, puis mutation. |
| `startProduction`, `tickProduct` | Lancement et évolution temporelle locale. |
| `hireManager` | Paiement local et automatisation, puis mutation. |
| `buyCashUpgrade`, `buyAngelUpgrade` | Paiement local et bonus, puis mutation. |
| `resetWorld` | Mutation de reset et refresh. |
| `assetUrl` | Construit l’URL d’une image à partir de l’adresse du serveur et encode les segments du chemin. Contient des réparations d’encodage spécifiques. |
| `productName`, `bonusLabel` | Libellés de cible et de bonus. |
| `checkUnlocks`, `applyBonus` | Déclenche et applique les bonus au monde local. |
| `updateProduct` | Retourne un monde avec la version modifiée d’un produit. |
| `normaliseWorld` | Copie la réponse et remet certains champs sous forme de nombres. Protège l’affichage contre certains temps incohérents reçus. |
| `isPending`, `withPending` | Suit les actions réseau en cours pour éviter un doublon transmis et désactiver des boutons. |
| `worldQuery`, les six signals de mutation, `sendMutation` | Transmission via Apollo, retour à l’état précédent et rechargement après erreur. |
| `notify`, `errorMessage` | Message de notification et extraction d’un texte d’erreur. |

`pendingActions` est un ensemble de clés : `product:1`, `manager:Hassen`, etc. Le service crée un nouvel ensemble lorsque l’état change afin de mettre à jour le signal. `busy` bloque les nouvelles actions avant leur modification locale, y compris celles avec une autre clé. La protection porte donc à la fois sur l’affichage et sur la transmission.

Le numéro de `snackMessage` change à chaque notification. Deux messages dont le texte est identique peuvent donc rester deux événements distincts.

## 15. HTML, CSS et pipes

Dans le template :

```html
{{ game.world()?.money }}
[disabled]="!canBuy()"
(click)="buy()"
[style.width.%]="progress()"
```

L’interpolation affiche une valeur. Les crochets lient une propriété. Les parenthèses relient un événement à une méthode. Le dernier exemple donne à la barre une largeur correspondant au pourcentage calculé.

`@if` affiche conditionnellement ; `@for` répète ; `@switch` choisit une branche. `track product.id` aide Angular à reconnaître une fiche stable lorsque le tableau est remplacé.

Le CSS organise l’en-tête, le menu, les cartes et les fenêtres. Grid définit les colonnes ; Flex aligne certains éléments ; les media queries adaptent la présentation selon la largeur. Les styles ne calculent pas l’argent ou les revenus.

Un pipe transforme une valeur pour l’affichage. `bigvalue` conserve les valeurs stockées et affiche, par exemple, plusieurs millions avec une puissance de dix. `duration` convertit une durée en millisecondes vers minutes/secondes/dixièmes, et ajoute les heures si nécessaire. Le formatage ne doit pas être utilisé comme valeur dans les calculs : on calcule avec les nombres, pas avec les textes affichés.

## 16. Synchronisation : pourquoi les deux côtés calculent

Le frontend doit animer et mettre à jour les gains entre deux requêtes. Le backend doit conserver les parties et calculer les gains pendant l’absence. Une petite différence liée à la latence peut apparaître ; la consigne l’admet. Une différence de prix, de formule ou de sens de `timeleft` est en revanche un défaut.

Le navigateur n’envoie pas son score à chaque tick. Il transmet les actions, puis simule localement. Le serveur reconstruit les conséquences à partir des actions et du temps. Cela limite le nombre de requêtes : une production automatisée n’envoie pas une mutation à chaque cycle.

Deux choses à tester séparément :

- Après un clic, l’affichage paraît-il correct ?
- Après un refresh ou une reconnexion, le serveur confirme-t-il le même état ?

Un frontend seul peut sembler correct alors que la sauvegarde ne l’est pas. C’est pourquoi l’engagement d’un manager a été testé aussi sur l’API réelle.

## 17. Ce que prouvent les tests actuels

Les 23 tests frontend couvrent les achats, le temps, les managers, les bonus, les anges, les changements de joueur, les doublons, les erreurs réseau et le reset. Les réponses HTTP y sont simulées pour provoquer précisément les situations à vérifier.

Les 24 tests backend couvrent les règles du jeu et les sauvegardes, avec une horloge contrôlée. Sept scénarios ont aussi réussi sur l’API réelle. Les deux compilations et la génération Codegen ont réussi.

Le navigateur a permis de vérifier une nouvelle partie, un cycle manuel, un manager et une synchronisation sans erreur console. Les tests ne remplacent pas l’essai avec le serveur d’un autre groupe, qui reste à réaliser.

Une horloge contrôlée permet de tester « 3 secondes se sont écoulées » sans attendre réellement 3 secondes. On prépare un monde, on fixe l’instant courant, on appelle la méthode et on compare quantité, argent, score et temps restant au résultat attendu.

## 18. Conversion des anciennes parties

`saveVersion=2` indique que les durées du JSON sont en millisecondes et que `timeleft` est bien un temps restant. Une ancienne partie est convertie une seule fois. Les quantités, soldes, anges et achats restent présents. Les durées sont reconstruuites depuis `origworld` et les bonus de vitesse acquis.

Les anciennes productions automatiques reprennent au début d’un cycle. Le serveur n’attribue pas de gains hors connexion sur l’intervalle antérieur à la conversion : les unités de l’ancien code étaient ambiguës. Les intervalles suivants utilisent le calcul corrigé. Les anciens managers gratuits ne sont pas facturés rétroactivement.

## 19. Comment travailler pour vraiment comprendre

1. Lire les modèles et expliquer chaque champ sans regarder le code.
2. Faire à la main l’exemple d’achat de trois Chechias.
3. Suivre cet achat dans le template, le composant, le service, GraphQL et le resolver.
4. Calculer un cycle manuel, puis plusieurs cycles avec manager et un cycle partiellement terminé.
5. Expliquer un unlock, un Cash Upgrade et un Angel Upgrade avec la même fonction d’application de bonus.
6. Calculer un reset en séparant score, totalangels et activeangels.
7. Expliquer pourquoi un refresh doit confirmer les résultats locaux.
8. Corriger un problème puis écrire un petit test dont vous savez justifier le résultat.

Vous n’avez pas besoin de réciter les objets générés ni les styles ligne par ligne. Vous devez pouvoir retrouver la méthode responsable d’un comportement, expliquer ses entrées, ses sorties, son calcul et sa sauvegarde. C’est la compétence que votre soutenance doit montrer.
