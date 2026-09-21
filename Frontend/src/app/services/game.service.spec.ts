import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { World } from '../models/game.models';
import { GameService } from './game.service';

describe('GameService', () => {
  let game: GameService;
  let http: HttpTestingController;

  const createWorld = (): World => ({
    name: 'Test World',
    logo: 'icones/test.png',
    money: 100,
    score: 0,
    totalangels: 0,
    activeangels: 0,
    angelbonus: 2,
    lastupdate: 0,
    products: [
      {
        id: 1,
        name: 'Produit',
        logo: 'icones/product.png',
        cout: 4,
        croissance: 1.07,
        revenu: 1,
        vitesse: 1,
        quantite: 1,
        timeleft: 0,
        managerUnlocked: false,
        paliers: [],
      },
    ],
    allunlocks: [],
    upgrades: [],
    angelupgrades: [],
    managers: [
      {
        name: 'Manager',
        logo: 'icones/manager.png',
        seuil: 10,
        idcible: 1,
        ratio: 0,
        typeratio: 'gain',
        unlocked: false,
      },
    ],
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    game = TestBed.inject(GameService);
    http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/graphql').flush({ data: { getWorld: createWorld() } });
  });

  afterEach(() => http.verify());

  it('updates money, quantity and next cost when buying', () => {
    game.buyProduct(1);

    expect(game.world()?.money).toBeCloseTo(96);
    expect(game.world()?.products[0].quantite).toBe(2);
    expect(game.world()?.products[0].cout).toBeCloseTo(4.28);

    http.expectOne('http://localhost:3000/graphql').flush({
      data: { acheterQtProduit: { id: 1 } },
    });
  });

  it('starts and completes a manual production cycle', () => {
    game.startProduction(1);
    http.expectOne('http://localhost:3000/graphql').flush({
      data: { lancerProductionProduit: { id: 1 } },
    });

    game.tickProduct(1, 1);
    expect(game.world()?.money).toBeCloseTo(101);
    expect(game.world()?.score).toBeCloseTo(1);
    expect(game.world()?.products[0].timeleft).toBe(0);
  });

  it('hires a manager and starts automatic production', () => {
    const manager = game.world()!.managers[0];
    game.hireManager(manager);

    expect(game.world()?.money).toBeCloseTo(90);
    expect(game.world()?.managers[0].unlocked).toBe(true);
    expect(game.world()?.products[0].managerUnlocked).toBe(true);

    http.expectOne('http://localhost:3000/graphql').flush({
      data: { engagerManager: { name: 'Manager' } },
    });
  });
});
