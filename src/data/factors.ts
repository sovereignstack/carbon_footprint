// kg CO2e per unit
export const FACTORS = {
  transport: {
    car_petrol_km:    { factor: 0.171, unit: 'km' },
    car_diesel_km:    { factor: 0.168, unit: 'km' },
    two_wheeler_km:   { factor: 0.045, unit: 'km' },
    auto_rickshaw_km: { factor: 0.107, unit: 'km' },
    bus_km:           { factor: 0.015, unit: 'km' },
    local_train_km:   { factor: 0.007, unit: 'km' }, // suburban/metro electric
    domestic_flight_km:{factor: 0.158, unit: 'km' },
  },
  food: { // per meal/serving
    veg_meal:     { factor: 0.5,  unit: 'meal' },
    chicken_meal: { factor: 1.8,  unit: 'meal' },
    red_meat_meal:{ factor: 5.0,  unit: 'meal' }, // mutton/beef
    dairy_serving:{ factor: 0.6,  unit: 'serving' },
    rice_serving: { factor: 0.4,  unit: 'serving' },
  },
  energy: {
    grid_electricity_kwh: { factor: 0.71, unit: 'kWh' }, // India grid avg (CEA)
    ac_hour:              { factor: 1.0,  unit: 'hour' }, // ~1.4kWh * 0.71
    lpg_cylinder:         { factor: 42.0, unit: 'cylinder' }, // 14.2kg cylinder
  },
  shopping: {
    clothing_item: { factor: 8.0, unit: 'item' },
    generic_inr:   { factor: 0.0004, unit: 'INR' }, // rough spend-based
  },
} as const;

export type Category = keyof typeof FACTORS;
export type Subtype<C extends Category> = keyof typeof FACTORS[C];

// India per-capita reference for "Understand" comparisons
export const REFERENCE = {
  indiaAnnualPerCapitaKg: 1900,  // ~1.9 t CO2e
  globalAnnualPerCapitaKg: 4700, // ~4.7 t CO2e
};
