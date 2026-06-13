import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to declare mock functions before the mock is hoisted
const { mockGenerateContent } = vi.hoisted(() => {
  return {
    mockGenerateContent: vi.fn()
  };
});

// Mock the @google/genai module
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    })
  };
});

import { parseLogText, generateWeeklyInsights, generateSimulatedPlan } from './gemini';

describe('Gemini AI Services Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parseLogText should parse and filter valid activities', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([
        {
          category: 'transport',
          subtype: 'car_petrol_km',
          quantity: 15,
          unit: 'km',
          estimated: false
        },
        {
          category: 'food',
          subtype: 'invalid_subtype_check', // should be filtered out
          quantity: 2,
          unit: 'meal',
          estimated: true
        }
      ])
    });

    const results = await parseLogText('travelled 15km in a petrol car');
    expect(results).toHaveLength(1);
    expect(results[0].subtype).toBe('car_petrol_km');
    expect(results[0].quantity).toBe(15);
  });

  it('generateWeeklyInsights should parse coach actions correctly', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([
        {
          action: 'Use bus instead of car',
          category: 'transport',
          estimatedWeeklySavingKg: 10,
          rationale: 'You commuted a lot by car.'
        }
      ])
    });

    const insights = await generateWeeklyInsights({ transport: 45, food: 12 });
    expect(insights).toHaveLength(1);
    expect(insights[0].category).toBe('transport');
    expect(insights[0].estimatedWeeklySavingKg).toBe(10);
  });

  it('generateSimulatedPlan should return narrated text', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Encouraging plan text.'
    });

    const plan = await generateSimulatedPlan(2000, {}, 200);
    expect(plan).toBe('Encouraging plan text.');
  });
});
