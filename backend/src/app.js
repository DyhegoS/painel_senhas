const express = require('express');
const cors = require('cors');

const ticketRoutes = require('./routes/ticketRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler } = require('./errors');

// Origens liberadas no CORS (separadas por vírgula). Sem configuração, aceita a origem
// que pedir — o cookie da sessão (SameSite=Lax) não é enviado por sites de fora mesmo assim
function corsOrigin() {
  const origins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : true;
}

// Com cookie de sessão, o CORS precisa permitir credenciais
const corsOptions = () => ({ origin: corsOrigin(), credentials: true });

// Aplicação Express sem servidor HTTP nem banco, para poder ser usada nos testes
function createApp() {
  const app = express();
  app.set('startedAt', new Date());
  app.set('clients', new Map());

  // Atrás de proxy reverso (nginx etc.): TRUST_PROXY=1 para req.ip ser o IP real do cliente
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
  }

  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '100kb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
  });

  // Rotas da API
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, corsOptions };
