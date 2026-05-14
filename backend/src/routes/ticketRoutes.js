const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// Gerar nova senha
router.post('/generate', async (req, res) => {
  try {
    const { serviceTypeId } = req.body;
    const ticket = await ticketController.generateTicket(serviceTypeId);
    res.status(201).json(ticket);
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
