import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';
import { Palier, Product, World } from './graphql.js';

@Resolver('World')
export class GraphQlResolver {
  constructor(private service: AppService) {}

  @Query()
  getWorld(@Args('user') user: string): World {
    const world = this.service.updateWorld(this.service.readUserWorld(user));
    this.service.saveWorld(user, world);
    return world;
  }

  @Mutation()
  acheterQtProduit(
    @Args('user') user: string,
    @Args('id') id: number,
    @Args('quantite') quantite: number,
  ): Product {
    const world = this.service.updateWorld(this.service.readUserWorld(user));
    const product = world.products.find((item) => item.id === id);
    if (!product) {
      throw new Error(`Le produit avec l'id ${id} n'existe pas`);
    }
    if (!Number.isInteger(quantite) || quantite <= 0) {
      throw new Error('La quantité doit être un entier positif');
    }

    const totalCost =
      product.croissance === 1
        ? product.cout * quantite
        : product.cout *
          ((product.croissance ** quantite - 1) / (product.croissance - 1));
    if (!Number.isFinite(totalCost) || world.money < totalCost) {
      throw new Error("L'argent du monde est insuffisant");
    }

    world.money -= totalCost;
    product.quantite += quantite;
    product.cout *= product.croissance ** quantite;
    this.service.checkUnlocks(world, product);
    this.service.saveWorld(user, world);
    return product;
  }

  @Mutation()
  lancerProductionProduit(
    @Args('user') user: string,
    @Args('id') id: number,
  ): Product {
    const world = this.service.updateWorld(this.service.readUserWorld(user));
    const product = world.products.find((item) => item.id === id);
    if (!product) {
      throw new Error(`Le produit avec l'id ${id} n'existe pas`);
    }

    if (
      product.quantite <= 0 ||
      product.managerUnlocked ||
      product.timeleft > 0
    ) {
      throw new Error(
        'Ce produit ne peut pas démarrer une production manuelle',
      );
    }
    product.timeleft = product.vitesse;
    this.service.saveWorld(user, world);
    return product;
  }

  @Mutation()
  engagerManager(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.service.updateWorld(this.service.readUserWorld(user));
    const manager = world.managers.find((item) => item.name === name);
    if (!manager) {
      throw new Error(`Le manager ${name} n'existe pas`);
    }
    const product = world.products.find((item) => item.id === manager.idcible);
    if (!product) {
      throw new Error(`Le produit du manager ${name} n'existe pas`);
    }

    if (manager.unlocked || product.managerUnlocked) {
      throw new Error(`Le manager ${name} est déjà engagé`);
    }
    if (world.money < manager.seuil) {
      throw new Error("L'argent du monde est insuffisant");
    }
    world.money -= manager.seuil;
    product.managerUnlocked = true;
    if (product.quantite > 0 && product.timeleft === 0) {
      product.timeleft = product.vitesse;
    }
    manager.unlocked = true;
    this.service.saveWorld(user, world);
    return manager;
  }

  @Mutation()
  acheterCashUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.service.updateWorld(this.service.readUserWorld(user));
    const upgrade = world.upgrades.find((item) => item.name === name);
    if (!upgrade) {
      throw new Error(`L'upgrade ${name} n'existe pas`);
    }
    if (upgrade.unlocked) {
      throw new Error(`L'upgrade ${name} est déjà débloqué`);
    }
    if (world.money < upgrade.seuil) {
      throw new Error("L'argent du monde est insuffisant");
    }

    world.money -= upgrade.seuil;
    upgrade.unlocked = true;
    this.service.applyUpgrade(world, upgrade);
    this.service.saveWorld(user, world);
    return upgrade;
  }

  @Mutation()
  acheterAngelUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.service.updateWorld(this.service.readUserWorld(user));
    const upgrade = world.angelupgrades.find((item) => item.name === name);
    if (!upgrade) {
      throw new Error(`L'angel upgrade ${name} n'existe pas`);
    }
    if (upgrade.unlocked) {
      throw new Error(`L'angel upgrade ${name} est déjà débloqué`);
    }
    if (world.activeangels < upgrade.seuil) {
      throw new Error('Le nombre d anges actifs est insuffisant');
    }

    world.activeangels -= upgrade.seuil;
    upgrade.unlocked = true;
    this.service.applyUpgrade(world, upgrade);
    this.service.saveWorld(user, world);
    return upgrade;
  }

  @Mutation()
  resetWorld(@Args('user') user: string): World {
    const world = this.service.updateWorld(this.service.readUserWorld(user));
    const resetWorld = this.service.resetWorld(world);
    this.service.saveWorld(user, resetWorld);
    return resetWorld;
  }
}
