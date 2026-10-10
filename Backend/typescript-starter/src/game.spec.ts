import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { AppService, type SavedWorld } from './app.service.js';
import { GraphQlResolver } from './resolver.js';
import { origworld } from './origworld.js';
import { RatioType, type Palier } from './graphql.js';

const now = 1_800_000_000_000;
const createWorld = (): SavedWorld => ({
  ...structuredClone(origworld),
  saveVersion: 2,
  lastupdateMs: now,
  lastupdate: now / 1000,
});
const bonus = (type: RatioType, target = 1, ratio = 2): Palier => ({
  name: 'Bonus de test',
  logo: '',
  seuil: 0,
  unlocked: false,
  typeratio: type,
  idcible: target,
  ratio,
});

describe('Règles du jeu côté serveur', () => {
  let service: AppService;
  let world: SavedWorld;
  let resolver: GraphQlResolver;
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    service = new AppService();
    world = createWorld();
    vi.spyOn(service, 'readUserWorld').mockImplementation(() => world);
    vi.spyOn(service, 'saveWorld').mockImplementation((_user, saved) => {
      world = saved;
    });
    resolver = new GraphQlResolver(service);
  });
  afterEach(() => vi.restoreAllMocks());

  it('ne crée aucun gain ni production dans un nouveau monde', () => {
    service.updateWorld(world);
    expect(world.score).toBe(0);
    expect(world.products.every((product) => product.timeleft === 0)).toBe(
      true,
    );
  });
  it('termine un cycle manuel de 500 ms une seule fois', () => {
    const product = world.products[0];
    product.vitesse = 500;
    product.timeleft = 500;
    vi.mocked(Date.now).mockReturnValue(now + 1800);
    service.updateWorld(world);
    expect(world.score).toBe(1);
    expect(product.timeleft).toBe(0);
  });
  it('compte les cycles automatiques à partir du temps restant', () => {
    const product = world.products[0];
    product.vitesse = 10_000;
    product.timeleft = 2000;
    product.managerUnlocked = true;
    vi.mocked(Date.now).mockReturnValue(now + 3000);
    service.updateWorld(world);
    expect(world.score).toBe(1);
    expect(product.timeleft).toBe(9000);
  });
  it('n’accorde pas de gain avant la fin du cycle automatique', () => {
    Object.assign(world.products[0], {
      vitesse: 10_000,
      timeleft: 8000,
      managerUnlocked: true,
    });
    vi.mocked(Date.now).mockReturnValue(now + 3000);
    service.updateWorld(world);
    expect(world.score).toBe(0);
    expect(world.products[0].timeleft).toBe(5000);
  });
  it('comptabilise plusieurs cycles et conserve une durée pleine à la frontière', () => {
    Object.assign(world.products[0], {
      vitesse: 500,
      timeleft: 500,
      managerUnlocked: true,
    });
    vi.mocked(Date.now).mockReturnValue(now + 1500);
    service.updateWorld(world);
    expect(world.score).toBe(3);
    expect(world.products[0].timeleft).toBe(500);
  });
  it('ne perd pas les fractions de seconde entre deux actions', () => {
    Object.assign(world.products[0], {
      vitesse: 500,
      timeleft: 500,
      managerUnlocked: true,
    });
    for (let step = 1; step <= 5; step++) {
      vi.mocked(Date.now).mockReturnValue(now + step * 100);
      service.updateWorld(world);
    }
    expect(world.score).toBe(1);
    expect(world.lastupdateMs).toBe(now + 500);
  });
  it('inclut la quantité, le revenu et les anges dans les gains', () => {
    Object.assign(world.products[0], {
      quantite: 3,
      revenu: 5,
      timeleft: 1000,
    });
    world.activeangels = 10;
    vi.mocked(Date.now).mockReturnValue(now + 1000);
    service.updateWorld(world);
    expect(world.score).toBeCloseTo(18);
  });
  it('déduit le prix du manager et refuse son deuxième achat', () => {
    resolver.engagerManager('test', 'Hassen');
    expect(world.money).toBe(90);
    expect(world.products[0].timeleft).toBe(1000);
    expect(() => resolver.engagerManager('test', 'Hassen')).toThrow(
      'déjà engagé',
    );
    expect(world.money).toBe(90);
  });
  it('refuse un manager sans fonds', () => {
    world.money = 0;
    expect(() => resolver.engagerManager('test', 'Hassen')).toThrow(
      'insuffisant',
    );
    expect(world.managers[0].unlocked).toBe(false);
  });
  it('conserve le cycle manuel en cours lors de l’engagement', () => {
    world.products[0].timeleft = 200;
    resolver.engagerManager('test', 'Hassen');
    expect(world.products[0].timeleft).toBe(200);
  });
  it('refuse les productions sans produit, déjà actives ou automatisées', () => {
    expect(() => resolver.lancerProductionProduit('test', 2)).toThrow();
    resolver.lancerProductionProduit('test', 1);
    expect(() => resolver.lancerProductionProduit('test', 1)).toThrow();
    world.products[0].timeleft = 0;
    world.products[0].managerUnlocked = true;
    expect(() => resolver.lancerProductionProduit('test', 1)).toThrow();
  });
  it('utilise le coût géométrique et valide la quantité', () => {
    resolver.acheterQtProduit('test', 1, 10);
    expect(world.money).toBeCloseTo(100 - (4 * (1.07 ** 10 - 1)) / 0.07);
    expect(world.products[0].quantite).toBe(11);
    expect(world.products[0].cout).toBeCloseTo(4 * 1.07 ** 10);
    expect(() => resolver.acheterQtProduit('test', 1, 0)).toThrow();
    expect(() => resolver.acheterQtProduit('test', 1, 100)).toThrow();
  });
  it('compte les gains avant d’ajouter les produits achetés', () => {
    world.products[0].timeleft = 1000;
    vi.mocked(Date.now).mockReturnValue(now + 1000);
    resolver.acheterQtProduit('test', 1, 1);
    expect(world.score).toBe(1);
    expect(world.products[0].quantite).toBe(2);
  });
  it('accepte un achat quand le solde égale exactement le coût calculé côté client', () => {
    world.money = 4 * ((1.07 ** 10 - 1) / (1.07 - 1));
    resolver.acheterQtProduit('test', 1, 10);
    expect(world.money).toBe(0);
    expect(world.products[0].quantite).toBe(11);
  });
  it('accélère une production en conservant son avancement', () => {
    Object.assign(world.products[0], { vitesse: 1000, timeleft: 800 });
    service.applyUpgrade(world, bonus(RatioType.vitesse));
    expect(world.products[0].vitesse).toBe(500);
    expect(world.products[0].timeleft).toBe(400);
  });
  it('ajoute le bonus d’ange une seule fois pour un unlock général', () => {
    world.allunlocks = [bonus(RatioType.ange, 0)];
    world.allunlocks[0].seuil = 1;
    world.products.forEach((product) => {
      product.quantite = 1;
    });
    service.checkUnlocks(world, world.products[0]);
    service.checkUnlocks(world, world.products[0]);
    expect(world.angelbonus).toBe(4);
  });
  it('applique un palier vitesse une seule fois', () => {
    world.products[0].quantite = 20;
    service.checkUnlocks(world, world.products[0]);
    service.checkUnlocks(world, world.products[0]);
    expect(world.products[0].vitesse).toBe(500);
  });
  it('paie les upgrades et bloque un deuxième achat', () => {
    world.money = 1000;
    resolver.acheterCashUpgrade('test', 'Fil de qualite');
    expect(world.money).toBe(0);
    expect(world.products[0].revenu).toBe(3);
    expect(() =>
      resolver.acheterCashUpgrade('test', 'Fil de qualite'),
    ).toThrow();
    world.activeangels = 10;
    resolver.acheterAngelUpgrade('test', 'Ange des medinas');
    expect(world.activeangels).toBe(0);
    expect(world.products[0].revenu).toBe(9);
    expect(() =>
      resolver.acheterAngelUpgrade('test', 'Ange des medinas'),
    ).toThrow();
  });
  it('calcule les anges avec 10^15 et conserve score et anges après reset', () => {
    world.score = 1_000_000;
    expect(service.resetWorld(world).totalangels).toBe(0);
    world.score = 1_000_000_000_000_000;
    world.totalangels = 20;
    world.activeangels = 5;
    const reset = service.resetWorld(world);
    expect(reset.totalangels).toBe(150);
    expect(reset.activeangels).toBe(135);
    expect(reset.score).toBe(world.score);
    expect(reset.money).toBe(100);
    expect(reset.products[0].timeleft).toBe(0);
  });
});

