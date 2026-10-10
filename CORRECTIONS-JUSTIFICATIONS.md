# ISIS Capitalist — corrections et justification des choix

Projet : `C:\Users\Ghofrane\ISIS-CAPITALIST`. Corrections du 10 octobre 2026, à partir des deux consignes et de l’audit initial.

## Résultat

Les écarts identifiés dans les règles du jeu et dans les APIs pédagogiques du frontend sont corrigés. La structure existante et le thème « Saveurs de Tunisie » sont conservés : Angular, App/Produit/GameService, NestJS, GraphQL schema-first et sauvegardes JSON par joueur.

Les vérifications comprennent 23 tests frontend, 24 tests backend, 7 scénarios sur l’API HTTP réelle, les deux compilations et la génération GraphQL. Une nouvelle partie, une production manuelle, un manager et la synchronisation ont aussi été essayés dans le navigateur.

Cela valide les comportements décrits ici. L’échange avec le serveur d’un autre groupe reste à essayer : aucun autre serveur n’était disponible pendant cette intervention. Les noms d’opérations, arguments et types du schéma backend fourni sont conservés.

## 1. Ce qui change et pourquoi

| Problème initial | Correction | Justification |
|---|---|---|
| Le serveur offrait les managers gratuitement. | Vérification de l’argent, prélèvement du prix et refus d’un deuxième engagement. | Le prix est une règle métier. Le serveur doit la vérifier même si quelqu’un appelle directement GraphQL. |
| Frontend et backend utilisaient des secondes pour les produits. | `vitesse`, `timeleft` et les durées écoulées sont maintenant en millisecondes des deux côtés. Le pipe convertit en secondes uniquement pour afficher. | La consigne frontend utilise les millisecondes. Un produit reçu avec `vitesse=500` doit finir en 0,5 seconde. |
| `timeleft` était interprété comme du temps déjà accumulé par le serveur. | Il représente partout le temps restant avant la prochaine fin de cycle. | Cela correspond à la consigne, à la barre de progression et au calcul manuel. |
| Le temps était arrondi à la seconde sur le serveur. | Les calculs utilisent `Date.now()` en ms ; le JSON conserve `lastupdateMs`. | Cinq actions séparées de 100 ms doivent représenter 500 ms, même si elles tombent dans la même seconde. |
| Le reset donnait beaucoup trop d’anges. | Formule `max(0, floor(150 × sqrt(score / 10^15)) − totalangels)`. | C’est la formule du sujet. À un score de 10^15, le total théorique est 150 anges. |
| Le bonus d’ange multipliait le pourcentage. | `angelbonus += ratio`. Un bonus général est appliqué une fois au monde. | Un bonus +2 avec une valeur initiale 3 donne 5, pas 6, ni six additions pour six produits. |
| Un bonus de vitesse laissait le temps restant inchangé sur le serveur. | Division de la durée et ajustement proportionnel du temps restant. | Un cycle terminé à 20 % reste terminé à 20 %, mais son échéance se rapproche. |
| Le plancher d’une seconde annulait certains bonus. | Le plancher vaut désormais 1 ms. | Le schéma impose un `Int` ; 1 ms est la plus petite durée entière positive représentable. Les cycles de 500 et 250 ms fonctionnent. |
| Le serveur acceptait des productions impossibles. | Refus si quantité nulle, cycle déjà actif ou manager présent. | Un clic ne doit pas redémarrer ou prolonger un cycle existant, ni produire sans exemplaire. |
| Le premier produit démarrait avec un temps restant incohérent. | `timeleft=0` dans le monde initial. | Une nouvelle partie ne gagne rien sans action ; la première production démarre au clic ou lors de l’engagement du manager. |
| Une sauvegarde valide à zéro était effacée. | Seule l’absence de fichier crée une nouvelle partie. Un JSON illisible provoque une erreur. | Zéro argent ne signifie pas « aucune partie ». Les quantités et achats restent valables. Un fichier corrompu ne doit pas être écrasé silencieusement. |
| La migration devinait les unités à partir des vitesses et de l’ordre des produits. | Version JSON `saveVersion=2`, reconstruction des durées par identifiant et bonus acquis. | Une durée réduite par un bonus peut ressembler à une autre durée initiale ; le simple remplacement de valeurs n’est pas fiable. |
| Le pseudo pouvait changer alors que le monde restait celui de l’ancien joueur. | Chargement du nouveau monde, puis validation du pseudo et du stockage local. | Une erreur de chargement conserve le couple ancien joueur/ancien monde. |
| Un deuxième clic pouvait modifier le monde local avant d’être ignoré sur le réseau. | `busy` bloque les actions avant toute modification locale tant qu’un chargement ou une mutation est en cours. | Une seule action à la fois est facile à comprendre et évite les dépenses et achats concurrents. |
| Le frontend n’employait pas les APIs Apollo Signal montrées dans la consigne. | Apollo Orbit : `apollo.signal.query`, `apollo.signal.mutation` et monde modifiable avec `linkedSignal`. | Le code suit maintenant la méthode enseignée, tout en gardant la simulation locale. |
| Le champ joueur avait une liaison manuelle. | `form(loginModel)` et `[formField]="game.loginForm.username"`. | Le formulaire et son signal se synchronisent directement, comme dans le sujet. |
| Le client gardait son achat optimiste après certains échecs. | Retour à l’état précédent puis tentative de rechargement serveur. | La modification locale améliore la réactivité, mais ne confirme pas à elle seule la réussite de l’action. |
| Le calcul du coût était différent dans sa forme entre client et serveur. | Même formule géométrique et même ordre des opérations numériques. | Cela évite les écarts d’arrondi à la limite d’un solde exactement égal au prix. |
| CORS était activé après les fichiers statiques. | CORS est activé avant de servir les images. | Les images et l’API utilisent maintenant la même configuration d’accès. |

