import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { Product, PurchaseMode } from '../models/game.models';
import { BigValuePipe } from '../pipes/big-value.pipe';
import { DurationPipe } from '../pipes/duration.pipe';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-produit',
  imports: [BigValuePipe, DurationPipe, DecimalPipe],
  templateUrl: './produit.html',
  styleUrl: './produit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Produit implements OnInit, OnDestroy {
  readonly game = inject(GameService);
  readonly prod = input.required<Product>();
  readonly qtmulti = input.required<PurchaseMode>();

  readonly numberToBuy = computed(() => this.game.quantityToBuy(this.prod(), this.qtmulti()));
  readonly purchaseCost = computed(() => this.game.costToBuy(this.prod(), this.numberToBuy()));
  readonly canBuy = computed(() => this.game.canBuy(this.prod(), this.numberToBuy()));
  readonly progress = computed(() => {
    const product = this.prod();
    if (product.timeleft <= 0 || product.vitesse <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (1 - product.timeleft / product.vitesse) * 100));
  });
  readonly productionGain = computed(() => {
    const product = this.prod();
    const world = this.game.world();
    const angelMultiplier = world ? 1 + (world.activeangels * world.angelbonus) / 100 : 1;
    return product.quantite * product.revenu * angelMultiplier;
  });
  readonly isRunning = computed(() => this.prod().managerUnlocked || this.prod().timeleft > 0);

  private timerId: ReturnType<typeof setInterval> | undefined;
  private lastTick = performance.now();

  ngOnInit(): void {
    this.lastTick = performance.now();
    this.timerId = setInterval(() => {
      const now = performance.now();
      const elapsedSeconds = (now - this.lastTick) / 1000;
      this.lastTick = now;
      this.game.tickProduct(this.prod().id, elapsedSeconds);
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.timerId !== undefined) {
      clearInterval(this.timerId);
    }
  }

  startProduction(): void {
    this.game.startProduction(this.prod().id);
  }

  buy(): void {
    this.game.buyProduct(this.prod().id);
  }
}
