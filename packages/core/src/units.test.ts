import { describe, expect, it } from 'vitest';
import { fromKg, toKg, roundWeight } from './units';

describe('weight unit conversion (storage stays kg)', () => {
  it('kg is identity', () => {
    expect(fromKg(100, 'kg')).toBe(100);
    expect(toKg(100, 'kg')).toBe(100);
  });

  it('kg ↔ lb round-trips', () => {
    const lb = fromKg(100, 'lb');
    expect(roundWeight(lb)).toBe(220.5);
    expect(Math.round(toKg(lb, 'lb'))).toBe(100);
  });

  it('a value entered in lb stores as the correct kg', () => {
    expect(Math.round(toKg(225, 'lb'))).toBe(102); // 225 lb ≈ 102 kg
  });
});
