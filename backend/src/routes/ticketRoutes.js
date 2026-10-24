const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAuth, requireRole, requireTotem } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { asyncHandler } = require('../errors');

// Apenas atendentes, médicos e administradores podem chamar e encerrar senhas
const staffOnly = [requireAuth, requireRole('attendant', 'doctor', 'admin')];
// O supervisor acompanha as filas, mas não chama nem encerra senhas
const canViewQueues = [requireAuth, requireRole('attendant', 'doctor', 'admin', 'supervisor')];

const PRINT_TIMEOUT_MS = 8000;

// Limite de senhas geradas por minuto por endereço (um totem não gera dezenas por minuto)
const generateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.GENERATE_RATE_LIMIT) || 30,
  message: 'Muitas senhas geradas em pouco tempo. Aguarde um instante.',
});

// Envia a senha para os agentes de impressão (Raspberry Pi) e aguarda a confirmação
async function sendToPrinter(io, ticket) {
  if (!io) return 'no_printer';
  try {
    const responses = await io
      .to('printers')
      .timeout(PRINT_TIMEOUT_MS)
      .emitWithAck('print_ticket', ticket);
    if (responses.length === 0) return 'no_printer';
    return responses.some((r) => r && r.ok) ? 'printed' : 'error';
  } catch (error) {
    console.error('Erro ao imprimir senha:', error.message);
    return 'error';
  }
}

// Avisa painéis e atendentes que a fila mudou
async function broadcastQueue(io) {
  if (!io) return;
  try {
    io.emit('queue_update', await ticketController.getQueue());
  } catch (error) {
    console.error('Erro ao enviar atualização da fila:', error.message);
  }
}

// Avisa a tela da senha (totem/celular) que o status mudou e atualiza as filas
function notifyStatus(req, ticket) {
  const io = req.app.get('io');
  if (io) io.emit('ticket_status_update', { ticketId: String(ticket._id), status: ticket.status });
  broadcastQueue(io);
}

// Anuncia a senha no painel e atualiza as filas
function announceCall(req, ticket) {
  const io = req.app.get('io');
  if (io) {
    io.emit('ticket_called', ticket);
    console.log('🔊 Senha chamada:', ticket.number);
  }
  notifyStatus(req, ticket);
}

// Gerar nova senha
router.post(
  '/generate',
  requireTotem,
  generateLimit,
  asyncHandler(async (req, res) => {
    const { serviceTypeId } = req.body || {};
    const ticket = await ticketController.generateTicket(serviceTypeId);
    broadcastQueue(req.app.get('io'));
    const printStatus = await sendToPrinter(req.app.get('io'), ticket);
    res.status(201).json({ ...ticket, printStatus });
  })
);

// Obter fila
router.get(
  '/queue',
  asyncHandler(async (req, res) => {
    res.json(await ticketController.getQueue());
  })
);

// Últimas chamadas do dia (público: usado pelo painel da TV ao abrir ou reconectar)
router.get(
  '/recent-calls',
  asyncHandler(async (req, res) => {
    res.json(await ticketController.getRecentCalls(req.query.limit));
  })
);

// Resumo das filas: pacientes aguardando e tempo de espera por serviço
router.get(
  '/queue/summary',
  canViewQueues,
  asyncHandler(async (req, res) => {
    res.json(await ticketController.getQueueSummary());
  })
);

// Senha em atendimento pelo usuário logado
router.get(
  '/current',
  staffOnly,
  asyncHandler(async (req, res) => {
    res.json({ ticket: await ticketController.getCurrentTicket(req.user) });
  })
);

// Chamar próxima senha (opcionalmente só de um serviço)
router.post(
  '/call',
  staffOnly,
  asyncHandler(async (req, res) => {
    const { serviceTypeId } = req.body || {};
    const ticket = await ticketController.callNextTicket(req.user, serviceTypeId);
    if (!ticket) {
      return res.status(200).json({ ticket: null, message: 'Nenhuma senha na fila' });
    }
    announceCall(req, ticket);
    res.json(ticket);
  })
);

// Chamar uma senha específica pelo número
router.post(
  '/call-number',
  staffOnly,
  asyncHandler(async (req, res) => {
    const { serviceTypeId, number } = req.body || {};
    const ticket = await ticketController.callTicketByNumber(req.user, serviceTypeId, number);
    announceCall(req, ticket);
    res.json(ticket);
  })
);

// Rechamar a senha em atendimento
router.post(
  '/:id/recall',
  staffOnly,
  asyncHandler(async (req, res) => {
    const ticket = await ticketController.recallTicket(req.params.id, req.user);
    announceCall(req, ticket);
    res.json(ticket);
  })
);

// Finalizar atendimento, paciente ausente ou cancelar senha
const CLOSE_ACTIONS = {
  finish: ticketController.finishTicket,
  absent: ticketController.markAbsent,
  cancel: ticketController.cancelTicket,
};

Object.entries(CLOSE_ACTIONS).forEach(([action, close]) => {
  router.post(
    `/:id/${action}`,
    staffOnly,
    asyncHandler(async (req, res) => {
      const ticket = await close(req.params.id, req.user);
      notifyStatus(req, ticket);
      res.json(ticket);
    })
  );
});

module.exports = router;
