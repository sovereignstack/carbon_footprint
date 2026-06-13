import { GoogleGenAI } from '@google/genai';
import { FACTORS } from '../data/factors';

// Initialize SDK: if GEMINI_API_KEY env is set, use it. Otherwise, use Vertex AI mode with ADC.
let ai: GoogleGenAI;
const project = process.env.GCP_PROJECT_ID || 'promptwars-499219';

if (process.env.GEMINI_API_KEY) {
  console.log('Gemini: Initializing Developer API client with API Key.');
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
  console.log(`Gemini: Initializing Vertex AI client for project ${project} in us-central1.`);
  ai = new GoogleGenAI({
    vertexai: true,
    project: project,
    location: 'us-central1'
  });
}

// Get the model name (prefer gemini-2.5-flash)
const MODEL_NAME = 'gemini-2.5-flash';

export interface ParsedActivity {
  category: 'transport' | 'food' | 'energy' | 'shopping';
  subtype: string;
  quantity: number;
  unit: string;
  estimated: boolean;
}

export interface WeeklyAction {
  action: string;
  category: 'transport' | 'food' | 'energy' | 'shopping';
  estimatedWeeklySavingKg: number;
  rationale: string;
}

/**
 * 1. Parses natural language text into structured activities
 */
export async function parseLogText(text: string): Promise<ParsedActivity[]> {
  // Construct the list of allowed subtypes and units dynamically from FACTORS
  const allowedItems = Object.entries(FACTORS).map(([category, subtypes]) => {
    const lines = Object.entries(subtypes).map(([subtype, detail]) => {
      return `  - "${subtype}" (unit: "${(detail as any).unit}")`;
    }).join('\n');
    return `Category "${category}":\n${lines}`;
  }).join('\n\n');

  const prompt = `You are an activity-extraction engine for a carbon-footprint app used in India.
From the user's free-text description, extract each distinct carbon-relevant activity.
Return ONLY a JSON array. Each element:
{
  "category": "transport" | "food" | "energy" | "shopping",
  "subtype": string,
  "quantity": number,
  "unit": string,
  "estimated": boolean
}

Allowed subtypes and units grouped by category:
${allowedItems}

Rules:
1. If a quantity isn't stated, estimate a sensible default for an Indian context and set estimated=true.
2. Map synonyms (e.g. "local train" or "metro" -> local_train_km, "biryani with chicken" -> chicken_meal, "scooty" or "bike" -> two_wheeler_km, "electricity" -> grid_electricity_kwh, "gas cylinder" -> lpg_cylinder, "buying a shirt" -> clothing_item).
3. If nothing carbon-relevant is mentioned, return an empty array [].
4. Return ONLY a valid JSON array. Do not wrap in markdown code blocks like \`\`\`json. Do not include comments.

User input: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text?.trim() || '[]';
    // Clean code block ticks if LLM ignores the instruction
    const cleanText = resultText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    
    const parsed = JSON.parse(cleanText) as ParsedActivity[];
    if (!Array.isArray(parsed)) return [];

    // Filter and sanitize the results to ensure they match our schema
    return parsed.filter(item => {
      const cat = item.category;
      const sub = item.subtype;
      return (
        FACTORS[cat] &&
        (FACTORS[cat] as any)[sub] &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
      );
    });
  } catch (err) {
    console.error('Gemini parsing error:', err);
    // Return empty list on failure so the server can handle it gracefully
    return [];
  }
}

/**
 * 2. Generates personalized weekly insights
 */
export async function generateWeeklyInsights(categoryEmissions: Record<string, number>): Promise<WeeklyAction[]> {
  const prompt = `You are a sustainability coach for an Indian user.
Given this weekly carbon footprint breakdown (in kg CO2e):
${JSON.stringify(categoryEmissions, null, 2)}

Produce 2 to 3 SPECIFIC, achievable emission reduction actions that target the user's LARGEST contributors.
Return ONLY a JSON array:
[{
  "action": string, // Concrete India-relevant step, e.g., "Swap 2 chicken meals for dal this week"
  "category": "transport" | "food" | "energy" | "shopping",
  "estimatedWeeklySavingKg": number, // Estimated reduction in kg CO2e
  "rationale": string // Single sentence explanation
}]

Be extremely specific in your actions (e.g., recommend specific local public transport, specific Indian food swaps, or specific cooling adjustments).
Do not wrap in markdown or include preambles.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text?.trim() || '[]';
    const cleanText = resultText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    
    const parsed = JSON.parse(cleanText) as WeeklyAction[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(item => {
      return (
        ['transport', 'food', 'energy', 'shopping'].includes(item.category) &&
        typeof item.estimatedWeeklySavingKg === 'number' &&
        item.action &&
        item.rationale
      );
    });
  } catch (err) {
    console.error('Gemini insights error:', err);
    return [];
  }
}

/**
 * 3. Narrates a simulated roadmap plan
 */
export async function generateSimulatedPlan(baseline: number, levers: any, saved: number): Promise<string> {
  const prompt = `The user's current baseline carbon footprint is ${baseline} kg CO2e/year.
With these proposed lifestyle changes:
${JSON.stringify(levers, null, 2)}

Their projected total footprint is ${baseline - saved} kg/year, saving ${saved} kg/year.
Write a short (maximum 120 words) encouraging, personalized action plan explaining how to implement these changes in an everyday Indian context.
Write in plain text, second person ("you"), and keep it practical and specific. Do not use formatting like headings, markdown bold, or bullet points.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });

    return response.text?.trim() || 'Keep up the great work in reducing your carbon footprint!';
  } catch (err) {
    console.error('Gemini simulator plan error:', err);
    return `Nice job! By shifting to public transit, swapping meals, and optimizing your AC usage, you can save ${saved} kg of CO2e annually. Start today by taking local transit or choosing veg meals twice a week.`;
  }
}
