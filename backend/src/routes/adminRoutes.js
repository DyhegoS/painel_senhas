const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const ticketController = require('../controllers/ticketController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Rotas exclusivas do administrador
router.use(requireAuth, requireRole('admin'));

// Relatório por período (?start=ISO&end=ISO&timezone=America/Sao_Paulo)
router.get('/reports', async (req, res) => {
  try {
    res.json(await adminController.getReport(req.query));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Zerar filas (todas ou de um serviço)
router.post('/queues/reset', async (req, res) => {
  try {
    const result = await adminController.resetQueues(req.body || {});
    const io = req.app.get('io');
    if (io) io.emit('queue_update', await ticketController.getQueue());
    console.log(`🧹 Filas zeradas por ${req.user.username}: ${result.cancelled} senhas canceladas`);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Usuários e dispositivos conectados
router.get('/connections', (req, res) => {
  res.json(adminController.getConnections(req.app.get('clients')));
});

// Status geral do sistema
router.get('/status', async (req, res) => {
  try {
    res.json(
      await adminController.getStatus({
        clients: req.app.get('clients'),
        startedAt: req.app.get('startedAt'),
      })
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
