import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './index';

describe('Express API Endpoints', () => {
  it('GET /api/health should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/profile without userId cookie/header should return 401', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/profile should save baseline footprint', async () => {
    const res = await request(app)
      .post('/api/profile')
      .set('x-user-id', 'test-user-123')
      .send({ baselineAnnualKg: 2500 });
      
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.baselineAnnualKg).toBe(2500);
  });

  it('GET /api/profile with x-user-id should return profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('x-user-id', 'test-user-123');
      
    expect(res.statusCode).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.baselineAnnualKg).toBe(2500);
  });

  it('POST /api/log should record computed activities and return logged entries', async () => {
    const res = await request(app)
      .post('/api/log')
      .set('x-user-id', 'test-user-123')
      .send({
        rawText: 'had chicken for lunch',
        activities: [
          {
            category: 'food',
            subtype: 'chicken_meal',
            quantity: 1,
            unit: 'meal',
            estimated: false
          }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.loggedEntries).toHaveLength(1);
    expect(res.body.loggedEntries[0].co2eKg).toBe(1.8); // 1 meal * 1.8 factor
  });

  it('GET /api/summary should return computed footprint stats', async () => {
    const res = await request(app)
      .get('/api/summary')
      .set('x-user-id', 'test-user-123');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.thisWeekTotalKg).toBe(1.8);
    expect(res.body.summary.byCategory.food).toBe(1.8);
    expect(res.body.summary.baselineWeeklyKg).toBeCloseTo(2500 / 52, 1);
  });
});
