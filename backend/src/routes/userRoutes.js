const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, badRequest } = require('../errors');

// Equipe cadastrada: disponível para qualquer usuário logado
router.get(
  '/directory',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await userController.getDirectory());
  })
);

// As demais rotas de usuários são exclusivas do administrador
router.use(requireAuth, requireRole('admin'));

// Obter todos os usuários
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await userController.getAllUsers());
  })
);

// Criar novo usuário
router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await userController.createUser(req.body || {}));
  })
);

// Atualizar usuário
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await userController.updateUser(req.params.id, req.body || {}));
  })
);

// Deletar usuário
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (String(req.user._id) === req.params.id) {
      throw badRequest('Você não pode remover o próprio usuário');
    }
    await userController.deleteUser(req.params.id);
    res.json({ message: 'Usuário removido com sucesso' });
  })
);

module.exports = router;
