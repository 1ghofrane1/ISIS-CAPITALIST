import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

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
});
