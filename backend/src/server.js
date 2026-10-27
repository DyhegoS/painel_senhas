require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const socketIO = require('socket.io');

const { createApp, corsOptions } = require('./app');
const { setupSockets } = require('./socket');
const { ensureAdmin } = require('./controllers/userController');
const { initServices } = require('./controllers/ticketController');
const { scheduleDailyReset } = require('./scheduler');
const Ticket = require('./models/Ticket');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/painel_senhas';
const PORT = process.env.PORT || 5000;

const app = createApp();
const server = http.createServer(app);
const io = socketIO(server, { cors: corsOptions() });
app.set('io', io);
setupSockets(io, app.get('clients'));

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB conectado');
    // syncIndexes remove o índice único antigo do número da senha (a numeração pode reiniciar)
    await Promise.all([ensureAdmin(), Ticket.syncIndexes(), initServices()]);
  } catch (error) {
    // Sem banco o sistema não funciona: encerra para o Docker/systemd reiniciar
    console.error('✗ Erro ao conectar MongoDB:', error);
    process.exit(1);
  }

  // Depois de initServices: o reinício usa o contador já migrado
  scheduleDailyReset(io);

  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`🔌 WebSocket disponível em ws://localhost:${PORT}`);
  });
}

function shutdown(signal) {
  console.log(`\n${signal} recebido, encerrando…`);
  // io.close também fecha o servidor HTTP
  io.close(() => mongoose.disconnect().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

module.exports = { app, io };
