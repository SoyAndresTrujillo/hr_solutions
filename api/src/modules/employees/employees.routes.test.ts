import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { employeeSchema } from './employees.schema.js';

const app = createApp();

describe('HTTP routes', () => {
  it('GET /api/employees returns 50 employees as JSON', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveLength(50);
    expect(employeeSchema.array().safeParse(res.body).success).toBe(true);
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('unknown /api paths return the JSON 404 shape', async () => {
    for (const url of ['/api/nope', '/api']) {
      const res = await request(app).get(url);
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: { message: 'Not Found' } });
    }
  });
});
