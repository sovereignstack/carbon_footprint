import { FACTORS, Category } from '../data/factors';

/**
 * Computes the CO2e in kg for a given category, subtype, and quantity.
 * Returns 0 if the category or subtype is invalid.
 */
export function computeCo2eKg(category: string, subtype: string, quantity: number): number {
  if (isNaN(quantity) || quantity <= 0) {
    return 0;
  }

  const cat = category as Category;
  if (!FACTORS[cat]) {
    return 0;
  }

  // Type assertion since subtype is dynamic from API
  const factorGroup = FACTORS[cat] as Record<string, { factor: number; unit: string }>;
  const factorObj = factorGroup[subtype];

  if (!factorObj) {
    return 0;
  }

  // Calculate emissions: quantity * factor
  const result = quantity * factorObj.factor;
  
  // Return rounded to 3 decimal places for clean display
  return Math.round(result * 1000) / 1000;
}
