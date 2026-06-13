import { describe, it, expect } from 'vitest';
import { computeCo2eKg } from './co2';

describe('CO2e Calculator (computeCo2eKg)', () => {
  it('should calculate transport emissions correctly', () => {
    // Petrol car: 10km * 0.171 = 1.71 kg
    expect(computeCo2eKg('transport', 'car_petrol_km', 10)).toBe(1.71);
    
    // Two wheeler: 5km * 0.045 = 0.225 kg
    expect(computeCo2eKg('transport', 'two_wheeler_km', 5)).toBe(0.225);
    
    // Local train: 20km * 0.007 = 0.14 kg
    expect(computeCo2eKg('transport', 'local_train_km', 20)).toBe(0.14);
  });

  it('should calculate food emissions correctly', () => {
    // Chicken meal: 2 servings * 1.8 = 3.6 kg
    expect(computeCo2eKg('food', 'chicken_meal', 2)).toBe(3.6);
    
    // Veg meal: 1 meal * 0.5 = 0.5 kg
    expect(computeCo2eKg('food', 'veg_meal', 1)).toBe(0.5);
  });

  it('should calculate energy emissions correctly', () => {
    // AC: 8 hours * 1.0 = 8.0 kg
    expect(computeCo2eKg('energy', 'ac_hour', 8)).toBe(8);

    // Electricity: 100 kWh * 0.71 = 71 kg
    expect(computeCo2eKg('energy', 'grid_electricity_kwh', 100)).toBe(71);
  });

  it('should return 0 for invalid categories or subtypes', () => {
    expect(computeCo2eKg('invalid_category', 'some_subtype', 10)).toBe(0);
    expect(computeCo2eKg('transport', 'invalid_subtype', 10)).toBe(0);
    expect(computeCo2eKg('food', 'chicken_meal', -5)).toBe(0);
    expect(computeCo2eKg('food', 'chicken_meal', NaN)).toBe(0);
  });
});
