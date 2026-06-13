import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { datastore, CarbonEntry } from './db/firestore';
import { parseLogText, generateWeeklyInsights, generateSimulatedPlan } from './services/gemini';
import { computeCo2eKg } from './utils/co2';
import { REFERENCE } from './data/factors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// In-memory IP rate limiter for security
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function ipRateLimit(windowMs: number, maxRequests: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let rateData = rateLimitMap.get(ip);
    if (!rateData || now > rateData.resetTime) {
      rateData = { count: 0, resetTime: now + windowMs };
    }
    
    rateData.count++;
    rateLimitMap.set(ip, rateData);
    
    if (rateData.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// Middleware to extract userId from Cookie or custom Header
app.use((req, res, next) => {
  const rawCookies = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    rawCookies.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  
  const userId = cookies['userId'] || (req.headers['x-user-id'] as string);
  
  if (userId) {
    (req as any).userId = userId.trim();
  }
  next();
});

// Middleware requiring userId
const requireUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing user identification.' });
  }
  next();
};

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API: Save Profile
app.post('/api/profile', requireUser, async (req, res) => {
  const { baselineAnnualKg } = req.body;
  const userId = (req as any).userId;

  if (typeof baselineAnnualKg !== 'number' || baselineAnnualKg <= 0 || baselineAnnualKg > 100000) {
    return res.status(400).json({ error: 'Invalid baseline carbon footprint value.' });
  }

  try {
    const profile = await datastore.saveProfile(userId, baselineAnnualKg);
    res.json({ success: true, profile });
  } catch (err) {
    console.error('Error saving profile:', err);
    res.status(500).json({ error: 'Failed to save user profile.' });
  }
});

