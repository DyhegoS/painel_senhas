const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../errors');

// Obter todos os serviços (público: usado pelo totem)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await serviceController.getAllServices());
  })
);

// Criar, alterar e desativar serviços é exclusivo do administrador
router.use(requireAuth, requireRole('admin'));

// Criar novo serviço
router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await serviceController.createService(req.body));
  })
);

// Atualizar serviço
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await serviceController.updateService(req.params.id, req.body));
  })
);

// Desativar serviço
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await serviceController.deleteService(req.params.id);
    res.json({ message: 'Serviço desativado com sucesso' });
  })
);

module.exports = router;
