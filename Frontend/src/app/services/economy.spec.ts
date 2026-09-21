import { describe, expect, it } from 'vitest';
import { maxAffordable, purchaseCost } from './economy';

describe('economy helpers', () => {
  const product = { cout: 4, croissance: 1.07 };

  it('calculates the geometric cost of a batch', () => {
    expect(purchaseCost(product, 1)).toBeCloseTo(4);
    expect(purchaseCost(product, 3)).toBeCloseTo(4 + 4 * 1.07 + 4 * 1.07 ** 2);
  });

  it('finds the largest affordable quantity', () => {
    const budget = purchaseCost(product, 25);
    expect(maxAffordable(product, budget)).toBe(25);
    expect(maxAffordable(product, budget - 0.01)).toBe(24);
  });

  it('returns zero when the first unit is unaffordable', () => {
    expect(maxAffordable(product, 3.99)).toBe(0);
  });
});
