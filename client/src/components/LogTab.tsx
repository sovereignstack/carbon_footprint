import React, { useState } from 'react';

interface LogTabProps {
  onLogSuccess: () => void;
}

interface ActivityChip {
  category: 'transport' | 'food' | 'energy' | 'shopping';
  subtype: string;
  quantity: number;
  unit: string;
  co2eKg: number;
  estimated: boolean;
}

export default function LogTab({ onLogSuccess }: LogTabProps) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [chips, setChips] = useState<ActivityChip[]>([]);
  const [rawText, setRawText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.length > 1000) return;

    setParsing(true);
    setStatusMessage(null);
    setChips([]);
    setRawText(text);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.activities.length === 0) {
          setStatusMessage({
            type: 'error',
            text: "No carbon-relevant activities found in your text. Try saying something like 'travelled 10 km in petrol car, used AC for 3 hrs, ate non-veg meal'."
          });
        } else {
          setChips(data.activities);
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to parse your log description.'
        });
      }
    } catch (err) {
      console.error('Parsing fetch error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Connection error. Please try again.'
      });
    } finally {
      setParsing(false);
    }
  };

  const handleRemoveChip = (idxToRemove: number) => {
    setChips(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleConfirmLog = async () => {
    if (chips.length === 0) return;
    setLogging(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activities: chips,
          rawText
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const totalSaved = data.loggedEntries.reduce((sum: number, entry: any) => sum + entry.co2eKg, 0);
        setStatusMessage({
          type: 'success',
          text: `Successfully logged ${data.loggedEntries.length} activities (${Math.round(totalSaved * 10) / 10} kg CO₂e)!`
        });
        setChips([]);
        setText('');
        onLogSuccess(); // trigger dashboard update
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to save log entries.'
        });
      }
    } catch (err) {
      console.error('Logging fetch error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to connect. Please try again.'
      });
    } finally {
      setLogging(false);
    }
  };

  const categoryEmojis = {
    transport: '🚗',
    food: '🍲',
    energy: '⚡',
    shopping: '🛍️'
  };

  return (
    <div className="max-w-xl w-full mx-auto pb-12 space-y-6">
      {/* Log Form */}
      <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl">
        <h3 className="text-xl font-bold text-slate-100 mb-2">Track Your Day</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Describe your transport, meals, cooling, or shopping in everyday language. E.g.
          <span className="text-slate-300 font-medium block mt-1 italic">
            "I rode a scooty for 12 km, ate a chicken meal for dinner, and ran the AC for 5 hours"
          </span>
        </p>

        <form onSubmit={handleParse} className="space-y-4">
          <div className="relative">
            <textarea
              id="raw-text-log-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you do today?"
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm resize-none"
            />
            <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-600">
              {text.length}/1000
            </div>
          </div>

          <button
            type="submit"
            disabled={parsing || logging || !text.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-2xl text-sm transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2"
          >
            {parsing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Parsing details...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-4.563m-8.982-.536l-3.484-1.477a.75.75 0 01-.02-1.37l14.153-6.529a.75.75 0 011.022.924l-5.251 14.113a.75.75 0 01-1.402-.24l-1.89-5.389z" />
                </svg>
                <span>Analyze Text</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Parsing Status and Chips confirmation */}
      {chips.length > 0 && (
        <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 animate-fade-in">
          <div>
            <h4 className="text-base font-bold text-slate-100 mb-1">Confirm Extracted Activities</h4>
            <p className="text-xs text-slate-400">
              Review and adjust the parsed details. Tap the cross button to discard incorrect mappings.
            </p>
          </div>

          <div className="space-y-3">
            {chips.map((chip, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800/60 rounded-2xl text-xs hover:border-slate-800 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{categoryEmojis[chip.category]}</span>
                  <div>
                    <div className="font-semibold text-slate-200 capitalize">
                      {chip.subtype.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Quantity: {chip.quantity} {chip.unit}
                      {chip.estimated && <span className="text-amber-500 font-bold ml-1.5">(Estimated)</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="font-bold text-slate-300">
                    {chip.co2eKg} kg CO₂e
                  </span>
                  
                  <button 
                    onClick={() => handleRemoveChip(idx)}
                    className="p-1 rounded bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirmLog}
            disabled={logging}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2"
          >
            {logging ? (
              <>
                <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Saving to journal...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Save to Journal</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div 
          className={`p-4 border rounded-2xl text-sm leading-relaxed ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
