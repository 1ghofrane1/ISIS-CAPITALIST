import type { Product } from '../models/game.models';

type PurchasableProduct = Pick<Product, 'cout' | 'croissance'>;

export function purchaseCost(product: PurchasableProduct, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0 || product.cout <= 0) {
    return 0;
  }

  if (Math.abs(product.croissance - 1) < Number.EPSILON) {
    return product.cout * quantity;
  }

  return product.cout * ((Math.pow(product.croissance, quantity) - 1) / (product.croissance - 1));
}

export function maxAffordable(product: PurchasableProduct, money: number): number {
  if (money < product.cout || product.cout <= 0 || money <= 0) {
    return 0;
  }

  if (product.croissance <= 1) {
    return Math.max(0, Math.floor(money / product.cout));
  }

  const estimate = Math.floor(
    Math.log(1 + (money * (product.croissance - 1)) / product.cout) / Math.log(product.croissance),
  );
  let quantity = Math.max(0, estimate);

  while (quantity > 0 && purchaseCost(product, quantity) > money) {
    quantity -= 1;
  }
  while (quantity < Number.MAX_SAFE_INTEGER && purchaseCost(product, quantity + 1) <= money) {
    quantity += 1;
  }

  return quantity;
}
