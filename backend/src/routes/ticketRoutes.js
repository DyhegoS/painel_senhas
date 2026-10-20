const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

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

// Gerar nova senha
router.post('/generate', async (req, res) => {
  try {
    const { serviceTypeId } = req.body;
    const ticket = await ticketController.generateTicket(serviceTypeId);
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

// Chamar próxima senha
router.post('/call', async (req, res) => {
  try {
    const { attendantId } = req.body;
    const ticket = await ticketController.callNextTicket(attendantId);
    if (!ticket) {
      return res.status(200).json({ ticket: null, message: 'Nenhuma senha na fila' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalizar atendimento
router.post('/:id/finish', async (req, res) => {
  try {
    const ticket = await ticketController.finishTicket(req.params.id);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancelar senha
router.post('/:id/cancel', async (req, res) => {
  try {
    const ticket = await ticketController.cancelTicket(req.params.id);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
