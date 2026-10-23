const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

// Imports de rotas
const ticketRoutes = require('./routes/ticketRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { ensureAdmin } = require('./controllers/userController');
const { userFromToken } = require('./middleware/auth');
const Ticket = require('./models/Ticket');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' },
});
app.set('io', io);
app.set('startedAt', new Date());

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/painel_senhas')
  .then(() => {
    console.log('✓ MongoDB conectado');
    // Remove o índice único antigo do número da senha (a numeração agora pode reiniciar)
    return Promise.all([ensureAdmin(), Ticket.syncIndexes()]);
  })
  .catch((err) => console.error('✗ Erro ao conectar MongoDB:', err));

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

// WebSocket para atualizações em tempo real
// Conexões ativas: socket.id -> { type, user, ip, connectedAt }
const clients = new Map();
app.set('clients', clients);

io.on('connection', (socket) => {
  console.log('👤 Cliente conectado:', socket.id);
  clients.set(socket.id, {
    id: socket.id,
    type: 'unknown',
    user: null,
    ip: socket.handshake.address,
    connectedAt: new Date(),
  });

  // Identificar tipo de cliente (e o usuário, quando enviar o token de login)
  socket.on('identify', async (data = {}) => {
    const client = clients.get(socket.id);
    if (!client) return;
    client.type = data.type || 'unknown';
    if (data.token) {
      const user = await userFromToken(data.token);
      if (user) client.user = user.toPublic();
    }

    if (client.type === 'printer') {
      socket.join('printers');
      console.log('🖨️  Impressora conectada');
    } else {
      console.log(`✓ ${client.type} identificado${client.user ? `: ${client.user.username}` : ''}`);
    }
  });

  // Evento quando a fila é atualizada
  socket.on('queue_updated', (queue) => {
    io.emit('queue_update', queue);
  });

  // Evento quando atendimento é finalizado
  socket.on('ticket_finished', (ticket) => {
    io.emit('ticket_finished', ticket);
    console.log('✓ Atendimento finalizado:', ticket.number);
  });

  // Desconectar
  socket.on('disconnect', () => {
    console.log('👤 Cliente desconectado:', socket.id);
    clients.delete(socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔌 WebSocket disponível em ws://localhost:${PORT}`);
});

module.exports = { app, io };