describe('Sauvegardes', () => {
  let directory: string;
  let service: AppService;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(tmpdir(), 'capitalist-test-'));
    vi.spyOn(process, 'cwd').mockReturnValue(directory);
    service = new AppService();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (!path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep)) {
      throw new Error('Le dossier de test sort du répertoire temporaire');
    }
    fs.rmSync(directory, { recursive: true });
  });
  it('relit sans réinitialiser une partie valide avec zéro argent', () => {
    const world = createWorld();
    world.money = 0;
    world.products[0].quantite = 12;
    service.saveWorld('test', world);
    expect(service.readUserWorld('test').products[0].quantite).toBe(12);
  });
  it('convertit une ancienne partie une seule fois sans effacer ses achats', () => {
    const world = createWorld();
    delete world.saveVersion;
    delete world.lastupdateMs;
    Object.assign(world.products[0], {
      vitesse: 1,
      timeleft: 0,
      quantite: 20,
      managerUnlocked: true,
    });
    world.products[0].paliers[0].unlocked = true;
    world.money = 876;
    service.saveWorld('test', world);
    const migrated = service.readUserWorld('test');
    expect(migrated.money).toBe(876);
    expect(migrated.products[0].vitesse).toBe(500);
    expect(migrated.products[0].timeleft).toBe(500);
    service.saveWorld('test', migrated);
    expect(service.readUserWorld('test')).toEqual(migrated);
  });
  it('signale un JSON illisible sans le remplacer', () => {
    service.saveWorld('test', createWorld());
    const filename = path.join(directory, 'userworlds', 'test-world.json');
    fs.writeFileSync(filename, '{broken');
    expect(() => service.readUserWorld('test')).toThrow();
    expect(fs.readFileSync(filename, 'utf8')).toBe('{broken');
  });
  it('refuse un identifiant contenant un chemin', () => {
    expect(() => service.readUserWorld('../test')).toThrow('invalide');
  });
});
