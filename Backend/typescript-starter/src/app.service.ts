import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { origworld } from './origworld.js';
import { Palier, Product, World } from './graphql.js';

@Injectable()
export class AppService {
	getHello(): string {
		return 'Hello World!';
	}

	readUserWorld(user: string): World {
		try {
			const data = fs.readFileSync(
				path.join(process.cwd(), 'userworlds', `${user}-world.json`),
			);
			const savedWorld = JSON.parse(data.toString()) as World;
			if (savedWorld.money === 0 && savedWorld.score === 0 && savedWorld.totalangels === 0) {
				return structuredClone(origworld) as World;
			}
			this.migrateProductionSpeeds(savedWorld);
			return savedWorld;
		} catch (error: unknown) {
			console.log((error as Error).message);
			return structuredClone(origworld) as World;
		}
	}

	private migrateProductionSpeeds(world: World): void {
		const previousSpeeds = [500, 3000, 7000, 15000, 30000, 60000];
		const currentSpeeds = [1, 2, 4, 10, 30, 60];
		world.products.forEach((product, index) => {
			if (product.vitesse === previousSpeeds[index]) {
				product.vitesse = currentSpeeds[index];
				product.timeleft = Math.min(product.timeleft, product.vitesse);
			}
		});
	}

	saveWorld(user: string, world: World): void {
		const userWorldsPath = path.join(process.cwd(), 'userworlds');
		fs.mkdirSync(userWorldsPath, { recursive: true });
		try {
			fs.writeFileSync(
				path.join(userWorldsPath, `${user}-world.json`),
				JSON.stringify(world),
			);
		} catch (error: unknown) {
			console.error(error);
			throw new Error(`Erreur d'écriture du monde coté serveur`);
		}
	}

	updateWorld(world: World): World {
		const now = Math.floor(Date.now() / 1000);
		const elapsedSeconds = world.lastupdate
			? Math.max(0, now - world.lastupdate)
			: 0;

		for (const product of world.products) {
			if (product.managerUnlocked) {
				const elapsedWithPending = elapsedSeconds + product.timeleft;
				const produced = Math.floor(elapsedWithPending / product.vitesse);
				product.timeleft = elapsedWithPending % product.vitesse;
				this.addProduction(world, product, produced);
			} else if (product.timeleft > 0) {
				if (product.timeleft <= elapsedSeconds) {
					this.addProduction(world, product, 1);
					product.timeleft = 0;
				} else {
					product.timeleft -= elapsedSeconds;
				}
			}
		}

		world.lastupdate = now;
		return world;
	}

	resetWorld(world: World): World {
		const earnedAngels = Math.max(
			0,
			Math.floor(150 * Math.sqrt(world.score / 1_000_000)) - world.totalangels,
		);
		const resetWorld = structuredClone(origworld) as World;
		resetWorld.score = world.score;
		resetWorld.totalangels = world.totalangels + earnedAngels;
		resetWorld.activeangels = world.activeangels + earnedAngels;
		resetWorld.lastupdate = Math.floor(Date.now() / 1000);
		return resetWorld;
	}

	checkUnlocks(world: World, product: Product): void {
		for (const palier of product.paliers) {
			if (!palier.unlocked && product.quantite >= palier.seuil) {
				palier.unlocked = true;
				this.applyBonus(world, palier, product);
			}
		}

		for (const palier of world.allunlocks) {
			const allProductsReachedThreshold = world.products.every(
				(currentProduct) => currentProduct.quantite >= palier.seuil,
			);
			if (!palier.unlocked && allProductsReachedThreshold) {
				palier.unlocked = true;
				for (const currentProduct of world.products) {
					this.applyBonus(world, palier, currentProduct);
				}
			}
		}
	}

	applyUpgrade(world: World, palier: Palier): void {
		if (palier.idcible === -1) {
			this.applyBonus(world, palier);
			return;
		}

		const products = palier.idcible === 0
			? world.products
			: world.products.filter((product) => product.id === palier.idcible);
		if (products.length === 0) {
			throw new Error(`Le produit ciblé par ${palier.name} n'existe pas`);
		}
		for (const product of products) {
			this.applyBonus(world, palier, product);
		}
	}

	private applyBonus(world: World, palier: Palier, product?: Product): void {
		switch (palier.typeratio) {
			case 'gain':
				if (product) {
					product.revenu *= palier.ratio;
				}
				break;
			case 'vitesse':
				if (product) {
					product.vitesse = Math.max(1, Math.floor(product.vitesse / palier.ratio));
				}
				break;
			case 'ange':
				world.angelbonus *= palier.ratio;
				break;
		}
	}

	private addProduction(world: World, product: World['products'][number], count: number): void {
		if (count <= 0) {
			return;
		}
		const gains =
			count *
			product.quantite *
			product.revenu *
			(1 + (world.activeangels * world.angelbonus) / 100);
		world.money += gains;
		world.score += gains;
	}
}