const { userFromToken, tokenFromHeaders, safeEqual } = require('./middleware/auth');

const CLIENT_TYPES = ['attendant', 'acionador', 'panel', 'totem', 'customer', 'printer'];
const PRINT_AGENT_TOKEN = process.env.PRINT_AGENT_TOKEN || '';

if (!PRINT_AGENT_TOKEN) {
  console.warn('⚠️  PRINT_AGENT_TOKEN não definido — qualquer dispositivo pode se registrar como impressora');
}

// WebSocket para atualizações em tempo real. O servidor é a única fonte dos eventos
// de fila e chamada: os clientes apenas se identificam e escutam.
// Conexões ativas: socket.id -> { id, type, user, ip, connectedAt }
function setupSockets(io, clients) {
  io.on('connection', (socket) => {
    console.log('👤 Cliente conectado:', socket.id);
    clients.set(socket.id, {
      id: socket.id,
      type: 'unknown',
      user: null,
      ip: socket.handshake.address,
      connectedAt: new Date(),
    });

    // Identificar tipo de cliente (e o usuário, pelo cookie da sessão ou token enviado)
    socket.on('identify', async (data = {}) => {
      const client = clients.get(socket.id);
      if (!client) return;
      client.type = CLIENT_TYPES.includes(data.type) ? data.type : 'unknown';

      try {
        const token = data.token || tokenFromHeaders(socket.handshake.headers);
        if (token) {
          const user = await userFromToken(token);
          if (user) client.user = user.toPublic();
        }
      } catch (error) {
        console.error('Erro ao identificar cliente:', error.message);
      }

      if (client.type === 'printer') {
        if (PRINT_AGENT_TOKEN && !safeEqual(data.printerToken, PRINT_AGENT_TOKEN)) {
          console.warn(`✗ Impressora recusada (token inválido): ${client.ip}`);
          client.type = 'unknown';
          return;
        }
        socket.join('printers');
        console.log('🖨️  Impressora conectada');
      } else {
        console.log(`✓ ${client.type} identificado${client.user ? `: ${client.user.username}` : ''}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('👤 Cliente desconectado:', socket.id);
      clients.delete(socket.id);
    });
  });
}

module.exports = { setupSockets };
