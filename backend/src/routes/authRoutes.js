const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { signToken, requireAuth } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await userController.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Login ou senha inválidos' });
    }
    res.json({ token: signToken(user), user: user.toPublic() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Usuário da sessão atual
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user.toPublic());
});

module.exports = router;
