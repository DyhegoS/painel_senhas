const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const ticketController = require('../controllers/ticketController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../errors');

// Consultas liberadas para administrador e supervisor; alterações só para o administrador
const managers = requireRole('admin', 'supervisor');
const adminOnly = requireRole('admin');

router.use(requireAuth);

// Relatório por período (?start=ISO&end=ISO&timezone=America/Sao_Paulo)
router.get(
  '/reports',
  managers,
  asyncHandler(async (req, res) => {
    res.json(await adminController.getReport(req.query));
  })
);

// Tempos de atendimento por atendente (?start=ISO&end=ISO&attendantId=)
router.get(
  '/service-times',
  managers,
  asyncHandler(async (req, res) => {
    res.json(await adminController.getServiceTimes(req.query));
  })
);

// Zerar filas (todas ou de um serviço)
router.post(
  '/queues/reset',
  adminOnly,
  asyncHandler(async (req, res) => {
    const result = await adminController.resetQueues(req.body || {});
    const io = req.app.get('io');
    if (io) io.emit('queue_update', await ticketController.getQueue());
    console.log(`🧹 Filas zeradas por ${req.user.username}: ${result.cancelled} senhas canceladas`);
    res.json(result);
  })
);

// Senhas em atendimento agora, com quem está atendendo
router.get(
  '/in-service',
  managers,
  asyncHandler(async (req, res) => {
    res.json({ serverTime: new Date(), tickets: await adminController.getInService() });
  })
);

// Usuários e dispositivos conectados
router.get('/connections', managers, (req, res) => {
  res.json(adminController.getConnections(req.app.get('clients')));
});

// Status geral do sistema
router.get(
  '/status',
  managers,
  asyncHandler(async (req, res) => {
    res.json(
      await adminController.getStatus({
        clients: req.app.get('clients'),
        startedAt: req.app.get('startedAt'),
      })
    );
  })
);

module.exports = router;
