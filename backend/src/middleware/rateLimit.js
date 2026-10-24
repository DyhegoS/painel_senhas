// Contador em memória por chave numa janela fixa de tempo (suficiente para um único servidor)
function createLimiter({ windowMs, max }) {
  const hits = new Map();

  const current = (key) => {
    const entry = hits.get(key);
    if (entry && Date.now() - entry.startedAt <= windowMs) return entry;
    hits.delete(key);
    return null;
  };

  // Limpa periodicamente as chaves vencidas para o mapa não crescer sem limite
  setInterval(() => {
    hits.forEach((entry, key) => {
      if (Date.now() - entry.startedAt > windowMs) hits.delete(key);
    });
  }, windowMs).unref();

  return {
    hit(key) {
      const entry = current(key);
      if (entry) entry.count += 1;
      else hits.set(key, { count: 1, startedAt: Date.now() });
    },
    blocked(key) {
      const entry = current(key);
      return Boolean(entry && entry.count >= max);
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

// Middleware que recusa com 429 quem passar de `max` requisições na janela
function rateLimit({ windowMs, max, message, key = (req) => req.ip }) {
  const limiter = createLimiter({ windowMs, max });
  return (req, res, next) => {
    const id = key(req);
    if (limiter.blocked(id)) {
      return res.status(429).json({ error: message });
    }
    limiter.hit(id);
    next();
  };
}

module.exports = { createLimiter, rateLimit };
