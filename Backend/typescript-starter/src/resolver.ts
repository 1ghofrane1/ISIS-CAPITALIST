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

		let totalCost = 0;
		for (let index = 0; index < quantite; index += 1) {
			totalCost += product.cout * product.croissance ** index;
		}
		if (world.money < totalCost) {
			throw new Error("L'argent du monde est insuffisant");
		}

		world.money -= totalCost;
		product.quantite += quantite;
		product.cout *= product.croissance ** quantite;
		this.service.saveWorld(user, world);
		return product;
	}

	@Mutation()
	lancerProductionProduit(@Args('user') user: string, @Args('id') id: number): Product {
		const world = this.service.updateWorld(this.service.readUserWorld(user));
		const product = world.products.find((item) => item.id === id);
		if (!product) {
			throw new Error(`Le produit avec l'id ${id} n'existe pas`);
		}

		product.timeleft = product.vitesse;
		this.service.saveWorld(user, world);
		return product;
	}

	@Mutation()
	engagerManager(@Args('user') user: string, @Args('name') name: string): Palier {
		const world = this.service.updateWorld(this.service.readUserWorld(user));
		const manager = world.managers.find((item) => item.name === name);
		if (!manager) {
			throw new Error(`Le manager ${name} n'existe pas`);
		}
		const product = world.products.find((item) => item.id === manager.idcible);
		if (!product) {
			throw new Error(`Le produit du manager ${name} n'existe pas`);
		}

		product.managerUnlocked = true;
		manager.unlocked = true;
		this.service.saveWorld(user, world);
		return manager;
	}
}