## 2. Les choix techniques à défendre à l’oral

### Garder le contrat GraphQL

Le PDF frontend montre `lastupdate` en `String`, alors que le schéma détaillé du PDF backend impose `Int!`. Le projet utilise ce dernier contrat, commun aux opérations réellement implémentées.

Un entier GraphQL est limité à 32 bits signés : une date Unix en millisecondes, comme `1 800 000 000 000`, ne tient pas dans ce type. Changer le type risquerait de casser les clients du sujet. Le champ public `lastupdate` garde donc les secondes Unix ; le champ privé `lastupdateMs` du JSON conserve la précision nécessaire au serveur. Il n’est pas ajouté au schéma GraphQL.

Phrase utile : « Les durées sont en millisecondes. Pour la date, nous gardons un entier en secondes dans l’API et une date précise dans la sauvegarde, afin de respecter le contrat fourni. »

### Une mise à jour du serveur à chaque action

Le serveur ne crée pas un timer pour chaque joueur. À chaque query ou mutation, il lit la partie et calcule le temps écoulé depuis sa dernière mise à jour. Il rémunère les cycles terminés, applique ensuite l’action et sauvegarde.

L’ordre compte : les revenus d’avant un achat doivent utiliser l’ancienne quantité. Les revenus après l’achat utiliseront la nouvelle quantité. Le même raisonnement vaut pour les upgrades et les dépenses d’anges.

### Une seule définition du temps restant

Pour un manager, avec durée `D`, temps restant `R` et temps écoulé `E` :

```text
Si E < R :
    cycles terminés = 0
    nouveau reste = R − E
Sinon :
    temps supplémentaire = E − R
    cycles terminés = 1 + floor(temps supplémentaire / D)
    nouveau reste = D − (temps supplémentaire modulo D)
```

Exemple : durée 10 000 ms, reste 2 000 ms, absence 3 000 ms. Un cycle finit après 2 000 ms, puis 1 000 ms du cycle suivant s’écoulent. Résultat : un gain et 9 000 ms restantes.

Une production manuelle produit au maximum une fois pendant l’absence. Elle ne redémarre pas automatiquement.

### Des signaux pour les données, des valeurs calculées pour l’affichage

`world`, `user` et `purchaseMode` contiennent des données. Les prix, badges, gains et possibilités d’achat sont calculés avec `computed`. La notification Material réagit avec `effect`. Chaque `Produit` reçoit des `input.required`.

`linkedSignal` donne un signal modifiable dérivé du résultat GraphQL : le serveur peut fournir un nouveau monde, et le navigateur peut ensuite animer ce monde entre les requêtes.

Le cache Apollo est désactivé pour ces opérations (`no-cache`). Les petites réponses de mutation, qui ne contiennent que l’identifiant ou le nom, ne doivent pas remplacer le monde simulé ni fusionner des données de parties différentes. Les rechargements automatiques d’Apollo sont aussi désactivés ; la synchronisation est explicite.

La requête est créée avec `lazy: true` puis exécutée par le chargement du joueur. Ce petit écart par rapport à l’exemple automatique du PDF permet de valider ensemble l’identité et sa partie après une réponse réussie.

### Un timer de 100 ms

Le timer existant est conservé. Il mesure la durée réellement passée avec `performance.now()`, au lieu de supposer que chaque passage est arrivé exactement après 100 ms. `requestAnimationFrame` est recommandé dans le sujet pour fluidifier la barre ; ce n’est pas nécessaire pour corriger le calcul métier.

Le nettoyage du timer à la destruction du composant est conservé. Les revenus ne dépendent pas du texte affiché ni du pourcentage CSS.

### Des dépendances compatibles

Apollo Orbit fournit les APIs `apollo.signal` illustrées dans la consigne. Le frontend ajoute `@apollo-orbit/angular` et `@apollo/client`. GraphQL côté client passe de la version 17 à la version 16 compatible avec Apollo Client ; le backend utilisait déjà GraphQL 16. Les fichiers de verrouillage des dépendances sont mis à jour.

Les bibliothèques Angular existantes restent en place. Le schéma et les documents générés ne sont pas réécrits à la main.

