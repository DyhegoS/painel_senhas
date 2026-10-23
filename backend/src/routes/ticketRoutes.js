const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Apenas atendentes, médicos e administradores podem chamar e encerrar senhas
const staffOnly = [requireAuth, requireRole('attendant', 'doctor', 'admin')];

const PRINT_TIMEOUT_MS = 8000;

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

// Anuncia a senha no painel e atualiza as filas
function announceCall(req, ticket) {
  const io = req.app.get('io');
  if (io) {
    io.emit('ticket_called', ticket);
    console.log('🔊 Senha chamada:', ticket.number);
  }
  broadcastQueue(io);
}

// Gerar nova senha
router.post('/generate', async (req, res) => {
  try {
    const { serviceTypeId } = req.body;
    const ticket = await ticketController.generateTicket(serviceTypeId);
    broadcastQueue(req.app.get('io'));
    const printStatus = await sendToPrinter(req.app.get('io'), ticket);
    res.status(201).json({ ...ticket, printStatus });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obter fila
router.get('/queue', async (req, res) => {
  try {
    const queue = await ticketController.getQueue();
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resumo das filas: pacientes aguardando e tempo de espera por serviço
router.get('/queue/summary', staffOnly, async (req, res) => {
  try {
    res.json(await ticketController.getQueueSummary());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Senha em atendimento pelo usuário logado
router.get('/current', staffOnly, async (req, res) => {
  try {
    res.json({ ticket: await ticketController.getCurrentTicket(req.user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chamar próxima senha (opcionalmente só de um serviço)
router.post('/call', staffOnly, async (req, res) => {
  try {
    const { serviceTypeId } = req.body || {};
    const ticket = await ticketController.callNextTicket(req.user, serviceTypeId);
    if (!ticket) {
      return res.status(200).json({ ticket: null, message: 'Nenhuma senha na fila' });
    }
    announceCall(req, ticket);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chamar uma senha específica pelo número
router.post('/call-number', staffOnly, async (req, res) => {
  try {
    const { serviceTypeId, number } = req.body || {};
    const ticket = await ticketController.callTicketByNumber(req.user, serviceTypeId, number);
    announceCall(req, ticket);
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rechamar a senha em atendimento
router.post('/:id/recall', staffOnly, async (req, res) => {
  try {
    const ticket = await ticketController.recallTicket(req.params.id, req.user);
    announceCall(req, ticket);
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Finalizar atendimento
router.post('/:id/finish', staffOnly, async (req, res) => {
  try {
    const ticket = await ticketController.finishTicket(req.params.id);
    broadcastQueue(req.app.get('io'));
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Paciente ausente
router.post('/:id/absent', staffOnly, async (req, res) => {
  try {
    const ticket = await ticketController.markAbsent(req.params.id);
    broadcastQueue(req.app.get('io'));
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancelar senha
router.post('/:id/cancel', staffOnly, async (req, res) => {
  try {
    const ticket = await ticketController.cancelTicket(req.params.id);
    broadcastQueue(req.app.get('io'));
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
