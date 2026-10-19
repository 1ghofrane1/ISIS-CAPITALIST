import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { World } from './models/game.models';
import { vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [appConfig.providers, provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    TestBed.inject(HttpTestingController)
      .match('http://localhost:3000/graphql')
      .forEach((request) => request.flush({ data: { getWorld: null } }));
  });

  it('should render the game identity', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .match('http://localhost:3000/graphql')
      .forEach((request) => request.flush({ data: { getWorld: null } }));
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('ISIS Capitalist');
    expect(compiled.querySelector('.brand')?.textContent).toContain('Saveurs de Tunisie');
  });

  it('vérifie les anges en arrière-plan et accélère quand leur fenêtre est ouverte', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .match('http://localhost:3000/graphql')
      .forEach((request) => request.flush({ data: { getWorld: null } }));
    await fixture.whenStable();
    const refresh = vi
      .spyOn(fixture.componentInstance.game, 'refreshClaimableAngels')
      .mockResolvedValue();
    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(5000);
      expect(refresh).not.toHaveBeenCalled();
      fixture.componentInstance.game.world.set({
        name: 'Monde de test',
        logo: '',
        money: 100,
        score: 0,
        totalangels: 0,
        activeangels: 0,
        angelbonus: 2,
        lastupdate: 0,
        products: [],
        managers: [],
        upgrades: [],
        angelupgrades: [],
        allunlocks: [],
      } satisfies World);
      TestBed.tick();
      expect(refresh).toHaveBeenCalledTimes(1);
      fixture.componentInstance.game.world.update((world) => ({ ...world!, score: 100 }));
      TestBed.tick();
      expect(refresh).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(5000);
      expect(refresh).toHaveBeenCalledTimes(2);
      fixture.componentInstance.openModal('investors');
      TestBed.tick();
      expect(refresh).toHaveBeenCalledTimes(3);
      vi.advanceTimersByTime(1000);
      expect(refresh).toHaveBeenCalledTimes(4);
      fixture.componentInstance.closeModal();
      TestBed.tick();
      expect(refresh).toHaveBeenCalledTimes(5);
      vi.advanceTimersByTime(1000);
      expect(refresh).toHaveBeenCalledTimes(5);
      vi.advanceTimersByTime(4000);
      expect(refresh).toHaveBeenCalledTimes(6);
      fixture.componentInstance.game.user.set('Autre joueur');
      TestBed.tick();
      expect(refresh).toHaveBeenCalledTimes(7);
      fixture.destroy();
      vi.advanceTimersByTime(5000);
      expect(refresh).toHaveBeenCalledTimes(7);
    } finally {
      vi.useRealTimers();
    }
  });
});
