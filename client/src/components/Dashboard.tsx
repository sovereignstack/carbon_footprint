import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface DashboardProps {
  summary: {
    thisWeekTotalKg: number;
    baselineWeeklyKg: number;
    byCategory: {
      transport: number;
      food: number;
      energy: number;
      shopping: number;
    };
    dailyHistory: { date: string; co2eKg: number }[];
    comparison: {
      userWeekly: number;
      indiaWeekly: number;
      globalWeekly: number;
    };
  };
}

interface Insight {
  action: string;
  category: 'transport' | 'food' | 'energy' | 'shopping';
  estimatedWeeklySavingKg: number;
  rationale: string;
}

const COLORS = {
  transport: '#10B981', // emerald
  food: '#34D399',      // light green
  energy: '#F59E0B',    // amber
  shopping: '#3B82F6'   // blue
};

export default function Dashboard({ summary }: DashboardProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    // Fetch weekly insights
    fetch('/api/insights')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch insights');
      })
      .then(data => {
        if (data.success) {
          setInsights(data.insights);
        }
      })
      .catch(err => {
        console.error('Error fetching insights:', err);
      })
      .finally(() => {
        setInsightsLoading(false);
      });
  }, [summary]);

  // Format data for PieChart
  const pieData = [
    { name: 'Transport', value: summary.byCategory.transport, color: COLORS.transport },
    { name: 'Food', value: summary.byCategory.food, color: COLORS.food },
    { name: 'Energy', value: summary.byCategory.energy, color: COLORS.energy },
    { name: 'Shopping', value: summary.byCategory.shopping, color: COLORS.shopping }
  ].filter(d => d.value > 0);

  // Format daily history date labels
  const formattedHistory = summary.dailyHistory.map(day => {
    const d = new Date(day.date);
    return {
      ...day,
      dateLabel: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    };
  });

  // Identify the largest category
  const categories = Object.entries(summary.byCategory);
  const largest = categories.reduce((max, curr) => (curr[1] > max[1] ? curr : max), ['', 0]);

  return (
    <div className="space-y-8 max-w-5xl w-full mx-auto pb-12">
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Footprint Card */}
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              Weekly Footprint
            </h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-slate-100">{summary.thisWeekTotalKg}</span>
              <span className="text-slate-400 text-sm">kg CO₂e</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">vs Weekly Baseline</span>
            <span className={`font-bold ${summary.thisWeekTotalKg <= summary.baselineWeeklyKg ? 'text-emerald-400' : 'text-amber-500'}`}>
              {summary.thisWeekTotalKg <= summary.baselineWeeklyKg ? '↓' : '↑'}{' '}
              {Math.abs(Math.round((summary.thisWeekTotalKg - summary.baselineWeeklyKg) * 10) / 10)} kg
            </span>
          </div>
        </div>

        {/* Baseline Card */}
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              Weekly Target
            </h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-slate-100">{summary.baselineWeeklyKg}</span>
              <span className="text-slate-400 text-sm">kg CO₂e</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Target calculated from baseline</span>
          </div>
        </div>

        {/* Largest Contributor Card */}
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              Top Emission Source
            </h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold text-amber-400 capitalize">
                {largest[1] > 0 ? largest[0] : 'None'}
              </span>
              <span className="text-slate-400 text-sm ml-2">
                {largest[1] > 0 ? `(${largest[1]} kg)` : ''}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            {largest[1] > 0 ? `Targets ${largest[0]} swaps for reduction plan.` : 'Start logging to check sources.'}
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Trend Area Chart */}
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
          <h3 className="text-slate-100 font-bold mb-4">14-Day Footprint Trend</h3>
          <div className="sr-only">
            <h4>14-Day Footprint Trend Table</h4>
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Emissions (kg CO₂e)</th>
                </tr>
              </thead>
              <tbody>
                {formattedHistory.map((day, idx) => (
                  <tr key={idx}>
                    <td>{day.dateLabel}</td>
                    <td>{day.co2eKg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateLabel" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94A3B8' }}
                  itemStyle={{ color: '#10B981' }}
                />
                <Area type="monotone" dataKey="co2eKg" name="Emissions (kg)" stroke="#10B981" fillOpacity={1} fill="url(#colorCo2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown (Donut chart) */}
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <h3 className="text-slate-100 font-bold mb-4">Emissions by Category</h3>
          <div className="sr-only">
            <h4>Emissions by Category Table</h4>
            <table>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Emissions (kg CO₂e)</th>
                </tr>
              </thead>
              <tbody>
                {pieData.map((d, idx) => (
                  <tr key={idx}>
                    <td>{d.name}</td>
                    <td>{d.value} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pieData.length > 0 ? (
            <div className="h-64 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#E2E8F0' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              No activity logs logged this week. Go to the Log tab!
            </div>
          )}
        </div>
      </div>

      {/* Comparisons Section */}
      <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
        <h3 className="text-slate-100 font-bold mb-6">How You Compare (Weekly kg CO₂e)</h3>
        <div className="space-y-4">
          
          {/* User Weekly */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span>Your Weekly Average</span>
              <span className="text-emerald-400 font-bold">{summary.thisWeekTotalKg} kg</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (summary.thisWeekTotalKg / 100) * 100)}%` }}
              />
            </div>
          </div>

          {/* India Average */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span>Average Indian Citizen (1.9 t/yr)</span>
              <span>{summary.comparison.indiaWeekly} kg</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-slate-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (summary.comparison.indiaWeekly / 100) * 100)}%` }}
              />
            </div>
          </div>

          {/* Global Average */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span>Global Average (4.7 t/yr)</span>
              <span>{summary.comparison.globalWeekly} kg</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-slate-700 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (summary.comparison.globalWeekly / 100) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Insights (Gemini Personalized actions) */}
      <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-slate-100 font-bold flex items-center">
            <span className="mr-2 text-emerald-400 text-xl">✨</span> Weekly Recommendations
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 border border-emerald-500/20 rounded">
            AI Powered
          </span>
        </div>

        {insightsLoading ? (
          <div className="space-y-4">
            <div className="h-16 bg-slate-850 animate-pulse rounded-xl" />
            <div className="h-16 bg-slate-850 animate-pulse rounded-xl" />
          </div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className="p-5 border border-slate-800/60 bg-slate-950/40 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span 
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wide"
                      style={{ 
                        backgroundColor: `${COLORS[insight.category]}15`, 
                        color: COLORS[insight.category],
                        border: `1px solid ${COLORS[insight.category]}30` 
                      }}
                    >
                      {insight.category}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      -{insight.estimatedWeeklySavingKg} kg/week
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 mb-1">{insight.action}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{insight.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm leading-relaxed">
            Record a daily entry inside the Log tab so our AI Coach can analyze your activities and suggest personalized footprint reduction actions.
          </div>
        )}
      </div>
    </div>
  );
}
