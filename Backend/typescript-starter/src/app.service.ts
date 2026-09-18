import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { origworld } from './origworld.js';
import { World } from './graphql.js';

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
			return JSON.parse(data.toString()) as World;
		} catch (error: unknown) {
			console.log((error as Error).message);
			return structuredClone(origworld) as World;
		}
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

	private addProduction(world: World, product: World['products'][number], count: number): void {
		if (count <= 0) {
			return;
		}
		const gains = count * product.revenu * (1 + world.angelbonus / 100);
		world.money += gains;
		world.score += gains;
	}
}