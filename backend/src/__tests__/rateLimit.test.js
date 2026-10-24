const express = require('express');
const request = require('supertest');
const { createLimiter, rateLimit } = require('../middleware/rateLimit');

describe('createLimiter', () => {
  it('bloqueia ao atingir o máximo e libera depois do reset', () => {
    const limiter = createLimiter({ windowMs: 60000, max: 2 });
    limiter.hit('a');
    expect(limiter.blocked('a')).toBe(false);
    limiter.hit('a');
    expect(limiter.blocked('a')).toBe(true);
    expect(limiter.blocked('b')).toBe(false);
    limiter.reset('a');
    expect(limiter.blocked('a')).toBe(false);
  });

  it('libera quando a janela de tempo passa', () => {
    jest.useFakeTimers();
    const limiter = createLimiter({ windowMs: 1000, max: 1 });
    limiter.hit('a');
    expect(limiter.blocked('a')).toBe(true);
    jest.advanceTimersByTime(1001);
    expect(limiter.blocked('a')).toBe(false);
    jest.useRealTimers();
  });
});

describe('rateLimit', () => {
  it('responde 429 depois de max requisições', async () => {
    const app = express();
    app.get('/', rateLimit({ windowMs: 60000, max: 3, message: 'calma' }), (req, res) =>
      res.send('ok')
    );
    for (let i = 0; i < 3; i += 1) {
      expect((await request(app).get('/')).status).toBe(200);
    }
    const blocked = await request(app).get('/');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('calma');
  });
});