## 3. Anciennes sauvegardes : ce qui est conservé

Les fichiers de vos joueurs ne sont pas réinitialisés ni remplacés pendant l’application des corrections. Une copie de sécurité est créée avant les changements.

À la première ouverture d’une ancienne partie, `migrateWorld` :

1. retrouve les durées de base des produits par identifiant ;
2. applique les bonus de vitesse déjà acquis ;
3. conserve la quantité, l’argent, le score, les anges, les managers et les achats ;
4. conserve la fraction restante d’un cycle manuel valide ;
5. reprend un produit automatisé au début d’un cycle ;
6. inscrit la version 2 et un nouvel horodatage précis.

Les gains hors connexion antérieurs à cette première conversion ne sont pas reconstitués. L’ancienne version mélangeait unités et interprétations du temps ; les recalculer donnerait une fausse précision et pourrait accorder des gains injustifiés. Après la conversion, les gains hors connexion sont calculés normalement en millisecondes.

Les managers acquis gratuitement dans l’ancienne version ne sont pas facturés rétroactivement. Le code ne dispose pas d’un historique assez précis pour réparer les anciens soldes. Pour une démonstration de conformité, utiliser une nouvelle partie et montrer les achats corrigés.

## 4. Un projet de binôme compréhensible

Le thème, les six produits, les managers et les images restent les vôtres. Le grand slogan d’accueil a été remplacé par « Nos ateliers tunisiens » et son espace réduit pour donner la priorité au jeu.

Le module de télémétrie Observe fourni par le starter NestJS est retiré : aucune fonction du sujet ne l’utilisait. La séparation simple entre resolver, service et monde initial est conservée. Les commentaires ajoutés expliquent les points délicats — dates, migration et progression — plutôt que de commenter chaque ligne.

La qualité du code n’indique pas à elle seule son auteur. Ce qui rendra votre travail personnel et crédible est votre capacité à expliquer ces choix, à calculer les exemples et à modifier une règle en sachant où intervenir. Les fichiers générés par GraphQL sont une partie normale de l’outillage.

## 5. Vérifications et limites pratiques

| Vérification | Résultat |
|---|---|
| Tests frontend | 23 réussis : achats, production, managers, bonus, anges, changement de joueur, doublons, erreurs réseau, reset et identifiants d’un autre monde. |
| Tests backend | 24 réussis : calcul temporel, gains, paiement, validations, bonus, reset et sauvegardes, plus test du starter. |
| API réelle | 7 scénarios réussis : nouveau monde, manager, cycle de 500 ms, reset, bonus d’ange, image/CORS et métadonnées de sauvegarde. |
| Interface | Nouvelle partie, cycle manuel, engagement de Hassen, affichage automatique, fenêtres et synchronisation vérifiés. Aucune erreur console observée. |
| Compilations | Frontend et backend réussis. |
| Codegen | Génération des opérations frontend réussie à partir du schéma conservé. |

Le frontend émet un avertissement de taille : le bundle initial avec Apollo représente environ 626 ko bruts, soit environ 156 ko transférés, au-dessus du seuil d’avertissement de 500 ko du starter. La compilation réussit. Cet avertissement est conservé ; il ne modifie aucune règle de jeu.

Un petit écart dû aux instants de réception et d’animation peut apparaître entre le navigateur et le serveur. Une synchronisation recharge la sauvegarde calculée par le serveur. Tester les autres groupes reste la dernière vérification pratique pour déclarer l’interopérabilité démontrée.

## 6. Où relire et quoi expliquer

| À comprendre | Fichier principal |
|---|---|
| Calculer les productions et les anges, charger/sauvegarder | `Backend/typescript-starter/src/app.service.ts` |
| Valider et payer les actions GraphQL | `Backend/typescript-starter/src/resolver.ts` |
| Choisir les valeurs et bonus du monde | `Backend/typescript-starter/src/origworld.ts` |
| État du navigateur, achats, bonus, erreurs et joueur | `Frontend/src/app/services/game.service.ts` |
| Prix géométriques et achat MAX | `Frontend/src/app/services/economy.ts` |
| Affichage et animation d’un produit | `Frontend/src/app/produit/produit.ts` |
| Configuration Apollo | `Frontend/src/app/app.config.ts` |
| Entrée joueur avec formulaire signal | `Frontend/src/app/app.html` |

Lire ensuite le guide technique actualisé et la préparation de soutenance. Les exemples doivent pouvoir être calculés à la main avant de les montrer dans le code.

Pour essayer un autre serveur, modifier une seule adresse dans `Frontend/src/app/graphql/backend-url.ts`. Apollo et les images utilisent cette même valeur.

Vérification finale dans le dossier original : les 47 tests, les deux compilations et Codegen ont réussi. La conversion des 12 sauvegardes existantes a été vérifiée en mémoire, sans écrire dans ces fichiers. L’archive `sauvegarde-avant-corrections.zip` conserve les fichiers modifiés dans leur version précédente et les sauvegardes joueurs.
