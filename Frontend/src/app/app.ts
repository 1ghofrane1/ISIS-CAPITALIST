import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import type { ModalName } from './models/game.models';
import { BigValuePipe } from './pipes/big-value.pipe';
import { Produit } from './produit/produit';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-root',
  imports: [Produit, BigValuePipe, MatBadge, MatSnackBarModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly game = inject(GameService);
  readonly activeModal = signal<ModalName | null>(null);

  readonly lockedManagers = computed(
    () => this.game.world()?.managers.filter((manager) => !manager.unlocked) ?? [],
  );
  readonly lockedCashUpgrades = computed(
    () => this.game.world()?.upgrades.filter((upgrade) => !upgrade.unlocked) ?? [],
  );
  readonly lockedAngelUpgrades = computed(
    () => this.game.world()?.angelupgrades.filter((upgrade) => !upgrade.unlocked) ?? [],
  );
  readonly lockedUnlocks = computed(() => {
    const world = this.game.world();
    if (!world) {
      return [];
    }
    return [
      ...world.products.flatMap((product) =>
        product.paliers
          .filter((palier) => !palier.unlocked)
          .map((palier) => ({ ...palier, targetName: product.name })),
      ),
      ...world.allunlocks
        .filter((palier) => !palier.unlocked)
        .map((palier) => ({ ...palier, targetName: 'Tous les produits' })),
    ].sort((first, second) => first.seuil - second.seuil);
  });

  private readonly snackBar = inject(MatSnackBar);
  private readonly snackEffect = effect(() => {
    const message = this.game.snackMessage();
    if (!message) {
      return;
    }
    this.snackBar.open(message.text, 'OK', {
      duration: message.kind === 'error' ? 4500 : 2600,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: [`snack-${message.kind}`],
    });
  });

  openModal(modal: ModalName): void {
    this.activeModal.set(modal);
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }
}
