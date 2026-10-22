const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Equipe cadastrada: disponível para qualquer usuário logado
router.get('/directory', requireAuth, async (req, res) => {
  try {
    const users = await userController.getDirectory();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// As demais rotas de usuários são exclusivas do administrador
router.use(requireAuth, requireRole('admin'));

// Obter todos os usuários
router.get('/', async (req, res) => {
  try {
    const users = await userController.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo usuário
router.post('/', async (req, res) => {
  try {
    const user = await userController.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    const user = await userController.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Deletar usuário
router.delete('/:id', async (req, res) => {
  try {
    if (String(req.user._id) === req.params.id) {
      return res.status(400).json({ error: 'Você não pode remover o próprio usuário' });
    }
    await userController.deleteUser(req.params.id);
    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
