const request = require('supertest');

// Este test asume que el backend está corriendo en localhost:5020
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5020';

describe('Contrato API /api/habilidades', () => {
  test('GET /api/habilidades devuelve array de objetos con _id y nombre', async () => {
    const res = await request(BASE).get('/api/habilidades').set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const item = res.body[0];
      expect(item).toHaveProperty('_id');
      expect(item).toHaveProperty('nombre');
    }
  }, 10000);
});
