import { useState } from 'react';

interface OnboardingProps {
  onComplete: (baselineAnnualKg: number) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [commuteDistance, setCommuteDistance] = useState(15);
  const [commuteMode, setCommuteMode] = useState('car_petrol_km');
  const [dietType, setDietType] = useState('veg_meal');
  const [dairyServings, setDairyServings] = useState(2);
  const [riceServings, setRiceServings] = useState(2);
  const [acHours, setAcHours] = useState(4);
  const [electricityBill, setElectricityBill] = useState(3000); // monthly INR bill
  const [clothingItems, setClothingItems] = useState(12); // clothes per year
  const [otherShopping, setOtherShopping] = useState(5000); // monthly INR budget

  const calculateBaseline = () => {
    // 1. Transport Annual Footprint
    // commuteMode factor * daily km * 365
    const transportFactors: Record<string, number> = {
      car_petrol_km: 0.171,
      car_diesel_km: 0.168,
      two_wheeler_km: 0.045,
      auto_rickshaw_km: 0.107,
      bus_km: 0.015,
      local_train_km: 0.007
    };
    const transportAnnual = commuteDistance * 365 * (transportFactors[commuteMode] || 0.045);

    // 2. Food Annual Footprint
    // meal factor * 3 meals/day * 365 + dairy + rice
    const foodFactors: Record<string, number> = {
      veg_meal: 0.5,
      chicken_meal: 1.8,
      red_meat_meal: 5.0
    };
    const baseMealFactor = foodFactors[dietType] || 0.5;
    // Assume 3 meals per day
    const foodAnnual = (baseMealFactor * 3 * 365) + 
                       (dairyServings * 0.6 * 365) + 
                       (riceServings * 0.4 * 365);

    // 3. Energy Annual Footprint
    // AC hours * factor * 365 + Electricity bill (₹8/kWh grid avg in India) * 12 months
    const acAnnual = acHours * 1.0 * 365;
    const electricityKwh = (electricityBill / 8) * 12; // ₹8 per kWh
    const electricityAnnual = electricityKwh * 0.71; // CEA grid emission factor
    const energyAnnual = acAnnual + electricityAnnual;

    // 4. Shopping Annual Footprint
    // clothing * factor + spend * 12 * INR factor
    const clothingAnnual = clothingItems * 8.0;
    const shoppingAnnual = clothingAnnual + (otherShopping * 12 * 0.0004);

    // Total
    const total = transportAnnual + foodAnnual + energyAnnual + shoppingAnnual;
    return Math.round(total);
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const baseline = calculateBaseline();
    
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ baselineAnnualKg: baseline })
      });
      if (res.ok) {
        onComplete(baseline);
      } else {
        console.error('Failed to save baseline profile');
        // complete anyway as fallback
        onComplete(baseline);
      }
    } catch (err) {
      console.error('Error saving baseline profile:', err);
      onComplete(baseline);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-emerald-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-100">Setup Your Baseline</h2>
        <p className="text-slate-400 text-sm mt-1">Question {step} of 4</p>
      </div>

      {/* Steps Content */}
      <div className="min-h-[220px]">
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-emerald-400">🚗 Daily Commute</h3>
            
            <div className="space-y-2">
              <label htmlFor="commute-distance-slider" className="flex justify-between text-sm text-slate-300">
                <span>Daily Commute Distance:</span>
                <span className="font-semibold text-emerald-400">{commuteDistance} km</span>
              </label>
              <input 
                id="commute-distance-slider"
                type="range" 
                min="0" 
                max="100" 
                value={commuteDistance}
                onChange={(e) => setCommuteDistance(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="commute-mode-select" className="text-sm text-slate-300 block">Primary Travel Mode:</label>
              <select 
                id="commute-mode-select"
                value={commuteMode}
                onChange={(e) => setCommuteMode(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="car_petrol_km">Petrol Car</option>
                <option value="car_diesel_km">Diesel Car</option>
                <option value="two_wheeler_km">Two Wheeler (Motorcycle/Scooter)</option>
                <option value="auto_rickshaw_km">Auto Rickshaw</option>
                <option value="bus_km">Public Bus</option>
                <option value="local_train_km">Suburban Local Train / Metro</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-emerald-400">🍛 Food & Diet</h3>

            <div className="space-y-2">
              <label htmlFor="diet-type-select" className="text-sm text-slate-300 block">Primary Diet Type:</label>
              <select 
                id="diet-type-select"
                value={dietType}
                onChange={(e) => setDietType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="veg_meal">Vegetarian</option>
                <option value="chicken_meal">Non-Veg (Poultry/Fish)</option>
                <option value="red_meat_meal">Non-Veg (Red Meat / Mutton / Beef)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="dairy-servings-input" className="text-sm text-slate-300 block">Dairy Servings/Day:</label>
                <input 
                  id="dairy-servings-input"
                  type="number" 
                  min="0"
                  max="10"
                  value={dairyServings}
                  onChange={(e) => setDairyServings(Math.max(0, Number(e.target.value)))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="rice-servings-input" className="text-sm text-slate-300 block">Rice Servings/Day:</label>
                <input 
                  id="rice-servings-input"
                  type="number" 
                  min="0"
                  max="10"
                  value={riceServings}
                  onChange={(e) => setRiceServings(Math.max(0, Number(e.target.value)))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-emerald-400">⚡ Household Energy</h3>

            <div className="space-y-2">
              <label htmlFor="ac-hours-slider" className="flex justify-between text-sm text-slate-300">
                <span>Daily AC Usage:</span>
                <span className="font-semibold text-emerald-400">{acHours} hours</span>
              </label>
              <input 
                id="ac-hours-slider"
                type="range" 
                min="0" 
                max="24" 
                value={acHours}
                onChange={(e) => setAcHours(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="elec-bill-input" className="text-sm text-slate-300 block">Monthly Electricity Bill (₹):</label>
              <input 
                id="elec-bill-input"
                type="number" 
                min="0"
                max="50000"
                step="500"
                value={electricityBill}
                onChange={(e) => setElectricityBill(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-emerald-400">🛍️ Shopping Habits</h3>

            <div className="space-y-2">
              <label htmlFor="clothing-items-input" className="text-sm text-slate-300 block">Clothing Items Purchased/Year:</label>
              <input 
                id="clothing-items-input"
                type="number" 
                min="0"
                max="200"
                value={clothingItems}
                onChange={(e) => setClothingItems(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="other-shopping-input" className="text-sm text-slate-300 block">Monthly Budget for Other Shopping (₹):</label>
              <input 
                id="other-shopping-input"
                type="number" 
                min="0"
                max="100000"
                step="1000"
                value={otherShopping}
                onChange={(e) => setOtherShopping(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center mt-10">
        <button
          onClick={handleBack}
          disabled={step === 1 || loading}
          className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            step === 1 
              ? 'opacity-30 cursor-not-allowed text-slate-500' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95'
          }`}
        >
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 active:scale-95 flex items-center justify-center min-w-[100px]"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : step === 4 ? (
            'Complete'
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
}
