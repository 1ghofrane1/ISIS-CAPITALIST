import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appConfig } from '../app.config';
import type { World } from '../models/game.models';
import { GameService } from './game.service';

const createWorld = (name = 'Monde de test'): World => ({
  name,
  logo: '',
  money: 100,
  score: 0,
  totalangels: 0,
  activeangels: 0,
  angelbonus: 2,
  lastupdate: 0,
  allunlocks: [],
  upgrades: [],
  angelupgrades: [],
  products: [
    {
      id: 1,
      name: 'Produit',
      logo: '',
      cout: 4,
      croissance: 1.07,
      revenu: 1,
      vitesse: 500,
      quantite: 1,
      timeleft: 0,
      managerUnlocked: false,
      paliers: [],
    },
  ],
  managers: [
    {
      name: 'Manager',
      logo: '',
      seuil: 10,
      idcible: 1,
      ratio: 0,
      typeratio: 'gain',
      unlocked: false,
    },
  ],
});
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('GameService', () => {
  let game: GameService;
  let http: HttpTestingController;
  const endpoint = 'http://localhost:3000/graphql';
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [appConfig.providers, provideHttpClientTesting()],
    });
    game = TestBed.inject(GameService);
    http = TestBed.inject(HttpTestingController);
    await settle();
    http.expectOne(endpoint).flush({ data: { getWorld: createWorld() } });
    await settle();
  });
  afterEach(() => http.verify());

  it('met à jour le prix, la quantité et la trésorerie pour x10', async () => {
    game.purchaseMode.set(10);
    game.buyProduct(1);
    expect(game.world()?.money).toBeCloseTo(100 - (4 * (1.07 ** 10 - 1)) / 0.07);
    expect(game.world()?.products[0].quantite).toBe(11);
    const request = http.expectOne(endpoint);
    expect(JSON.parse(request.request.body).variables.quantite).toBe(10);
    request.flush({ data: { acheterQtProduit: { id: 1 } } });
    await settle();
    expect(game.busy()).toBe(false);
  });
  it('termine une production de 500 ms après une demi-seconde', async () => {
    game.startProduction(1);
    http.expectOne(endpoint).flush({ data: { lancerProductionProduit: { id: 1 } } });
    await settle();
    game.tickProduct(1, 500);
    expect(game.world()?.score).toBe(1);
    expect(game.world()?.products[0].timeleft).toBe(0);
    game.tickProduct(1, 2000);
    expect(game.world()?.score).toBe(1);
  });
  it('calcule les cycles automatiques et leur temps restant', () => {
    const world = createWorld();
    Object.assign(world.products[0], {
      vitesse: 10_000,
      timeleft: 2000,
      managerUnlocked: true,
    });
    game.world.set(world);
    game.tickProduct(1, 3000);
    expect(game.world()?.score).toBe(1);
    expect(game.world()?.products[0].timeleft).toBe(9000);
    game.tickProduct(1, 29_000);
    expect(game.world()?.score).toBe(4);
    expect(game.world()?.products[0].timeleft).toBe(10_000);
  });
  it('applique le multiplicateur des anges dans une production', () => {
    const world = createWorld();
    world.activeangels = 10;
    Object.assign(world.products[0], { quantite: 3, revenu: 5, timeleft: 500 });
    game.world.set(world);
    game.tickProduct(1, 500);
    expect(game.world()?.score).toBeCloseTo(18);
  });
  it('paie le manager et démarre son premier cycle', async () => {
    game.hireManager(game.world()!.managers[0]);
    expect(game.world()?.money).toBe(90);
    expect(game.world()?.products[0].timeleft).toBe(500);
    http.expectOne(endpoint).flush({ data: { engagerManager: { name: 'Manager' } } });
    await settle();
  });
  it('ignore un double clic pendant la mutation', async () => {
    game.buyProduct(1);
    game.buyProduct(1);
    game.hireManager(game.world()!.managers[0]);
    expect(game.world()?.products[0].quantite).toBe(2);
    expect(game.world()?.money).toBe(96);
    const requests = http.match(endpoint);
    expect(requests.length).toBe(1);
    requests[0].flush({ data: { acheterQtProduit: { id: 1 } } });
    await settle();
  });
  it('refuse un changement de joueur pendant un achat', async () => {
    const previousUser = game.user();
    game.buyProduct(1);
    game.setLoginName('autre-joueur');
    await game.commitName();
    expect(game.user()).toBe(previousUser);
    http.expectOne(endpoint).flush({ data: { acheterQtProduit: { id: 1 } } });
    await settle();
  });
  it('valide l’identité seulement après le chargement de la nouvelle partie', async () => {
    const previousUser = game.user();
    game.setLoginName('nouveau-joueur');
    const pending = game.commitName();
    await settle();
    expect(game.user()).toBe(previousUser);
    expect(game.busy()).toBe(true);
    const request = http.expectOne(endpoint);
    expect(JSON.parse(request.request.body).variables.user).toBe('nouveau-joueur');
    request.flush({ data: { getWorld: createWorld('Nouveau monde') } });
    await pending;
    expect(game.user()).toBe('nouveau-joueur');
    expect(game.world()?.name).toBe('Nouveau monde');
    expect(localStorage.getItem('username')).toBe('nouveau-joueur');
  });
  it('conserve l’ancienne identité et son monde après un échec de chargement', async () => {
    const previousUser = game.user();
    game.setLoginName('joueur-inaccessible');
    const pending = game.commitName();
    await settle();
    http.expectOne(endpoint).flush({ errors: [{ message: 'Serveur indisponible' }] });
    await pending;
    expect(game.user()).toBe(previousUser);
    expect(game.world()?.name).toBe('Monde de test');
    expect(game.connectionError()).toContain('Serveur indisponible');
  });
  it('ignore une seconde demande pendant la synchronisation', async () => {
    game.setLoginName('joueur-A');
    const pending = game.commitName();
    await settle();
    game.setLoginName('joueur-B');
    await game.commitName();
    http.expectOne(endpoint).flush({ data: { getWorld: createWorld('Monde A') } });
    await pending;
    expect(game.user()).toBe('joueur-A');
    expect(game.world()?.name).toBe('Monde A');
  });
  it('rétablit le monde serveur si un achat optimiste est refusé', async () => {
    game.buyProduct(1);
    http.expectOne(endpoint).flush({ errors: [{ message: 'Fonds insuffisants' }] });
    await settle();
    http.expectOne(endpoint).flush({ data: { getWorld: createWorld() } });
    await settle();
    expect(game.world()?.money).toBe(100);
    expect(game.world()?.products[0].quantite).toBe(1);
    expect(game.busy()).toBe(false);
  });
  it('applique un bonus de vitesse une seule fois et conserve la progression', async () => {
    const world = createWorld();
    const product = world.products[0];
    product.timeleft = 400;
    product.paliers = [
      {
        name: 'Palier',
        logo: '',
        seuil: 2,
        idcible: 1,
        ratio: 2,
        typeratio: 'vitesse',
        unlocked: false,
      },
    ];
    game.world.set(world);
    game.buyProduct(1);
    expect(game.world()?.products[0].vitesse).toBe(250);
    expect(game.world()?.products[0].timeleft).toBe(200);
    http.expectOne(endpoint).flush({ data: { acheterQtProduit: { id: 1 } } });
    await settle();
    game.buyProduct(1);
    expect(game.world()?.products[0].vitesse).toBe(250);
    http.expectOne(endpoint).flush({ data: { acheterQtProduit: { id: 1 } } });
    await settle();
  });
  it('ajoute le bonus d’ange et dépense les anges actifs', async () => {
    const world = createWorld();
    world.activeangels = 10;
    world.angelbonus = 3;
    world.angelupgrades = [
      {
        name: 'Ange',
        logo: '',
        seuil: 10,
        idcible: -1,
        ratio: 2,
        typeratio: 'ange',
        unlocked: false,
      },
    ];
    game.world.set(world);
    game.buyAngelUpgrade(world.angelupgrades[0]);
    expect(game.world()?.activeangels).toBe(0);
    expect(game.world()?.angelbonus).toBe(5);
    http.expectOne(endpoint).flush({ data: { acheterAngelUpgrade: { name: 'Ange' } } });
    await settle();
  });
  it('emploie 10^15 pour le calcul des anges', () => {
    const world = createWorld();
    world.score = 1_000_000;
    game.world.set(world);
    expect(game.claimableAngels()).toBe(0);
    game.world.set({ ...world, score: 1_000_000_000_000_000, totalangels: 20 });
    expect(game.claimableAngels()).toBe(130);
  });
  it('annule l’achat local même si la resynchronisation échoue', async () => {
    game.buyProduct(1);
    http.expectOne(endpoint).flush({ errors: [{ message: 'Achat refusé' }] });
    await settle();
    http.expectOne(endpoint).flush({ errors: [{ message: 'Connexion perdue' }] });
    await settle();
    expect(game.world()?.money).toBe(100);
    expect(game.world()?.products[0].quantite).toBe(1);
    expect(game.connectionError()).toContain('Connexion perdue');
  });
  it('recharge le monde serveur après un reset', async () => {
    game.world.set({ ...createWorld(), score: 1e15 });
    const pending = game.resetWorld();
    http.expectOne(endpoint).flush({ data: { resetWorld: { name: 'Monde de test' } } });
    await settle();
    http.expectOne(endpoint).flush({
      data: {
        getWorld: {
          ...createWorld(),
          score: 1e15,
          totalangels: 150,
          activeangels: 150,
        },
      },
    });
    await pending;
    expect(game.world()?.activeangels).toBe(150);
    expect(game.claimableAngels()).toBe(0);
  });
  it('ne rachète pas un manager depuis une ancienne référence', async () => {
    const manager = game.world()!.managers[0];
    game.hireManager(manager);
    http.expectOne(endpoint).flush({ data: { engagerManager: { name: 'Manager' } } });
    await settle();
    game.hireManager(manager);
    expect(game.world()?.money).toBe(90);
    http.expectNone(endpoint);
  });
  it('retrouve un produit d’un autre monde par son identifiant', async () => {
    const world = createWorld('Autre monde');
    world.products[0].id = 47;
    game.world.set(world);
    game.startProduction(47);
    const request = http.expectOne(endpoint);
    expect(JSON.parse(request.request.body).variables.id).toBe(47);
    request.flush({ data: { lancerProductionProduit: { id: 47 } } });
    await settle();
    game.tickProduct(47, 500);
    expect(game.world()?.score).toBe(1);
  });
});
