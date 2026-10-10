import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { Apollo } from '@apollo-orbit/angular';
import {
  AcheterAngelUpgradeDocument,
  AcheterCashUpgradeDocument,
  AcheterQtProduitDocument,
  EngagerManagerDocument,
  GetWorldDocument,
  LancerProductionProduitDocument,
  ResetWorldDocument,
} from '../graphql/operations';
import type {
  Palier,
  Product,
  PurchaseMode,
  SnackKind,
  SnackMessage,
  World,
} from '../models/game.models';
import { maxAffordable, purchaseCost } from './economy';
import { BACKEND_URL } from '../graphql/backend-url';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly apollo = inject(Apollo);
  private snackSequence = 0;
  private readonly pendingActions = signal<ReadonlySet<string>>(new Set());

  readonly server = signal(BACKEND_URL);
  readonly user = signal('');
  readonly loginModel = signal({ username: '' });
  readonly loginForm = form(this.loginModel);
  readonly worldQuery = this.apollo.signal.query({
    query: GetWorldDocument,
    lazy: true,
    fetchPolicy: 'no-cache',
    refetchOn: false,
  });
  // Le serveur fournit le monde ; le signal reste modifiable pour l'animation locale.
  readonly world = linkedSignal<World | undefined, World | null>({
    source: () => this.worldQuery.data()?.getWorld ?? undefined,
    computation: (world, previous) =>
      world ? this.normaliseWorld(world) : (previous?.value ?? null),
  });
  readonly acheterProduitsMutation = this.apollo.signal.mutation(AcheterQtProduitDocument, {
    fetchPolicy: 'no-cache',
  });
  readonly productionMutation = this.apollo.signal.mutation(LancerProductionProduitDocument, {
    fetchPolicy: 'no-cache',
  });
  readonly managerMutation = this.apollo.signal.mutation(EngagerManagerDocument, {
    fetchPolicy: 'no-cache',
  });
  readonly cashMutation = this.apollo.signal.mutation(AcheterCashUpgradeDocument, {
    fetchPolicy: 'no-cache',
  });
  readonly angelMutation = this.apollo.signal.mutation(AcheterAngelUpgradeDocument, {
    fetchPolicy: 'no-cache',
  });
  readonly resetMutation = this.apollo.signal.mutation(ResetWorldDocument, {
    fetchPolicy: 'no-cache',
  });
  readonly loading = signal(false);
  readonly busy = computed(() => this.loading() || this.pendingActions().size > 0);
  readonly connectionError = signal('');
  readonly snackMessage = signal<SnackMessage | null>(null);
  readonly purchaseMode = signal<PurchaseMode>(1);

  readonly managerBadge = computed(
    () =>
      this.world()?.managers.filter(
        (manager) => !manager.unlocked && (this.world()?.money ?? 0) >= manager.seuil,
      ).length ?? 0,
  );

  readonly cashUpgradeBadge = computed(
    () =>
      this.world()?.upgrades.filter(
        (upgrade) => !upgrade.unlocked && (this.world()?.money ?? 0) >= upgrade.seuil,
      ).length ?? 0,
  );

  readonly angelUpgradeBadge = computed(
    () =>
      this.world()?.angelupgrades.filter(
        (upgrade) => !upgrade.unlocked && (this.world()?.activeangels ?? 0) >= upgrade.seuil,
      ).length ?? 0,
  );

  readonly claimableAngels = computed(() => {
    const world = this.world();
    if (!world) {
      return 0;
    }
    return Math.max(
      0,
      Math.floor(150 * Math.sqrt(world.score / 1_000_000)) - world.totalangels, //au lieu de 1_000_000_000_000_000 pour demo
    );
  });

  constructor() {
    const storedName = localStorage.getItem('username')?.trim();
    const initialName = storedName || `Captain${Math.floor(Math.random() * 10_000)}`;
    this.setLoginName(initialName);
    this.user.set(initialName);
    localStorage.setItem('username', initialName);
    void this.refreshWorld(false);
  }

  setLoginName(value: string): void {
    this.loginModel.set({ username: value });
  }

  async commitName(): Promise<void> {
    if (this.busy()) return;
    const name = this.loginModel().username.trim();
    if (!name) {
      this.notify('Saisissez un identifiant de joueur.', 'error');
      return;
    }
    await this.loadWorld(name, true);
  }

  async refreshWorld(showConfirmation = true): Promise<void> {
    if (this.busy()) return;
    await this.loadWorld(this.user(), showConfirmation);
  }

  private async loadWorld(name: string, showConfirmation: boolean): Promise<boolean> {
    this.loading.set(true);
    this.connectionError.set('');
    try {
      const result = this.worldQuery.active()
        ? await this.worldQuery.refetch({ user: name })
        : await this.worldQuery.execute({ variables: { user: name } });
      if (!result.data?.getWorld) throw new Error('Le serveur ne renvoie aucun monde.');
      this.world.set(this.normaliseWorld(result.data.getWorld));
      // Valider l'identité seulement quand sa partie a bien été chargée.
      this.user.set(name);
      localStorage.setItem('username', name);
      if (showConfirmation) this.notify(`Partie de ${name} synchronisée.`, 'success');
      return true;
    } catch (error) {
      const message = this.errorMessage(error);
      this.connectionError.set(message);
      this.notify(`Connexion au serveur impossible : ${message}`, 'error');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  cyclePurchaseMode(): void {
    const modes: PurchaseMode[] = [1, 10, 100, 'max'];
    const nextIndex = (modes.indexOf(this.purchaseMode()) + 1) % modes.length;
    this.purchaseMode.set(modes[nextIndex]);
  }

  purchaseModeLabel(): string {
    return this.purchaseMode() === 'max' ? 'MAX' : `x${this.purchaseMode()}`;
  }

  quantityToBuy(product: Product, mode: PurchaseMode = this.purchaseMode()): number {
    return mode === 'max' ? maxAffordable(product, this.world()?.money ?? 0) : mode;
  }

  costToBuy(product: Product, quantity = this.quantityToBuy(product)): number {
    return purchaseCost(product, quantity);
  }

  canBuy(product: Product, quantity = this.quantityToBuy(product)): boolean {
    const money = this.world()?.money ?? 0;
    return !this.busy() && quantity > 0 && purchaseCost(product, quantity) <= money;
  }

  buyProduct(productId: number): void {
    if (this.busy()) return;
    const world = this.world();
    const product = world?.products.find((item) => item.id === productId);
    if (!world || !product) {
      return;
    }

    const quantity = this.quantityToBuy(product);
    const cost = purchaseCost(product, quantity);
    if (quantity <= 0 || cost > world.money) {
      this.notify("Vous n'avez pas assez de dinars pour cet achat.", 'error');
      return;
    }

    const nextWorld = structuredClone(world);
    const nextProduct = nextWorld.products.find((item) => item.id === productId);
    if (!nextProduct) {
      return;
    }
    nextWorld.money -= cost;
    nextProduct.quantite += quantity;
    nextProduct.cout *= Math.pow(nextProduct.croissance, quantity);
    const unlocks = this.checkUnlocks(nextWorld, nextProduct);
    this.world.set(nextWorld);

    if (unlocks.length > 0) {
      this.notify(`Nouveau bonus : ${unlocks.join(', ')}.`, 'success');
    }

    void this.sendMutation(
      `product:${productId}`,
      () =>
        this.acheterProduitsMutation.mutate({
          variables: { user: this.user(), id: productId, quantite: quantity },
        }),
      "l'achat du produit",
      world,
    );
  }

  startProduction(productId: number): void {
    if (this.busy()) return;
    const world = this.world();
    const product = world?.products.find((item) => item.id === productId);
    if (
      !world ||
      !product ||
      product.managerUnlocked ||
      product.quantite <= 0 ||
      product.timeleft > 0
    ) {
      return;
    }

    this.world.update((current) =>
      this.updateProduct(current, productId, (item) => ({
        ...item,
        timeleft: Math.max(1, item.vitesse),
      })),
    );

    void this.sendMutation(
      `production:${productId}`,
      () =>
        this.productionMutation.mutate({
          variables: { user: this.user(), id: productId },
        }),
      'du lancement de la production',
      world,
    );
  }

  tickProduct(productId: number, elapsedMilliseconds: number): void {
    if (this.loading() || !Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds <= 0) {
      return;
    }

    this.world.update((current) => {
      if (!current) {
        return current;
      }
      const index = current.products.findIndex((item) => item.id === productId);
      if (index < 0) {
        return current;
      }

      const product = current.products[index];
      if (product.quantite <= 0) return current;
      const duration = Math.max(1, product.vitesse);
      let remaining = product.timeleft;
      let completed = 0;

      if (product.managerUnlocked) {
        remaining = remaining > 0 ? remaining : duration;
        if (elapsedMilliseconds >= remaining) {
          const extraTime = elapsedMilliseconds - remaining;
          completed = 1 + Math.floor(extraTime / duration);
          const remainder = extraTime % duration;
          remaining = remainder === 0 ? duration : duration - remainder;
        } else {
          remaining -= elapsedMilliseconds;
        }
      } else if (remaining > 0) {
        if (elapsedMilliseconds >= remaining) {
          completed = 1;
          remaining = 0;
        } else {
          remaining -= elapsedMilliseconds;
        }
      } else {
        return current;
      }

      const updatedProduct = { ...product, timeleft: Math.max(0, remaining) };
      const products = [...current.products];
      products[index] = updatedProduct;

      if (completed === 0) {
        return { ...current, products };
      }

      const gain =
        completed *
        product.quantite *
        product.revenu *
        (1 + (current.activeangels * current.angelbonus) / 100);
      return {
        ...current,
        products,
        money: current.money + gain,
        score: current.score + gain,
      };
    });
  }

  hireManager(manager: Palier): void {
    if (this.busy()) return;
    const world = this.world();
    if (!world || manager.unlocked || world.money < manager.seuil) {
      this.notify("Ce manager n'est pas encore accessible.", 'error');
      return;
    }

    const nextWorld = structuredClone(world);
    const nextManager = nextWorld.managers.find((item) => item.name === manager.name);
    const product = nextWorld.products.find((item) => item.id === manager.idcible);
    if (!nextManager || !product || nextManager.unlocked || product.managerUnlocked) {
      return;
    }
    nextWorld.money -= manager.seuil;
    nextManager.unlocked = true;
    product.managerUnlocked = true;
    product.timeleft =
      product.quantite > 0 ? (product.timeleft > 0 ? product.timeleft : product.vitesse) : 0;
    this.world.set(nextWorld);
    this.notify(`${manager.name} automatise maintenant ${product.name}.`, 'success');

    void this.sendMutation(
      `manager:${manager.name}`,
      () =>
        this.managerMutation.mutate({
          variables: { user: this.user(), name: manager.name },
        }),
      "l'engagement du manager",
      world,
    );
  }

  buyCashUpgrade(upgrade: Palier): void {
    if (this.busy()) return;
    const world = this.world();
    if (!world || upgrade.unlocked || world.money < upgrade.seuil) {
      this.notify("Vous n'avez pas assez de dinars pour cet upgrade.", 'error');
      return;
    }

    const nextWorld = structuredClone(world);
    const nextUpgrade = nextWorld.upgrades.find((item) => item.name === upgrade.name);
    if (!nextUpgrade || nextUpgrade.unlocked) {
      return;
    }
    nextWorld.money -= upgrade.seuil;
    nextUpgrade.unlocked = true;
    this.applyBonus(nextWorld, nextUpgrade);
    this.world.set(nextWorld);
    this.notify(`${upgrade.name} est actif.`, 'success');

    void this.sendMutation(
      `cash:${upgrade.name}`,
      () =>
        this.cashMutation.mutate({
          variables: { user: this.user(), name: upgrade.name },
        }),
      "l'achat du Cash Upgrade",
      world,
    );
  }

  buyAngelUpgrade(upgrade: Palier): void {
    if (this.busy()) return;
    const world = this.world();
    if (!world || upgrade.unlocked || world.activeangels < upgrade.seuil) {
      this.notify("Vous n'avez pas assez d'anges actifs pour cet upgrade.", 'error');
      return;
    }

    const nextWorld = structuredClone(world);
    const nextUpgrade = nextWorld.angelupgrades.find((item) => item.name === upgrade.name);
    if (!nextUpgrade || nextUpgrade.unlocked) {
      return;
    }
    nextWorld.activeangels -= upgrade.seuil;
    nextUpgrade.unlocked = true;
    this.applyBonus(nextWorld, nextUpgrade);
    this.world.set(nextWorld);
    this.notify(`${upgrade.name} illumine votre empire.`, 'success');

    void this.sendMutation(
      `angel:${upgrade.name}`,
      () =>
        this.angelMutation.mutate({
          variables: { user: this.user(), name: upgrade.name },
        }),
      "l'achat de l'Angel Upgrade",
      world,
    );
  }

  async resetWorld(): Promise<void> {
    if (this.claimableAngels() <= 0 || this.busy()) {
      return;
    }

    await this.withPending('reset', async () => {
      try {
        await this.resetMutation.mutate({ variables: { user: this.user() } });
        if (await this.loadWorld(this.user(), false)) {
          this.notify('Nouveau départ : vos anges sont maintenant actifs.', 'success');
        }
      } catch (error) {
        this.notify(`Reset impossible : ${this.errorMessage(error)}`, 'error');
      }
    });
  }

  assetUrl(path: string | null | undefined): string {
    if (!path) {
      return '';
    }
    const repairedPath = path
      .replaceAll('FricassÃ©e', 'Fricassée')
      .replaceAll('Ã©', 'é')
      .replaceAll('\\', '/');
    const encodedPath = repairedPath
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/');
    return `${this.server().replace(/\/$/, '')}/${encodedPath}`;
  }

  productName(id: number): string {
    if (id === 0) {
      return 'Tous les produits';
    }
    if (id === -1) {
      return 'Puissance des anges';
    }
    return this.world()?.products.find((product) => product.id === id)?.name ?? 'Produit';
  }

  bonusLabel(palier: Palier): string {
    switch (palier.typeratio) {
      case 'vitesse':
        return `Vitesse ×${palier.ratio}`;
      case 'ange':
        return `Bonus des anges +${palier.ratio}%`;
      default:
        return `Profits ×${palier.ratio}`;
    }
  }

  isPending(key: string): boolean {
    return this.pendingActions().has(key);
  }

  private checkUnlocks(world: World, product: Product): string[] {
    const unlocked: string[] = [];
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        palier.unlocked = true;
        this.applyBonus(world, palier);
        unlocked.push(palier.name);
      }
    }

    for (const palier of world.allunlocks) {
      if (!palier.unlocked && world.products.every((item) => item.quantite >= palier.seuil)) {
        palier.unlocked = true;
        this.applyBonus(world, palier);
        unlocked.push(palier.name);
      }
    }
    return unlocked;
  }

  private applyBonus(world: World, palier: Palier): void {
    if (palier.typeratio === 'ange') {
      world.angelbonus += palier.ratio;
      return;
    }

    const targets =
      palier.idcible === 0
        ? world.products
        : world.products.filter((product) => product.id === palier.idcible);

    for (const product of targets) {
      if (palier.typeratio === 'gain') {
        product.revenu *= palier.ratio;
      } else if (palier.typeratio === 'vitesse') {
        const previousDuration = Math.max(1, product.vitesse);
        const remainingRatio = product.timeleft > 0 ? product.timeleft / previousDuration : 0;
        product.vitesse = Math.max(1, Math.floor(product.vitesse / palier.ratio));
        if (product.timeleft > 0) {
          product.timeleft = Math.ceil(product.vitesse * remainingRatio);
        }
      }
    }
  }

  private updateProduct(
    world: World | null,
    productId: number,
    update: (product: Product) => Product,
  ): World | null {
    if (!world) {
      return world;
    }
    const products = world.products.map((product) =>
      product.id === productId ? update(product) : product,
    );
    return { ...world, products };
  }

  private normaliseWorld(world: World): World {
    const result = structuredClone(world);
    result.money = Number(result.money) || 0;
    result.score = Number(result.score) || 0;
    for (const product of result.products) {
      product.cout = Number(product.cout) || 0;
      product.croissance = Number(product.croissance) || 1;
      product.revenu = Number(product.revenu) || 0;
      product.vitesse = Math.max(1, Number(product.vitesse) || 1);
      const serverTimeLeft = Math.max(0, Number(product.timeleft) || 0);
      product.timeleft =
        !product.managerUnlocked && serverTimeLeft > product.vitesse ? 0 : serverTimeLeft;
    }
    return result;
  }

  private async sendMutation(
    key: string,
    action: () => Promise<unknown>,
    context: string,
    previousWorld: World,
  ): Promise<void> {
    await this.withPending(key, async () => {
      try {
        await action();
      } catch (error) {
        this.world.set(previousWorld);
        this.notify(`Erreur de transmission ${context} : ${this.errorMessage(error)}`, 'error');
        await this.loadWorld(this.user(), false);
      }
    });
  }

  private async withPending<T>(key: string, action: () => Promise<T>): Promise<T | undefined> {
    if (this.pendingActions().has(key)) {
      return undefined;
    }
    this.pendingActions.update((current) => new Set([...current, key]));
    try {
      return await action();
    } finally {
      this.pendingActions.update((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  private notify(text: string, kind: SnackKind): void {
    this.snackMessage.set({ id: ++this.snackSequence, text, kind });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'erreur inconnue';
  }
}
