import { useState, useEffect } from 'react';

interface ReduceTabProps {
  baselineAnnualKg: number;
}

export default function ReduceTab({ baselineAnnualKg }: ReduceTabProps) {
  // Lever Sliders State
  const [transitShift, setTransitShift] = useState(0); // km/week shifted from petrol car to local train
  const [vegSwaps, setVegSwaps] = useState(0);        // chicken meals replaced with veg/week
  const [acReduction, setAcReduction] = useState(0);    // AC hours reduced per day
  const [solarOffset, setSolarOffset] = useState(0);    // % electricity offset by solar

  // Calculations
  const [annualSavings, setAnnualSavings] = useState(0);
  const [planText, setPlanText] = useState('');
  const [planLoading, setPlanLoading] = useState(false);

  // Derived Grid Electricity Baseline
  // Assume a default electricity usage of 3600 kWh/year (approx ₹2400/month bill)
  const annualGridKwh = 3600; 

  useEffect(() => {
    // 1. Transport savings: N km/week * 52 weeks * (car_petrol_factor - local_train_factor)
    // factors: car_petrol_km = 0.171, local_train_km = 0.007. Difference = 0.164
    const transportSaving = transitShift * 52 * 0.164;

    // 2. Food savings: N meals/week * 52 weeks * (chicken_meal_factor - veg_meal_factor)
    // factors: chicken_meal = 1.8, veg_meal = 0.5. Difference = 1.3
    const foodSaving = vegSwaps * 52 * 1.3;

    // 3. AC savings: N hours/day * 365 days * ac_hour_factor (ac_hour = 1.0)
    const acSaving = acReduction * 365 * 1.0;

    // 4. Solar savings: annual grid kWh * (M / 100) * grid_electricity_kwh (factor = 0.71)
    const solarSaving = annualGridKwh * (solarOffset / 100) * 0.71;

    const total = transportSaving + foodSaving + acSaving + solarSaving;
    setAnnualSavings(Math.round(total));
  }, [transitShift, vegSwaps, acReduction, solarOffset]);

  const handleGetPlan = async () => {
    setPlanLoading(true);
    setPlanText('');

    const levers = {
      transitShiftKmPerWeek: transitShift,
      vegSwapsPerWeek: vegSwaps,
      acHoursReducedPerDay: acReduction,
      solarOffsetPercent: solarOffset
    };

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseline: baselineAnnualKg,
          levers,
          saved: annualSavings
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlanText(data.plan);
      } else {
        setPlanText('Failed to compile your reduction plan. Please try again.');
      }
    } catch (err) {
      console.error('Simulation plan fetch error:', err);
      setPlanText('Failed to establish connection to the planner server.');
    } finally {
      setPlanLoading(false);
    }
  };

  const projectedFootprint = Math.max(0, baselineAnnualKg - annualSavings);

  return (
    <div className="space-y-8 max-w-3xl w-full mx-auto pb-12">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Savings Card */}
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              Projected Annual Savings
            </h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-emerald-400">-{annualSavings}</span>
              <span className="text-slate-400 text-sm">kg CO₂e / year</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Equivalent to planting approx. {Math.round(annualSavings / 22)} trees!
          </p>
        </div>

        {/* Projected Footprint Card */}
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              New Projected Footprint
            </h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-slate-100">{projectedFootprint}</span>
              <span className="text-slate-400 text-sm">kg CO₂e / year</span>
            </div>
          </div>
          <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (projectedFootprint / baselineAnnualKg) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sliders Form Container */}
      <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8">
        <div>
          <h3 className="text-xl font-bold text-slate-100 mb-1">Interactive What-If Simulator</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Drag the sliders to simulate personal changes in transit, diet, and energy. Check your live savings above.
          </p>
        </div>

        <div className="space-y-6">
          {/* Lever 1: Transit Shift */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="transit-shift-slider" className="font-semibold text-slate-300">Public Transit Shift</label>
              <span className="text-emerald-400 font-bold">{transitShift} km / week</span>
            </div>
            <input 
              id="transit-shift-slider"
              type="range" 
              min="0" 
              max="200" 
              step="10"
              value={transitShift}
              onChange={(e) => setTransitShift(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Shift daily car travel to clean electric local metro/trains.
            </p>
          </div>

          {/* Lever 2: Food Swaps */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="veg-swaps-slider" className="font-semibold text-slate-300">Veg Meal Swaps</label>
              <span className="text-emerald-400 font-bold">{vegSwaps} chicken meals / week</span>
            </div>
            <input 
              id="veg-swaps-slider"
              type="range" 
              min="0" 
              max="14" 
              step="1"
              value={vegSwaps}
              onChange={(e) => setVegSwaps(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Replace chicken or poultry meals with low-carbon vegetarian meals.
            </p>
          </div>

          {/* Lever 3: AC reduction */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="ac-reduction-slider" className="font-semibold text-slate-300">Reduce AC Usage</label>
              <span className="text-emerald-400 font-bold">{acReduction} hours / day</span>
            </div>
            <input 
              id="ac-reduction-slider"
              type="range" 
              min="0" 
              max="12" 
              step="1"
              value={acReduction}
              onChange={(e) => setAcReduction(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Turn off cooling or set AC timers to reduce daily run hours.
            </p>
          </div>

          {/* Lever 4: Solar Offset */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="solar-offset-slider" className="font-semibold text-slate-300">Rooftop Solar Offset</label>
              <span className="text-emerald-400 font-bold">{solarOffset}% of grid power</span>
            </div>
            <input 
              id="solar-offset-slider"
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={solarOffset}
              onChange={(e) => setSolarOffset(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Offset high-emission grid power by installing rooftop solar systems.
            </p>
          </div>
        </div>

        {/* Plan trigger button */}
        <button
          onClick={handleGetPlan}
          disabled={planLoading || annualSavings === 0}
          className={`w-full py-4 font-bold rounded-2xl text-sm transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2 ${
            annualSavings === 0 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/10'
          }`}
        >
          {planLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Drafting your custom plan...</span>
            </>
          ) : (
            <>
              <span className="text-lg">📋</span>
              <span>Generate Personalized Action Plan</span>
            </>
          )}
        </button>
      </div>

      {/* Narrative AI Plan Output */}
      {planText && (
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl animate-fade-in relative overflow-hidden">
          {/* Small badge */}
          <div className="absolute top-0 right-0 bg-emerald-500/10 border-l border-b border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-bl-xl">
            AI Generated Plan
          </div>
          
          <h4 className="text-slate-100 font-bold mb-4 flex items-center">
            <span className="text-emerald-400 mr-2">🌿</span> Your Implementation Roadmap
          </h4>
          
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            {planText}
          </p>
        </div>
      )}
    </div>
  );
}
