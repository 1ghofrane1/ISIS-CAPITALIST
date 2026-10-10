import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { origworld } from './origworld.js';
import { Palier, Product, World } from './graphql.js';

// Ces champs restent dans le JSON ; le contrat GraphQL reste inchangé.
export type SavedWorld = World & {
  saveVersion?: number;
  lastupdateMs?: number;
};

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  readUserWorld(user: string): SavedWorld {
    const filename = this.worldPath(user);
    if (!fs.existsSync(filename)) return this.newWorld();
    // Un fichier illisible doit être signalé, jamais remplacé par une partie vide.
    const world = JSON.parse(fs.readFileSync(filename, 'utf8')) as SavedWorld;
    if (world.saveVersion !== 2) this.migrateWorld(world);
    return world;
  }

  saveWorld(user: string, world: SavedWorld): void {
    const filename = this.worldPath(user);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(world, null, 2));
  }

  updateWorld(world: SavedWorld): SavedWorld {
    const now = Date.now();
    const previous =
      world.lastupdateMs ?? (world.lastupdate ? world.lastupdate * 1000 : now);
    const elapsed = Math.max(0, now - previous);
    for (const product of world.products) {
      if (product.quantite <= 0) {
        product.timeleft = 0;
        continue;
      }
      const duration = Math.max(1, product.vitesse);
      if (product.managerUnlocked) {
        const remaining = product.timeleft > 0 ? product.timeleft : duration;
        if (elapsed >= remaining) {
          const extra = elapsed - remaining;
          this.addProduction(world, product, 1 + Math.floor(extra / duration));
          product.timeleft = duration - (extra % duration);
        } else {
          product.timeleft = remaining - elapsed;
        }
      } else if (product.timeleft > 0) {
        if (elapsed >= product.timeleft) {
          this.addProduction(world, product, 1);
          product.timeleft = 0;
        } else {
          product.timeleft -= elapsed;
        }
      }
    }
    // GraphQL Int ne peut pas contenir Date.now(). Le JSON garde la précision ms.
    world.lastupdate = Math.floor(now / 1000);
    world.lastupdateMs = now;
    world.saveVersion = 2;
    return world;
  }

  resetWorld(world: World): SavedWorld {
    const earnedAngels = Math.max(
      0,
      Math.floor(150 * Math.sqrt(world.score / 1_000_000)) -
        world.totalangels,
    );
    const result = this.newWorld();
    result.score = world.score;
    result.totalangels = world.totalangels + earnedAngels;
    result.activeangels = world.activeangels + earnedAngels;
    return result;
  }

  checkUnlocks(world: World, product: Product): void {
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        palier.unlocked = true;
        this.applyUpgrade(world, palier);
      }
    }
    for (const palier of world.allunlocks) {
      if (
        !palier.unlocked &&
        world.products.every((item) => item.quantite >= palier.seuil)
      ) {
        palier.unlocked = true;
        this.applyUpgrade(world, palier);
      }
    }
  }

  applyUpgrade(world: World, palier: Palier): void {
    if (palier.typeratio === 'ange') {
      world.angelbonus += palier.ratio;
      return;
    }
    const targets =
      palier.idcible === 0
        ? world.products
        : world.products.filter((product) => product.id === palier.idcible);
    if (!targets.length || palier.ratio <= 0)
      throw new Error(`Bonus invalide : ${palier.name}`);
    for (const product of targets) {
      if (palier.typeratio === 'gain') {
        product.revenu *= palier.ratio;
      } else if (palier.typeratio === 'vitesse') {
        const previous = product.vitesse;
        product.vitesse = Math.max(1, Math.floor(previous / palier.ratio));
        // Conserver la progression déjà accomplie quand le cycle accélère.
        product.timeleft = Math.ceil(
          (product.timeleft * product.vitesse) / previous,
        );
      }
    }
  }

  private addProduction(world: World, product: Product, count: number): void {
    const gain =
      count *
      product.quantite *
      product.revenu *
      (1 + (world.activeangels * world.angelbonus) / 100);
    world.money += gain;
    world.score += gain;
  }

  private newWorld(): SavedWorld {
    const world = structuredClone(origworld) as SavedWorld;
    world.saveVersion = 2;
    world.lastupdateMs = Date.now();
    world.lastupdate = Math.floor(world.lastupdateMs / 1000);
    return world;
  }

  private worldPath(user: string): string {
    if (
      !user.trim() ||
      /[\\/:*?"<>|]/.test(user) ||
      user === '.' ||
      user === '..'
    ) {
      throw new Error('Identifiant de joueur invalide');
    }
    return path.join(process.cwd(), 'userworlds', `${user}-world.json`);
  }

  private migrateWorld(world: SavedWorld): void {
    // Les anciennes versions mélangeaient secondes/ms et temps écoulé/restant.
    // Reconstruire les durées depuis les bonus achetés évite de deviner l'unité.
    for (const product of world.products) {
      const initial = origworld.products.find((item) => item.id === product.id);
      if (!initial)
        throw new Error(`Produit inconnu dans la sauvegarde : ${product.id}`);
      const oldDuration = product.vitesse;
      let duration = initial.vitesse;
      const bonuses = [
        ...product.paliers,
        ...world.allunlocks,
        ...world.upgrades,
        ...world.angelupgrades,
      ];
      for (const bonus of bonuses) {
        if (
          bonus.unlocked &&
          bonus.typeratio === 'vitesse' &&
          (bonus.idcible === 0 || bonus.idcible === product.id)
        ) {
          duration = Math.max(1, Math.floor(duration / bonus.ratio));
        }
      }
      product.vitesse = duration;
      product.timeleft =
        product.managerUnlocked && product.quantite > 0
          ? duration
          : product.timeleft > 0 && product.timeleft <= oldDuration
            ? Math.ceil((product.timeleft / oldDuration) * duration)
            : 0;
    }
    // L'ancien horodatage ne permet pas de recalculer fiablement les gains passés.
    world.lastupdateMs = Date.now();
    world.lastupdate = Math.floor(world.lastupdateMs / 1000);
    world.saveVersion = 2;
  }
}
