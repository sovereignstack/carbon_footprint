import { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import LogTab from './components/LogTab';
import ReduceTab from './components/ReduceTab';

// Cookie Helpers
function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function setCookie(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
}

export default function App() {
  const [userId, setUserId] = useState<string>('');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [baselineAnnualKg, setBaselineAnnualKg] = useState(1900); // fallback default
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'reduce'>('dashboard');
  
  // Dashboard Summary Data State
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Initialize UserId cookie and fetch profile
  useEffect(() => {
    let currentUserId = getCookie('userId');
    if (!currentUserId) {
      // Generate simple robust UUID
      currentUserId = (typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function')
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setCookie('userId', currentUserId, 365);
    }
    setUserId(currentUserId);

    // Fetch user profile from Express backend
    fetch('/api/profile', {
      headers: {
        'x-user-id': currentUserId // fallback header if cookies blocked
      }
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('No profile found');
      })
      .then(data => {
        if (data.profile && data.profile.baselineAnnualKg) {
          setBaselineAnnualKg(data.profile.baselineAnnualKg);
          setOnboardingComplete(true);
        }
      })
      .catch(() => {
        console.log('Profile fetch status: new user onboarding required.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Fetch Summary dashboard statistics
  const fetchSummaryData = () => {
    if (!userId) return;
    
    fetch('/api/summary', {
      headers: {
        'x-user-id': userId
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSummary(data.summary);
        }
      })
      .catch(err => {
        console.error('Error fetching dashboard summary:', err);
      });
  };

  useEffect(() => {
    if (onboardingComplete && userId) {
      fetchSummaryData();
    }
  }, [onboardingComplete, userId]);

  const handleOnboardingComplete = (baseline: number) => {
    setBaselineAnnualKg(baseline);
    setOnboardingComplete(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <svg className="animate-spin h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Loading Carbon Coach...
        </span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Background glow meshes */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Header */}
      <header className="border-b border-slate-900 sticky top-0 z-50 backdrop-blur-md bg-slate-950/80">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.5 10.5C2.5 5.8 5.8 2.5 10.5 2.5s8 3.3 8 8c0 3-1.5 5.5-3.8 6.9l.8 3.1c.1.4-.2.8-.6.8H9.1c-.4 0-.7-.4-.6-.8l.8-3.1C6.9 16 5.5 13.5 5.5 10.5h-3zm16 3c1.6-.9 2.5-2.6 2.5-4.5 0-3.9-2.7-7-6.5-7.5.3.6.5 1.3.5 2 0 4.1-3.4 7.5-7.5 7.5-.3 0-.6 0-.9-.1.8 1.9 2.4 3.3 4.4 3.9l.8 3.1h5.8l.8-3.1c-.8-.3-1.6-.7-2.3-1.3l2.4-.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white font-serif">Carbon Coach</h1>
          </div>

          {onboardingComplete && (
            <nav className="flex space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold" aria-label="Main Tabs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('log')}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === 'log'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Track Log
              </button>
              <button
                onClick={() => setActiveTab('reduce')}
                className={`px-4 py-2 rounded-lg transition ${
                  activeTab === 'reduce'
                    ? 'bg-slate-800 text-emerald-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                What-If Simulator
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 py-10 relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
        {!onboardingComplete ? (
          <Onboarding onComplete={handleOnboardingComplete} />
        ) : (
          <>
            {activeTab === 'dashboard' && summary && <Dashboard summary={summary} />}
            {activeTab === 'log' && <LogTab onLogSuccess={fetchSummaryData} />}
            {activeTab === 'reduce' && <ReduceTab baselineAnnualKg={baselineAnnualKg} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-6 text-center text-[10px] text-slate-600 font-semibold tracking-wider uppercase bg-slate-950/20">
        © {new Date().getFullYear()} Carbon Coach. Engineered in Google Antigravity.
      </footer>
    </div>
  );
}