// API: Get Profile
app.get('/api/profile', requireUser, async (req, res) => {
  const userId = (req as any).userId;
  try {
    const profile = await datastore.getProfile(userId);
    res.json({ profile });
  } catch (err) {
    console.error('Error getting profile:', err);
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

// API: Parse Log text (Gemini call - Rate Limited)
app.post('/api/parse', requireUser, ipRateLimit(60000, 30), async (req, res) => {
  const { text } = req.body;
  if (typeof text !== 'string' || !text.trim() || text.length > 1000) {
    return res.status(400).json({ error: 'Invalid or excessively long description.' });
  }

  try {
    const parsedActivities = await parseLogText(text);
    
    // Enrich with computed CO2e values before returning to client for confirmation
    const enriched = parsedActivities.map(activity => {
      const co2eKg = computeCo2eKg(activity.category, activity.subtype, activity.quantity);
      return {
        ...activity,
        co2eKg
      };
    });

    res.json({ success: true, activities: enriched });
  } catch (err) {
    console.error('Error parsing text:', err);
    res.status(500).json({ error: 'Failed to process natural language logging.' });
  }
});

// API: Log confirmed entries
app.post('/api/log', requireUser, async (req, res) => {
  const { activities, rawText, date } = req.body;
  const userId = (req as any).userId;

  if (!Array.isArray(activities) || typeof rawText !== 'string' || rawText.length > 2000) {
    return res.status(400).json({ error: 'Invalid input log format.' });
  }

  // Fallback to today's date in YYYY-MM-DD
  const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) 
    ? date 
    : new Date().toISOString().split('T')[0];

  try {
    const loggedEntries: CarbonEntry[] = [];
    for (const activity of activities) {
      if (!['transport', 'food', 'energy', 'shopping'].includes(activity.category)) continue;
      
      const co2eKg = computeCo2eKg(activity.category, activity.subtype, activity.quantity);
      const entry = await datastore.saveEntry(userId, {
        date: targetDate,
        rawText: rawText.substring(0, 1000),
        category: activity.category,
        subtype: activity.subtype,
        quantity: activity.quantity,
        unit: activity.unit,
        co2eKg,
        estimated: !!activity.estimated
      });
      loggedEntries.push(entry);
    }
    res.json({ success: true, loggedEntries });
  } catch (err) {
    console.error('Error logging entries:', err);
    res.status(500).json({ error: 'Failed to record entries.' });
  }
});

// API: Delete logged entry
app.delete('/api/entries/:entryId', requireUser, async (req, res) => {
  const userId = (req as any).userId;
  const entryId = req.params.entryId;

  try {
    const success = await datastore.deleteEntry(userId, entryId);
    if (!success) {
      return res.status(404).json({ error: 'Entry not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting entry:', err);
    res.status(500).json({ error: 'Failed to delete entry.' });
  }
});

// API: Summary dashboard stats
app.get('/api/summary', requireUser, async (req, res) => {
  const userId = (req as any).userId;
  
  try {
    const [profile, entries] = await Promise.all([
      datastore.getProfile(userId),
      datastore.getEntries(userId)
    ]);

    const baselineAnnualKg = profile?.baselineAnnualKg || REFERENCE.indiaAnnualPerCapitaKg;
    const baselineWeeklyKg = Math.round((baselineAnnualKg / 52) * 10) / 10;

    // Filter last 7 days entries (inclusive) for weekly breakdown
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    const weeklyEntries = entries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= oneWeekAgo && entryDate <= now;
    });

    const categoryTotals = { transport: 0, food: 0, energy: 0, shopping: 0 };
    weeklyEntries.forEach(e => {
      if (categoryTotals[e.category] !== undefined) {
        categoryTotals[e.category] += e.co2eKg;
      }
    });

    // Round values
    categoryTotals.transport = Math.round(categoryTotals.transport * 10) / 10;
    categoryTotals.food = Math.round(categoryTotals.food * 10) / 10;
    categoryTotals.energy = Math.round(categoryTotals.energy * 10) / 10;
    categoryTotals.shopping = Math.round(categoryTotals.shopping * 10) / 10;

    const thisWeekTotalKg = Math.round((categoryTotals.transport + categoryTotals.food + categoryTotals.energy + categoryTotals.shopping) * 10) / 10;

    // Calculate 14-day history trend
    const dailyHistory: { date: string; co2eKg: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayTotal = entries
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.co2eKg, 0);

      dailyHistory.push({
        date: dateStr,
        co2eKg: Math.round(dayTotal * 100) / 100
      });
    }

    res.json({
      success: true,
      summary: {
        thisWeekTotalKg,
        baselineWeeklyKg,
        byCategory: categoryTotals,
        dailyHistory,
        comparison: {
          userWeekly: thisWeekTotalKg,
          indiaWeekly: Math.round((REFERENCE.indiaAnnualPerCapitaKg / 52) * 10) / 10,
          globalWeekly: Math.round((REFERENCE.globalAnnualPerCapitaKg / 52) * 10) / 10
        }
      }
    });
  } catch (err) {
    console.error('Error generating summary:', err);
    res.status(500).json({ error: 'Failed to compile dashboard summaries.' });
  }
});

// API: Weekly personalized insights (Gemini call - Rate Limited)
app.get('/api/insights', requireUser, ipRateLimit(60000, 30), async (req, res) => {
  const userId = (req as any).userId;

  try {
    const entries = await datastore.getEntries(userId);

    // Calculate category totals for last 7 days
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    const weeklyEntries = entries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= oneWeekAgo && entryDate <= now;
    });

    const categoryTotals = { transport: 0, food: 0, energy: 0, shopping: 0 };
    weeklyEntries.forEach(e => {
      if (categoryTotals[e.category] !== undefined) {
        categoryTotals[e.category] += e.co2eKg;
      }
    });

    const insights = await generateWeeklyInsights(categoryTotals);
    res.json({ success: true, insights });
  } catch (err) {
    console.error('Error compiling insights:', err);
    res.status(500).json({ error: 'Failed to build weekly actions.' });
  }
});

// API: Simulator narrative action plan
app.post('/api/simulate', requireUser, async (req, res) => {
  const { baseline, levers, saved } = req.body;

  if (typeof baseline !== 'number' || typeof saved !== 'number' || !levers) {
    return res.status(400).json({ error: 'Invalid simulator projection inputs.' });
  }

  try {
    const plan = await generateSimulatedPlan(baseline, levers, saved);
    res.json({ success: true, plan });
  } catch (err) {
    console.error('Error generating simulated plan:', err);
    res.status(500).json({ error: 'Failed to compile action plan.' });
  }
});

// Serve frontend static files from client/dist
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// Fallback all other routes to React SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
