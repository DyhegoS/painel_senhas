const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

// Imports de rotas
const ticketRoutes = require('./routes/ticketRoutes');
const serviceRoutes = require('./routes/serviceRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' },
});

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/painel_senhas')
  .then(() => console.log('✓ MongoDB conectado'))
  .catch((err) => console.error('✗ Erro ao conectar MongoDB:', err));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Rotas da API
app.use('/api/tickets', ticketRoutes);
app.use('/api/services', serviceRoutes);

// WebSocket para atualizações em tempo real
const connectedClients = {
  attendants: [],
  panels: [],
  customers: [],
};

io.on('connection', (socket) => {
  console.log('👤 Cliente conectado:', socket.id);

  // Identificar tipo de cliente
  socket.on('identify', (data) => {
    const { type } = data;
    if (type === 'attendant') {
      connectedClients.attendants.push(socket.id);
      console.log(`✓ Atendente conectado. Total: ${connectedClients.attendants.length}`);
    } else if (type === 'panel') {
      connectedClients.panels.push(socket.id);
      console.log(`✓ Painel conectado. Total: ${connectedClients.panels.length}`);
    } else if (type === 'customer') {
      connectedClients.customers.push(socket.id);
      console.log(`✓ Cliente conectado. Total: ${connectedClients.customers.length}`);
    }
  });

  // Evento quando uma senha é chamada
  socket.on('ticket_called', (ticket) => {
    io.emit('ticket_called', ticket);
    console.log('🔊 Senha chamada:', ticket.number);
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
    connectedClients.attendants = connectedClients.attendants.filter((id) => id !== socket.id);
    connectedClients.panels = connectedClients.panels.filter((id) => id !== socket.id);
    connectedClients.customers = connectedClients.customers.filter((id) => id !== socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔌 WebSocket disponível em ws://localhost:${PORT}`);
});

module.exports = { app, io };
